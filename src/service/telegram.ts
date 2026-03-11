const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function sendTelegramMessage(text: string, reply_markup?: object) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload: any = {
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
    };
    if (reply_markup) {
        payload.reply_markup = reply_markup;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const body = await res.text();
        console.error('Telegram sendMessage failed:', res.status, body);
        throw new Error(`Telegram API error: ${res.status}`);
    }
}

export async function sendTelegramAlert({ title, body, alertKey }: { title: string; body: string; alertKey?: string }) {
    const text = `<b>${title}</b>\n${body}`;
    let reply_markup: object | undefined;
    if (alertKey) {
        reply_markup = {
            inline_keyboard: [[{ text: '✅ Acknowledge', callback_data: `ack:${alertKey}` }]],
        };
    }
    await sendTelegramMessage(text, reply_markup);
}

export async function registerBotCommands() {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            commands: [
                { command: 'status', description: 'Check device online/offline status' },
                { command: 'alerts', description: 'List unacknowledged alerts' },
                { command: 'alerts_all', description: 'List all alerts' },
                { command: 'ack', description: 'Acknowledge alerts' },
                { command: 'help', description: 'Show available commands' },
            ],
        }),
    });
    if (!res.ok) {
        console.error('Failed to register bot commands:', res.status, await res.text());
    }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
}

export async function editMessageReplyMarkup(messageId: number) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            message_id: messageId,
            reply_markup: { inline_keyboard: [] },
        }),
    });
}
