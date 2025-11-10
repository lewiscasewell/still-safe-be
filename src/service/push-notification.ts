import apn from 'apn';
import { redis } from 'bun';
import { join } from 'path';

const authKeyPath = join(import.meta.dir, '../../AuthKey_R8A7PNSD3V.p8');

export const sendNotification = async (params: { userId: string, title: string, body: string }) => {
    const deviceToken = await redis.get(`push-token:ios:${params.userId}`);
    if (!deviceToken) {
        throw new Error(`No device token for user: ${params.userId}`);
    }
    const useProduction = process.env.APN_PRODUCTION === "true";
    const options = {
        token: {
            key: authKeyPath,
            keyId: "R8A7PNSD3V",
            teamId: "KBZSY5H6TS"
        },
        production: useProduction,
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
                const envMismatch = useProduction
                    ? "Device token is for sandbox, but using production. Set APN_PRODUCTION=false"
                    : "Device token is for production, but using sandbox. Set APN_PRODUCTION=true";
                console.error(`BadDeviceToken error: ${envMismatch}`);
                throw new Error(`BadDeviceToken: ${envMismatch}. Make sure your device token matches the environment.`);
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