# safeping-be

Backend for the Still Safe motion detection system. Notifications and device interaction happen via a Telegram bot.

## Local Development

### Prerequisites

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   DEVICE_HASH=your_device_hash_here
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id
   REDIS_URL=redis://localhost:6379
   PORT=3000
   ```
   > Note: Bun automatically loads `.env` files into `process.env`

3. **Start Redis:**
   You can either:
   - Run Redis locally: `redis-server`
   - Or use Docker: `docker-compose -f docker-compose.dev.yml up redis`

4. **Run the server:**
   ```bash
   bun run start
   ```
   The server will start on `http://localhost:3000`

## Docker Development

For local development with Docker:

```bash
bun run dev:docker
```

Make sure you have a `.env` file in the repo root (see Local Development section above).

## Production (Docker on Raspberry Pi)

Use `docker-compose.yml` for production:

```bash
bun run docker:prod
```

The production setup:
- Uses environment variables from `/home/lewiscasewell/secrets/.env`
- Runs as non-root user
- Includes health checks

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token
2. Message your bot, then get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in your `.env`
4. Register the webhook by calling `registerWebhook("https://your-domain.com")` on startup, or manually via the Telegram API

### Bot Commands

- `/status` — Check device online/offline status
- `/alerts` — List all alerts
- `/ack` — Acknowledge all unacknowledged alerts
- `/ack motion:1710100000` — Acknowledge a specific alert
