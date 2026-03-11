import { redis } from "bun";
import { Hono } from "hono";
import { sendTelegramAlert } from "../../service/telegram";
import { deviceHashMiddleware } from "../../middleware/device-hash";

export const deviceMotionDetection = new Hono();

const heartbeatKey = 'heartbeat'
const alertLogKey = (ts: string) => `alert:motion:${ts}`;

// protected for only ESP32
deviceMotionDetection.post('/alert', deviceHashMiddleware, async (c) => {
    const body = await c.req.json();
    const { timestamp } = body;

    if (!timestamp) {
        return c.json({ error: 'Missing timestamp' }, 400);
    }

    await redis.set(alertLogKey(timestamp), "no-ack");
    await sendTelegramAlert({ title: "Motion Alert", body: "Please check your device now." });
    return c.json({ status: 'ok' });
});

// protected for only ESP32
deviceMotionDetection.post('/heartbeat', deviceHashMiddleware, async (c) => {
    const body = await c.req.json();
    const { timestamp } = body;

    await redis.del("dead");
    await redis.set(heartbeatKey, timestamp);
    await redis.expire(heartbeatKey, 30);

    return c.json({ status: 'ok' });
});
