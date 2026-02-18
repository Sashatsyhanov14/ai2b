import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { detectLang } from "@/services/bot/utils/formatters";
import { handleDebug } from "@/services/bot/handlers/debugHandler";
import { handleCallback } from "@/services/bot/handlers/callbackHandler";
import { handleMessage } from "@/services/bot/handlers/messageHandler";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json().catch(() => ({}))) as any;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 1. Basic Validation
    if (!token) return NextResponse.json({ ok: true });

    // 2. Extract Basic Info
    const message = update?.message ?? update?.edited_message ?? update?.callback_query?.message ?? null;
    const chatIdRaw = message?.chat?.id ?? update?.chat?.id ?? update?.message?.from?.id ?? null;
    const chatId = chatIdRaw ? String(chatIdRaw) : null;
    if (!chatId) return NextResponse.json({ ok: true });

    const text: string =
      message?.text ??
      update?.message?.text ??
      update?.edited_message?.text ??
      update?.callback_query?.data ??
      "";

    const langCode = message?.from?.language_code ?? update?.message?.from?.language_code ?? null;
    const lang = detectLang(langCode);
    const botId = process.env.TELEGRAM_BOT_ID || "telegram";

    // 3. SYSTEM DEBUG (Priority Check)
    if (text?.startsWith("SYSTEM_DEBUG")) {
      const debugInfo = await handleDebug();
      await sendMessage(token, chatId, `📊 DEBUG INFO (Refactored):\n\n${debugInfo}`);
      return NextResponse.json({ ok: true });
    }

    // 4. Configuration Check
    if (!process.env.OPENROUTER_API_KEY) {
      const msg = lang === "ru" ? "Ошибка: API ключ не настроен." : "Config error: API Key missing.";
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // 5. Route to Handlers
    // A) Callback Query (Buttons)
    if (update?.callback_query) {
      await handleCallback(update, token, botId, lang);
      return NextResponse.json({ ok: true });
    }

    // B) Text Message
    const tgUsername = message?.from?.username || update?.message?.from?.username || null;
    const tgFirstName = message?.from?.first_name || update?.message?.from?.first_name || "";
    const tgLastName = message?.from?.last_name || update?.message?.from?.last_name || "";
    const tgFullName = `${tgFirstName} ${tgLastName}`.trim() || "не указано";
    const phone = update?.message?.contact?.phone_number || null;

    const userInfo = {
      username: tgUsername,
      fullName: tgFullName,
      phone: phone,
      language_code: langCode
    };

    await handleMessage(text, chatId, token, botId, userInfo, update);

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("Webhook Fatal Error:", e.message);
    return NextResponse.json({ ok: true }); // Always 200 to telegram
  }
}
