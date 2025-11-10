import type { Context } from "hono";
import { env as honoEnv } from "hono/adapter";

interface Env extends Record<string, unknown> {
    ACCESS_SECRET: string;
    REFRESH_SECRET: string;
    REDIS_URL: string;
}

export const env = (c: Context) => honoEnv<Env>(c)