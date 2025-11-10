import { redis } from "bun";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth";

export const motionDetection = new Hono();

const heartbeatKey = 'heartbeat'
const alertLogKey = (ts: string) => `alert:motion:${ts}`;
const alertOfflineKey = (ts: string) => `alert:offline:${ts}`;

motionDetection.get('/heartbeat', authMiddleware, async (c) => {
    try {
        const hasHeartbeat = await redis.get(heartbeatKey);
        if (!hasHeartbeat) {
            let timestamp = await redis.get("dead");
            if (!timestamp) {
                timestamp = Date.now().toString();
                await redis.set("dead", timestamp);
            }
            return c.json({ status: "down", timestamp });
        }
        return c.json({ status: "up", timestamp: hasHeartbeat });
    } catch (err) {
        console.error('Error in /heartbeat:', err);
        return c.text('Heartbeat check failed', 500);
    }
});

motionDetection.get('/alerts', authMiddleware, async (c) => {
    const motionKeys = await redis.keys("alert:*");
    const keys = motionKeys;

    const alerts = await Promise.all(
        keys.map(async (key) => {
            const status = await redis.get(key);
            const type = key.split(":")[1];
            const timestamp = key.split(":")[2];
            return {
                key,
                timestamp,
                status,
                type,
            };
        })
    );

    alerts.filter(a => a !== null).sort((a, b) => Number(b.timestamp) - Number(a.timestamp)); // newest first

    return c.json({ alerts });
});

motionDetection.put("/alert/ack", authMiddleware, async (c) => {
    const { key } = await c.req.json()
    if (!key) {
        return c.json({ error: "Must provide a key" }, 500);
    }

    await redis.set(key, "ack");
    return c.json({ success: true })
})



