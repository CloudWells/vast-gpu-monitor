import os
import json
import asyncio
import secrets
import requests
import subprocess
import logging
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("GPU-MONITOR")

# --- MODELS ---
class MonitorRule(BaseModel):
    id: str
    gpu_name: str = "B200"
    num_gpus: int = 1
    max_price: float = 8.0
    country: str = ""
    min_duration: float = 0.0  # in hours

class Config(BaseModel):
    vast_api_key: str = ""
    tg_bot_token: str = ""
    tg_chat_id: str = ""
    check_interval: int = 60
    is_running: bool = False
    rules: List[MonitorRule] = []

class LoginRequest(BaseModel):
    username: str
    password: str

# --- CONFIG STORAGE ---
CONFIG_FILE = "data/config.json"
def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return Config(**json.load(f))
        except Exception as e:
            logger.error(f"Config load error: {e}")
    return Config()

def save_config(config: Config):
    os.makedirs("data", exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        f.write(config.json())

current_config = load_config()
last_results = {}
known_ids = set()
APP_PASSWORD = os.getenv("APP_PASSWORD")
if not APP_PASSWORD:
    logger.error("APP_PASSWORD environment variable is not set!")
SESSION_TOKEN = secrets.token_hex(16)

# --- TELEGRAM BOT ---
tg_app = None

async def start_bot():
    global tg_app
    if not current_config.tg_bot_token:
        logger.warning("Telegram token missing, bot not started")
        return
    try:
        tg_app = ApplicationBuilder().token(current_config.tg_bot_token).build()
        tg_app.add_handler(CommandHandler("start", tg_start))
        tg_app.add_handler(CommandHandler("status", tg_status))
        tg_app.add_handler(CommandHandler("rules", tg_rules))
        tg_app.add_handler(CallbackQueryHandler(tg_button_handler))
        await tg_app.initialize()
        await tg_app.start()
        await tg_app.updater.start_polling()
        logger.info("TELEGRAM BOT STARTED")
    except Exception as e:
        logger.error(f"Telegram Bot start failed: {e}")

async def _update_chat_id(chat_id: int):
    global current_config
    if current_config.tg_chat_id != str(chat_id):
        current_config.tg_chat_id = str(chat_id)
        save_config(current_config)

async def tg_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await _update_chat_id(chat_id)
    msg = f"🖥 <b>GPU Monitor</b>\nYour ID: <code>{chat_id}</code>\n/status - Check monitoring status\n/rules - View monitoring rules"
    await update.message.reply_text(msg, parse_mode='HTML')

async def tg_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await _update_chat_id(chat_id)
    status = "🟢 ACTIVE" if current_config.is_running else "🔴 PAUSED"
    msg = f"<b>Status:</b> {status}\n<b>Interval:</b> {current_config.check_interval}s\n<b>Rules:</b> {len(current_config.rules)}\nUse /rules to view what we are looking for."
    await update.message.reply_text(msg, parse_mode='HTML')

async def tg_rules(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await _update_chat_id(chat_id)
    if not current_config.rules:
        await update.message.reply_text("No rules configured.", parse_mode='HTML')
        return
    
    msg = "<b>Current Rules:</b>\n\n"
    for r in current_config.rules:
        msg += f"🔹 <b>{r.gpu_name}</b> x{r.num_gpus}\n"
        msg += f"Max Price: ${r.max_price}/hr\n"
        if r.country:
            msg += f"Country: {r.country}\n"
        if r.min_duration > 0:
            msg += f"Min Duration: {r.min_duration} hrs\n"
        msg += "\n"
    
    await update.message.reply_text(msg, parse_mode='HTML')

async def tg_button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.data.startswith('del_'):
        rid = query.data.split('_')[1]
        current_config.rules = [r for r in current_config.rules if r.id != rid]
        save_config(current_config)
        await query.edit_message_text("Rule deleted. Use /status to refresh.")

# --- SCANNER LOOP ---
async def monitoring_loop():
    global last_results, known_ids
    logger.info("MONITORING LOOP STARTED")
    while True:
        try:
            if current_config.is_running and current_config.rules:
                # Sync API Key
                if current_config.vast_api_key:
                    os.makedirs("/root/.config/vastai/", exist_ok=True)
                    with open("/root/.config/vastai/vast_api_key", "w") as f:
                        f.write(current_config.vast_api_key)

                for rule in current_config.rules:
                    # Construct search query
                    parts = [
                        f"gpu_name == {rule.gpu_name}",
                        f"num_gpus == {rule.num_gpus}",
                        f"dph <= {rule.max_price}"
                    ]
                    if rule.country:
                        parts.append(f"geolocation ~= {rule.country}")
                    if rule.min_duration > 0:
                        # Vast.ai uses seconds for duration
                        parts.append(f"duration >= {int(rule.min_duration * 3600)}")
                    
                    query = " ".join(parts)
                    logger.info(f"Scanning: {query}")
                    
                    proc = await asyncio.create_subprocess_shell(
                        f"vastai search offers '{query}' --raw",
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await proc.communicate()
                    
                    if proc.returncode == 0:
                        offers = json.loads(stdout.decode())
                        last_results[rule.id] = offers
                        for offer in offers:
                            oid = str(offer['id'])
                            if oid not in known_ids:
                                known_ids.add(oid)
                                text = (f"🚀 <b>GPU MATCH!</b>\n"
                                        f"Rule: {rule.gpu_name} x{rule.num_gpus}\n"
                                        f"Price: ${offer['dph_total']:.3f}/hr\n"
                                        f"Country: {offer.get('geolocation', 'N/A')}\n"
                                        f"ID: {oid}\n"
                                        f"Link: https://vast.ai/console/create/")
                                if tg_app and current_config.tg_chat_id:
                                    await tg_app.bot.send_message(chat_id=current_config.tg_chat_id, text=text, parse_mode='HTML')
                                    logger.info(f"Notification sent for ID {oid}")
                    else:
                        logger.error(f"VastAI Error: {stderr.decode()}")
            else:
                logger.debug("Scanner idle...")
        except Exception as e:
            logger.error(f"Loop error: {e}")
        
        await asyncio.sleep(current_config.check_interval)

# --- FASTAPI LIFESPAN & APP ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SERVER LIFESPAN INITIATED")
    asyncio.create_task(start_bot())
    asyncio.create_task(monitoring_loop())
    yield
    if tg_app:
        await tg_app.updater.stop()
        await tg_app.stop()
    logger.info("SERVER LIFESPAN TERMINATED")

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTES ---
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Token")
    token = authorization.split(" ")[1]
    if token != SESSION_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid Token")
    return True

@app.post("/login")
def login(req: LoginRequest):
    if req.username == "admin" and req.password == APP_PASSWORD:
        return {"token": SESSION_TOKEN}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/config", dependencies=[Depends(verify_token)])
def get_config(): return current_config

@app.post("/config", dependencies=[Depends(verify_token)])
async def update_config(config: Config):
    global current_config, tg_app
    old_token = current_config.tg_bot_token
    current_config = config
    save_config(current_config)
    if current_config.tg_bot_token != old_token:
        if tg_app:
            try: await tg_app.stop(); await tg_app.shutdown()
            except: pass
        asyncio.create_task(start_bot())
    return current_config

@app.get("/results", dependencies=[Depends(verify_token)])
def get_results(): return last_results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)