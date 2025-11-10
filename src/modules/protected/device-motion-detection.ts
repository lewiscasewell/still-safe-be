import { redis } from "bun";
import { Hono, type Context, type Next } from "hono";
import { sendNotification } from "../../service/push-notification";

export const deviceMotionDetection = new Hono();

const heartbeatKey = 'heartbeat'
const alertLogKey = (ts: string) => `alert:motion:${ts}`;

const withDeviceHash = async (c: Context, next: Next) => {
    const headerHash = c.req.header('X-Device-Hash');
    if (headerHash !== process.env.DEVICE_HASH) {
        return c.json({ error: 'Invalid device hash' }, 400);
    }
    await next();
}

// protected for only ESP32
deviceMotionDetection.post('/alert', withDeviceHash, async (c) => {
    const body = await c.req.json();
    const { timestamp } = body;

    if (!timestamp) {
        return c.json({ error: 'Missing device_id or timestamp' }, 400);
    }

    await redis.set(alertLogKey(timestamp), "no-ack");
    await sendNotification({ userId: "admin", title: "Motion Alert", body: "Please check your device now." });
    return c.json({ status: 'ok' });
});

// protected for only ESP32
deviceMotionDetection.post('/heartbeat', withDeviceHash, async (c) => {
    const body = await c.req.json();
    const { timestamp } = body;

    await redis.del("dead");
    await redis.set(heartbeatKey, timestamp);
    await redis.expire(heartbeatKey, 30);

    return c.json({ status: 'ok' });
});