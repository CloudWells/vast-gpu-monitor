# Vast.ai GPU Monitor

## Overview
This application provides real-time monitoring of the Vast.ai GPU marketplace. It solves the problem of tracking highly sought-after hardware (such as NVIDIA B200) by providing automated scanning with custom filtering and instant notifications.

## Features
- Multi-rule scanning: Monitor multiple GPU configurations simultaneously.
- Advanced filtering: Filter by GPU model, quantity, maximum hourly price, geographic location, and minimum rental duration.
- Web Interface: A secure, modern dashboard for dynamic configuration.
- Telegram Integration: Receive instant alerts and manage rules remotely via a Telegram bot.
- Secure Access: Authentication required for UI access, with credentials managed via environment variables.
- Dockerized: Simplified deployment using Docker and Docker Compose.

## Problem Solved
The GPU rental market is highly competitive. New or low-priced instances are often rented within minutes. Manual monitoring is inefficient. This tool automates the search process, ensuring users are notified the moment a matching instance becomes available.

## Installation and Deployment

### Prerequisites
- Docker and Docker Compose
- Your own Vast.ai API Key
- Your own Telegram Bot Token (from @BotFather)

### Setup
1. Clone the repository.
2. Create a `.env` file in the root directory and define your UI access password and optional custom port:
   ```env
   APP_PASSWORD=your_chosen_secure_password
   APP_PORT=1050
   ```
3. Start the services:
   ```bash
   docker-compose up -d --build
   ```

### Configuration Guide
1. **Access the Dashboard**: Open `http://your-server-ip:APP_PORT` (default is 1050) and log in with username `admin` and your `APP_PASSWORD`.
2. **Global Settings**:
   - **Vast.ai API Key**: Paste your API key from the Vast.ai console.
   - **TG Bot Token**: Paste the token received from @BotFather.
   - **TG Chat ID**: 
     - First, save your Bot Token in the UI.
     - Send the `/start` command to your bot in Telegram. 
     - The bot will reply with your personal Chat ID. 
     - Copy this ID back into the **TG Chat ID** field in the UI.
   - Click **Save Global Settings**.
3. **Monitoring Rules**:
   - Click the `+` icon to add a new rule.
   - Specify the GPU model (e.g., B200), quantity, max price, country, and duration.
   - Click **Update Rules**.
4. **Start Scanning**: Click the **Start Scanner** button. The system will now check the market every 60 seconds (or your custom interval).

## Technology Stack
- Backend: FastAPI (Python 3.10)
- Frontend: React 18, Vite, Tailwind CSS v4
- Integration: Vast.ai CLI, Telegram Bot API
- Deployment: Docker
