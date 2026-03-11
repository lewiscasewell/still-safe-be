import { Hono } from 'hono';
import { redis } from 'bun';
import { sendTelegramMessage } from '../service/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.randomUUID();

export const telegram = new Hono();

telegram.post('/webhook', async (c) => {
    // Verify secret token header
    const secretHeader = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader !== WEBHOOK_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const update = await c.req.json();
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
        return c.json({ ok: true });
    }

    // Only respond to our chat
    if (String(message.chat.id) !== TELEGRAM_CHAT_ID) {
        return c.json({ ok: true });
    }

    const text = message.text.trim();
    const [command, ...args] = text.split(/\s+/);

    try {
        switch (command) {
            case '/status':
                await handleStatus();
                break;
            case '/alerts':
                await handleAlerts();
                break;
            case '/ack':
                await handleAck(args.join(' '));
                break;
            default:
                await handleHelp();
                break;
        }
    } catch (err) {
        console.error('Error handling Telegram command:', err);
        await sendTelegramMessage('Something went wrong processing your command.');
    }

    return c.json({ ok: true });
});

async function handleStatus() {
    const heartbeat = await redis.get('heartbeat');
    if (heartbeat) {
        await sendTelegramMessage(`✅ Device is <b>online</b>\nLast heartbeat: ${heartbeat}`);
    } else {
        await sendTelegramMessage('⚠️ Device is <b>offline</b>\nNo recent heartbeat detected.');
    }
}

async function handleAlerts() {
    const keys = await redis.keys('alert:*');

    if (keys.length === 0) {
        await sendTelegramMessage('No alerts found.');
        return;
    }

    const alerts: string[] = [];
    for (const key of keys) {
        const value = await redis.get(key);
        alerts.push(`• <code>${key}</code> — ${value}`);
    }

    await sendTelegramMessage(`<b>Alerts (${alerts.length})</b>\n${alerts.join('\n')}`);
}

async function handleAck(arg: string) {
    if (arg) {
        // Acknowledge specific alert
        const key = `alert:${arg}`;
        const exists = await redis.get(key);
        if (exists) {
            await redis.set(key, 'ack');
            await sendTelegramMessage(`✅ Acknowledged <code>${key}</code>`);
        } else {
            await sendTelegramMessage(`Alert <code>${key}</code> not found.`);
        }
    } else {
        // Acknowledge all unacknowledged alerts
        let acked = 0;
        const keys = await redis.keys('alert:*');
        for (const key of keys) {
            const value = await redis.get(key);
            if (value === 'no-ack') {
                await redis.set(key, 'ack');
                acked++;
            }
        }

        await sendTelegramMessage(`✅ Acknowledged ${acked} alert(s).`);
    }
}

async function handleHelp() {
    await sendTelegramMessage(
        '<b>SafePi Bot Commands</b>\n' +
        '/status — Check device online/offline status\n' +
        '/alerts — List all alerts\n' +
        '/ack — Acknowledge all unacknowledged alerts\n' +
        '/ack motion:1710100000 — Acknowledge a specific alert'
    );
}

export async function registerWebhook(webhookUrl: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: `${webhookUrl}/telegram/webhook`,
            secret_token: WEBHOOK_SECRET,
        }),
    });

    const result = await res.json();
    if (result.ok) {
        console.log('Telegram webhook registered successfully');
    } else {
        console.error('Failed to register Telegram webhook:', result);
    }
}
