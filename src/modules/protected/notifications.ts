import { redis } from "bun";
import { Hono } from "hono";

type Variables = {
    userId: string
}

const notifications = new Hono<{ Variables: Variables }>();

notifications.post('/register-token', async (c) => {
    const { pushToken } = await c.req.json();
    const userId = c.get('jwtPayload').sub;

    await redis.set(`push-token:ios:${userId}`, pushToken);

    return c.json({ success: true }, 201);
});

notifications.delete('/unregister-token', async (c) => {
    await redis.del('push-token:ios:admin');

    return c.json({ success: true }, 201);
});

export { notifications }