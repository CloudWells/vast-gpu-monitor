FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
RUN wget https://raw.githubusercontent.com/vast-ai/vast-python/master/vast.py -O /usr/local/bin/vastai && chmod +x /usr/local/bin/vastai

COPY main.py .
RUN pip install fastapi uvicorn requests pydantic python-telegram-bot

EXPOSE 8000

CMD ["python", "main.py"]
