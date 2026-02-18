import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage } from "@/lib/telegram";
import { findOrCreateSession, appendMessage } from "@/services/sessions";
import { Lang } from "../types";

export async function handleCallback(
    update: any,
    token: string,
    botId: string,
    lang: Lang
) {
    const cbData = update.callback_query.data;
    const cbId = update.callback_query.id;
    const chatId = update.callback_query.message.chat.id;

    if (cbData.startsWith("depth:")) {
        const [_, action, unitId] = cbData.split(":");
        // Track this event in session
        try {
            const session = await findOrCreateSession(botId, String(chatId));
            await appendMessage({
                session_id: session.id,
                bot_id: botId,
                role: "user",
                content: `Click: ${action} for unit ${unitId}`,
                payload: { depth_action: action, unit_id: unitId }
            });

            // Respond to user
            const sb = getServerClient();
            const { data: unit } = await sb.from("units").select("*").eq("id", unitId).single();

            if (unit) {
                let responseText = "";
                if (action === "photos") {
                    responseText = lang === "ru" ? "📸 Загружаю дополнительные фото..." : "📸 Loading more photos...";
                } else if (action === "location") {
                    responseText = unit.address
                        ? (lang === "ru" ? `📍 Адрес объекта: ${unit.address}` : `📍 Property Address: ${unit.address}`)
                        : (lang === "ru" ? "📍 Точный адрес уточняйте у менеджера." : "📍 Please ask manager for exact coordinates.");
                } else if (action === "price_tr") {
                    const tryPrice = Math.round(unit.price * 33); // Example rate
                    responseText = lang === "ru"
                        ? `💰 Примерная цена: ${tryPrice.toLocaleString()} TRY`
                        : `💰 Approx.price: ${tryPrice.toLocaleString()} TRY`;
                } else if (action === "price_us") {
                    responseText = `💵 Price: $${unit.price.toLocaleString()}`;
                }

                if (responseText) {
                    await sendMessage(token, String(chatId), responseText);
                }
            }
        } catch (e) {
            console.error("callback error:", e);
        }
    }

    // Answer callback query to stop loading spinner
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cbId }),
    });
}
