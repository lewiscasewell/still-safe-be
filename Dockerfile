FROM oven/bun:1

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install deps first for better cache
COPY package.json bun.lock* ./
RUN bun install

# Copy source explicitly (avoid copying secrets)
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as non-root (the bun image provides a 'bun' user)
USER bun

CMD ["bun", "run", "start"]