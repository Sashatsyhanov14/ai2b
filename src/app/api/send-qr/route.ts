import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const { telegram_id } = await req.json();
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'ai2b_app_bot';

        if (!token || !telegram_id) {
            return NextResponse.json({ error: 'Missing token or telegram_id' }, { status: 400 });
        }

        const refLink = `https://t.me/${botUsername}?start=${telegram_id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(refLink)}`;

        // Send QR as photo
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegram_id,
                photo: qrUrl,
                caption: `🖼 <b>Ваш персональный QR-код</b>\n\nСканируя этот код, люди будут попадать в бот по вашей реферальной ссылке.\n\n🔗 <code>${refLink}</code>`,
                parse_mode: 'HTML'
            }),
        });

        const tgData = await tgRes.json();

        if (!tgData.ok) {
            console.error('[SendQR] Telegram error:', tgData);
            return NextResponse.json({ error: tgData.description }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error('[SendQR] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
