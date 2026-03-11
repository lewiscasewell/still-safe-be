import type { Context } from "hono";
import { env as honoEnv } from "hono/adapter";

interface Env extends Record<string, unknown> {
    REDIS_URL: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
}

export const env = (c: Context) => honoEnv<Env>(c)
