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
- Vast.ai API Key
- Telegram Bot Token

### Setup
1. Clone the repository.
2. Create a `.env` file in the root directory:
   ```env
   APP_PASSWORD=your_secure_password
   ```
3. Deploy using Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

### Access
- Web UI: `http://localhost:1050`
- API: `http://localhost:8000`

### Initial Configuration
1. Log in to the Web UI using the username `admin` and the password defined in `.env`.
2. Provide your Vast.ai API Key and Telegram credentials in the settings panel.
3. Define your monitoring rules and start the scanner.
4. Interact with the Telegram bot using the `/start` command to retrieve your Chat ID and verify connectivity.

## Technology Stack
- Backend: FastAPI (Python 3.10)
- Frontend: React 18, Vite, Tailwind CSS v4
- Integration: Vast.ai CLI, Telegram Bot API
- Deployment: Docker
