const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function sendTelegramMessage(text: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'HTML',
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        console.error('Telegram sendMessage failed:', res.status, body);
        throw new Error(`Telegram API error: ${res.status}`);
    }
}

export async function sendTelegramAlert({ title, body }: { title: string; body: string }) {
    const text = `<b>${title}</b>\n${body}`;
    await sendTelegramMessage(text);
}
