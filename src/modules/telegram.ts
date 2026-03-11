import { redis } from 'bun';
import { sendTelegramMessage, registerBotCommands, answerCallbackQuery, editMessageReplyMarkup } from '../service/telegram';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

let offset = 0;

function parseAlertKey(key: string): { type: string; date: string } {
    // key format: "alert:motion:1710100000" or "alert:offline:1710100000"
    const parts = key.split(':');
    const type = parts[1] ?? 'unknown';
    const timestamp = parseInt(parts[2] ?? '0', 10);
    const date = timestamp
        ? new Date(timestamp * 1000).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'unknown';
    return { type, date };
}

async function handleUpdate(update: any) {
    // Handle callback queries (inline button taps)
    if (update.callback_query) {
        const cb = update.callback_query;
        if (String(cb.message?.chat?.id) !== TELEGRAM_CHAT_ID) return;

        const data = cb.data as string;
        if (data.startsWith('ack:')) {
            const alertKey = `alert:${data.slice(4)}`;
            const exists = await redis.get(alertKey);
            if (exists && exists !== 'ack') {
                await redis.set(alertKey, 'ack');
                await answerCallbackQuery(cb.id, `Acknowledged ${alertKey}`);
            } else {
                await answerCallbackQuery(cb.id, 'Already acknowledged');
            }
            await editMessageReplyMarkup(cb.message.message_id);
        }
        return;
    }

    const message = update?.message;
    if (!message?.text || !message?.chat?.id) return;

    if (String(message.chat.id) !== TELEGRAM_CHAT_ID) return;

    const text = message.text.trim();
    const [command, ...args] = text.split(/\s+/);

    try {
        switch (command) {
            case '/status':
                await handleStatus();
                break;
            case '/alerts':
                await handleAlerts(false);
                break;
            case '/alerts_all':
                await handleAlerts(true);
                break;
            case '/ack':
                await handleAck(args.join(' '));
                break;
            case '/help':
                await handleHelp();
                break;
            default:
                await handleHelp();
                break;
        }
    } catch (err) {
        console.error('Error handling Telegram command:', err);
        await sendTelegramMessage('Something went wrong processing your command.');
    }
}

async function poll() {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`;
        const res = await fetch(url);
        const data = await res.json() as any;

        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                offset = update.update_id + 1;
                await handleUpdate(update);
            }
        }
    } catch (err) {
        console.error('Telegram polling error:', err);
        await new Promise(r => setTimeout(r, 5000));
    }
}

export async function startTelegramPolling() {
    // Remove any existing webhook first
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
    await registerBotCommands();
    console.log('Telegram polling started');

    (async () => {
        while (true) {
            await poll();
        }
    })();
}

async function handleStatus() {
    const heartbeat = await redis.get('heartbeat');
    if (heartbeat) {
        await sendTelegramMessage(`✅ Device is <b>online</b>\nLast heartbeat: ${heartbeat}`);
    } else {
        await sendTelegramMessage('⚠️ Device is <b>offline</b>\nNo recent heartbeat detected.');
    }
}

async function handleAlerts(showAll: boolean) {
    const keys = await redis.keys('alert:*');

    if (keys.length === 0) {
        await sendTelegramMessage('No alerts found.');
        return;
    }

    const alerts: string[] = [];
    for (const key of keys) {
        const value = await redis.get(key);
        if (!showAll && value === 'ack') continue;
        const { type, date } = parseAlertKey(key);
        const status = value === 'ack' ? '✅' : '🔴';
        alerts.push(`${status} <b>${type}</b> — ${date} — <code>${key}</code>`);
    }

    if (alerts.length === 0) {
        await sendTelegramMessage('No unacknowledged alerts.');
        return;
    }

    const heading = showAll ? 'All Alerts' : 'Unacknowledged Alerts';
    await sendTelegramMessage(`<b>${heading} (${alerts.length})</b>\n${alerts.join('\n')}`);
}

async function handleAck(arg: string) {
    if (arg) {
        const key = `alert:${arg}`;
        const exists = await redis.get(key);
        if (exists) {
            await redis.set(key, 'ack');
            await sendTelegramMessage(`✅ Acknowledged <code>${key}</code>`);
        } else {
            await sendTelegramMessage(`Alert <code>${key}</code> not found.`);
        }
    } else {
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
        '/alerts — List unacknowledged alerts\n' +
        '/alerts_all — List all alerts\n' +
        '/ack — Acknowledge all unacknowledged alerts\n' +
        '/ack motion:1710100000 — Acknowledge a specific alert\n' +
        '/help — Show this help message'
    );
}
