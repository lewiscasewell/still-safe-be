import type { Context, Next } from "hono";

export const deviceHashMiddleware = async (c: Context, next: Next) => {
    const headerHash = c.req.header('X-Device-Hash');
    if (headerHash !== process.env.DEVICE_HASH) {
        return c.json({ error: 'Invalid device hash' }, 400);
    }
    await next();
}