import Baker from 'cronbake';
import { redis } from 'bun';
import { sendTelegramAlert } from '../service/telegram';

const alertOfflineKey = (ts: string) => `alert:offline:${ts}`;

async function checkHeartbeat() {
    const heartbeatKey = 'heartbeat';
    const notificationThrottleKey = 'heartbeat:notification-sent';

    try {
        const hasHeartbeat = await redis.get(heartbeatKey);

        if (!hasHeartbeat) {
            const notificationSent = await redis.get(notificationThrottleKey);

            if (!notificationSent) {
                try {
                    const timestamp = Date.now().toString().slice(0, -3);
                    await redis.set(alertOfflineKey(timestamp), "no-ack");
                    await sendTelegramAlert({
                        title: "⚠️ Device Offline",
                        body: "Please check the device now."
                    });
                    await redis.set(notificationThrottleKey, 'true');
                    await redis.expire(notificationThrottleKey, 60 * 60);
                    console.log(`📱 Sent offline notification`);
                } catch (err: any) {
                    console.error(`Failed to send offline notification:`, err);
                }
            }
        } else {
            const hasNotificationSent = await redis.get(notificationThrottleKey);
            if (hasNotificationSent) {
                try {
                    await sendTelegramAlert({
                        title: "🎉 Device is back online",
                        body: "Have a great rest of your day!"
                    });
                } catch (err: any) {
                    console.error(`Failed to send online notification:`, err);
                }
            }
            await redis.del(notificationThrottleKey);
        }
    } catch (err) {
        console.error('Error checking heartbeat:', err);
    }
}

const baker = Baker.create();

baker.add({
    name: 'heartbeat-check',
    cron: '@every_15_seconds',
    callback: checkHeartbeat,
});

export { baker }
