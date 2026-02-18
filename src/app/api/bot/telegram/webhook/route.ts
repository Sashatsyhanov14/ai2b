import { NextRequest, NextResponse } from "next/server";
import { handleMessage } from "@/services/bot/handlers/messageHandler";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
    try {
        const update = await req.json().catch(() => ({}));
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const botId = process.env.TELEGRAM_BOT_ID || "telegram_bot";

        if (!token) {
            console.error("TELEGRAM_BOT_TOKEN is missing");
            return NextResponse.json({ ok: true });
        }

        // Basic extraction
        const message = update.message || update.edited_message;
        if (!message) {
            // Could be a callback query or status update, ignore for now in this simple version
            // Or handle callback if we add buttons later
            return NextResponse.json({ ok: true });
        }

        const chatId = message.chat.id.toString();
        const text = message.text || "";

        // User Info
        const userInfo = {
            username: message.from.username || null,
            fullName: [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || null,
            phone: message.contact?.phone_number || null,
            language_code: message.from.language_code || null
        };

        console.log(`[Webhook] Received from ${chatId}: ${text.substring(0, 20)}...`);

        // Dispatch to The Loop
        await handleMessage(text, chatId, token, botId, userInfo, update);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("Webhook Error:", e);
        return NextResponse.json({ ok: true }); // Always 200 to Telegram
    }
}
