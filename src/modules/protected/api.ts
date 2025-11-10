import { redis } from "bun";
import { Hono } from "hono";
import { DEVICE_ID } from "../../constants";

export const apiProtected = new Hono();

apiProtected.get('/protected', (c) => {
    return c.text("Protected");
})

apiProtected.get("/logs", async (c) => {
    try {
        const keys = await redis.send("KEYS", [`log:status:${DEVICE_ID}:*`]);
        if (!Array.isArray(keys)) return c.json([]);

        const sortedKeys = keys.sort((a: string, b: string) => {
            const aTime = Number(a.split(":").pop());
            const bTime = Number(b.split(":").pop());
            return bTime - aTime; // newest first
        });

        const pipeline = sortedKeys.map((key) => redis.get(key));
        const values = await Promise.all(pipeline);

        const logs = values.map((v, i) => ({
            key: sortedKeys[i],
            data: v ? JSON.parse(v) : null,
        }));

        return c.json({ logs });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});