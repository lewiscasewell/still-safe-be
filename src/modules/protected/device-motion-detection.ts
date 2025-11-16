import { redis } from "bun";
import { Hono } from "hono";
import { sendNotification } from "../../service/push-notification";
import { deviceHashMiddleware } from "../../middleware/device-hash";

export const deviceMotionDetection = new Hono();

const heartbeatKey = 'heartbeat'
const alertLogKey = (ts: string) => `alert:motion:${ts}`;

deviceMotionDetection.get("/otp", deviceHashMiddleware, async (c) => {
    const otp = await redis.get(`otp:admin`)
    return c.text(otp ?? "");
});

// protected for only ESP32
deviceMotionDetection.post('/alert', deviceHashMiddleware, async (c) => {
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
deviceMotionDetection.post('/heartbeat', deviceHashMiddleware, async (c) => {
    const body = await c.req.json();
    const { timestamp } = body;

    await redis.del("dead");
    await redis.set(heartbeatKey, timestamp);
    await redis.expire(heartbeatKey, 30);

    return c.json({ status: 'ok' });
});