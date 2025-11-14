# safeping-be

Backend for the Still Safe motion detection system.

## Local Development

### Prerequisites

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   ACCESS_SECRET=your_access_secret_here
   REFRESH_SECRET=your_refresh_secret_here
   DEVICE_HASH=your_device_hash_here
   REDIS_URL=redis://localhost:6379
   APN_PRODUCTION=false
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

### Local Development Notes

- The Apple key file (`AuthKey_R8A7PNSD3V.p8`) should be in the repo root
- The code automatically detects if you're running locally and uses the local key file
- For production, set `APPLE_KEY_PATH` environment variable to override

## Docker Development

For local development with Docker:

```bash
# Option 1: Use npm/bun script (easiest)
bun run dev

# Option 2: Use the dev script directly
./dev.sh

# Option 3: Use docker-compose directly
bun run dev:docker
```

Make sure you have a `.env` file in the repo root (see Local Development section above).

## Production (Docker on Raspberry Pi)

Use `docker-compose.yml` for production:

```bash
# Option 1: Use npm/bun script
bun run docker:prod

# Option 2: Use docker-compose directly
docker compose up --build
```

The production setup:
- Mounts secrets from `/home/lewiscasewell/secrets/`
- Uses environment variables from `/home/lewiscasewell/secrets/.env`
- Runs as non-root user
- Includes health checks

This project was created using `bun init` in bun v1.2.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
