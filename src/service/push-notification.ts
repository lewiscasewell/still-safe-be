import apn from 'apn';
import { redis } from 'bun';
import { join } from 'path';
import { existsSync } from 'fs';

// For local development, use the key in the repo root
// For production (Docker), use the mounted secret path
const getAuthKeyPath = () => {
    if (process.env.APPLE_KEY_PATH) {
        return process.env.APPLE_KEY_PATH;
    }
    // Check if we're in local development (key exists in repo root)
    const localKeyPath = join(import.meta.dir, '../../AuthKey_R8A7PNSD3V.p8');
    if (existsSync(localKeyPath)) {
        return localKeyPath;
    }
    // Fallback to Docker secret path
    return '/run/secrets/apple_key.p8';
};

const authKeyPath = getAuthKeyPath();

export const sendNotification = async (params: { userId: string, title: string, body: string }) => {
    const deviceToken = await redis.get(`push-token:ios:${params.userId}`);
    if (!deviceToken) {
        console.warn(`⚠️  No device token registered for user: ${params.userId}. Skipping notification.`);
        return; // Gracefully skip if no token is registered
    }
    const options = {
        token: {
            key: authKeyPath,
            keyId: "R8A7PNSD3V",
            teamId: "KBZSY5H6TS"
        },
        production: true,
    }

    const apnProvider = new apn.Provider(options);

    const note = new apn.Notification()
    note.alert = {
        title: params.title,
        body: params.body
    }
    note.topic = "com.still.safe.dev"
    note.sound = "default"
    note.badge = 1

    try {
        const result = await apnProvider.send(note, deviceToken);

        if (result.failed && result.failed.length > 0) {
            const failure = result.failed[0];
            if (failure.response?.reason === "BadDeviceToken") {
                console.error(`BadDeviceToken error: Device token is for production, but using sandbox. Set APN_PRODUCTION=true`);
                throw new Error(`BadDeviceToken: Device token is for production, but using sandbox. Set APN_PRODUCTION=true`);
            }
            console.error("Failed to send notification:", result.failed);
            throw new Error(`Failed to send notification: ${JSON.stringify(result.failed)}`);
        }

        if (result.sent && result.sent.length > 0) {
            console.log("Notification sent successfully");
        }
    } catch (err: any) {
        console.error("Error sending notification:", err);
        throw err;
    } finally {
        apnProvider.shutdown();
    }
}