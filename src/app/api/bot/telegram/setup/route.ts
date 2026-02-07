import { NextRequest, NextResponse } from "next/server";
import { setWebhook, generateSecret } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: "TELEGRAM_BOT_TOKEN is not set" },
            { status: 500 }
        );
    }

    // Get the host from request or use environment variable
    const host = req.headers.get("host") || process.env.VERCEL_URL || "ai2b-nine.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/bot/telegram/webhook`;

    const secretToken = generateSecret();

    try {
        await setWebhook(token, webhookUrl, secretToken);

        return NextResponse.json({
            success: true,
            message: "Webhook set successfully!",
            webhookUrl,
            note: "Secret token generated. Store TELEGRAM_WEBHOOK_SECRET in environment if needed for verification.",
        });
    } catch (e: any) {
        return NextResponse.json(
            {
                error: "Failed to set webhook",
                details: e?.message || String(e),
            },
            { status: 500 }
        );
    }
}
