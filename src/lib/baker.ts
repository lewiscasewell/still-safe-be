import Baker from 'cronbake';
import { redis } from 'bun';
import { sendNotification } from '../service/push-notification';

const alertOfflineKey = (ts: string) => `alert:offline:${ts}`;

async function checkHeartbeat() {
    const heartbeatKey = 'heartbeat';
    const notificationThrottleKey = 'heartbeat:notification-sent';

    try {
        const hasHeartbeat = await redis.get(heartbeatKey);

        // If heartbeat is down
        if (!hasHeartbeat) {


            // Check if we've already sent a notification (throttle - once per hour)
            const notificationSent = await redis.get(notificationThrottleKey);

            if (!notificationSent) {
                try {
                    await sendNotification({
                        userId: "admin",
                        title: "⚠️ Device Offline",
                        body: "Please check the device now."
                    });
                    const timestamp = Date.now().toString().slice(0, -3);
                    await redis.set(alertOfflineKey(timestamp), "no-ack");
                    // Throttle notifications - only send once per hour
                    await redis.set(notificationThrottleKey, 'true');
                    await redis.expire(notificationThrottleKey, 60 * 60); // 1 hour

                    console.log(`📱 Sent offline notification`);
                } catch (err: any) {
                    console.error(`Failed to send offline notification:`, err);
                }
            }
        } else {
            const hasNotificationSent = await redis.get(notificationThrottleKey);
            if (hasNotificationSent) {
                await sendNotification({
                    userId: "admin",
                    title: "🎉 Device is back online",
                    body: "Have a great rest of your day!"
                });
            }
            // Heartbeat is back - clear notification throttle so we can notify again if it goes down
            await redis.del(notificationThrottleKey);
        }
    } catch (err) {
        console.error('Error checking heartbeat:', err);
    }
}

const baker = Baker.create();


// Check heartbeat every 15 seconds
baker.add({
    name: 'heartbeat-check',
    cron: '@every_15_seconds',
    callback: checkHeartbeat,
});

export { baker }