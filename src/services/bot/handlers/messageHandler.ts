import { sendMessage } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { runRouterAgent, runCommunicationAgent, RoleMessage } from "../ai/agents";

// Tools
import { handleSearchDatabase } from "../actions/search";
import { handleSaveLead } from "../actions/leads";
import { handleGetPhotos } from "../actions/photos";

export async function handleMessage(
    text: string,
    chatId: string,
    token: string,
    botId: string,
    userInfo: { username?: string | null; fullName?: string | null; phone?: string | null; language_code?: string | null },
    update?: any
) {
    try {
        console.log(`[Bot] Message from ${chatId}: ${text}`);
        const sessionId = (await findOrCreateSession(botId, chatId)).id;

        // 1. Save User Message
        await appendMessage({
            session_id: sessionId,
            bot_id: botId,
            role: "user",
            content: text,
            payload: { update }
        });

        // 2. Build Context
        const supabase = getServerClient();
        const { data: instructions } = await supabase
            .from('bot_instructions')
            .select('text')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        const rules = instructions && instructions.length > 0
            ? instructions.map((r: any) => `- ${r.text}`).join("\n")
            : "Общайся вежливо и помогай клиенту.";

        const { data: companyInfoRows } = await supabase
            .from('company_info')
            .select('key, value')
            .eq('is_active', true);

        const companyInfoStr = companyInfoRows && companyInfoRows.length > 0
            ? companyInfoRows.map(r => `${r.key}: ${r.value}`).join("\n")
            : "";

        const botKnowledge = `[ПРАВИЛА]:\n${rules}\n\n[О КОМПАНИИ]:\n${companyInfoStr}`;

        // Load history for LLM
        const history = await listMessages(sessionId, 10);
        const sortedHistory = (history || []).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const messages: RoleMessage[] = [];
        for (const msg of sortedHistory) {
            if (msg.role === 'system' || !msg.content) continue;
            // Map our DB role to RoleMessage role
            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            messages.push({ role, content: msg.content });
        }

        // Avoid duplicate of current message
        const lastMsg = sortedHistory[sortedHistory.length - 1];
        if (!lastMsg || lastMsg.content !== text) {
            messages.push({ role: "user", content: text });
        }

        // 3. MULTI-AGENT PIPELINE
        console.log(`[Bot] Executing Router Agent...`);
        const routerInstruction = await runRouterAgent(messages);
        console.log(`[Bot] Router decision:`, JSON.stringify(routerInstruction));

        // VIP RADAR ALERT
        if (routerInstruction.is_vip) {
            console.log("[Bot] 🚨 VIP CLIENT DETECTED 🚨 Alerting managers...");
            const alertMsg = `🔥 <b>VIP-КЛИЕНТ В ИИ-БОТЕ!</b> 🔥\n\n👤 Пользователь: @${userInfo.username || chatId}\n💬 Сообщение: "${text}"\n🤖 <i>Бот продолжает диалог, но советуем перехватить чат!</i>`;

            // Reusing supabase client defined above
            const { data: managers } = await supabase.from("telegram_managers").select("telegram_id").eq("is_active", true);
            if (managers && managers.length > 0) {
                for (const m of managers) {
                    if (m.telegram_id) {
                        try {
                            // Using standard telegram fetch to support HTML parse mode
                            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: m.telegram_id,
                                    text: alertMsg,
                                    parse_mode: "HTML"
                                })
                            });
                        } catch (e) {
                            console.error("VIP Alert failed:", e);
                        }
                    }
                }
            }
        }

        const route = routerInstruction.route;
        let finalReplyText = "";
        let unitsFound: any[] = [];

        switch (route) {
            case "ignore":
                console.log("[Bot] Route: ignore. Not replying.");
                return;

            case "search_apartments":
                console.log("[Bot] Route: search_apartments.");
                const searchTasks = Array.isArray(routerInstruction.search_params)
                    ? routerInstruction.search_params
                    : [routerInstruction.search_params || {}];

                for (let i = 0; i < searchTasks.length; i++) {
                    console.log(`[Bot] Executing Multi-Search attempt ${i + 1}/${searchTasks.length}...`, searchTasks[i]);
                    try {
                        const rawResult = await handleSearchDatabase(searchTasks[i]);
                        const parsed = JSON.parse(rawResult);

                        if (parsed.units && Array.isArray(parsed.units) && parsed.units.length > 0) {
                            // Anti-repeat logic
                            const assistantHistory = messages
                                .filter(m => m.role === "assistant")
                                .map(m => m.content)
                                .join(" ");
                            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
                            const shownIds = Array.from(assistantHistory.matchAll(uuidRegex)).map((m: any) => m[0]);

                            const newUnits = parsed.units.filter((u: any) => !shownIds.includes(u.id));
                            if (newUnits.length > 0) {
                                unitsFound = newUnits;
                                console.log(`[Bot] Found ${unitsFound.length} new properties on attempt ${i + 1}. Breaking search loop.`);
                                break;
                            }
                        }
                    } catch (e) {
                        console.error("Search failed on attempt", i + 1, e);
                    }
                }

                // Compile data for Communication Agent
                const dbData = unitsFound.length > 0
                    ? JSON.stringify(unitsFound.slice(0, 3), null, 2)
                    : "Квартиры по этому запросу и всем запасным вариантам (бюджет+, без планировки) НЕ НАЙДЕНЫ. Предложи изменить параметры кардинально (другой город).";

                // Generate text
                console.log("[Bot] Executing Communication Agent (Search Result)...");
                finalReplyText = await runCommunicationAgent(messages, botKnowledge, dbData);
                break;

            case "capture_lead":
                console.log("[Bot] Route: capture_lead. Saving lead...");
                const leadParams = routerInstruction.lead_info || {};
                const phone = leadParams.phone || userInfo.phone || "Unknown";
                const name = leadParams.name || userInfo.fullName || userInfo.username || "Client";
                const info = leadParams.summary || "No details";

                await handleSaveLead({ phone, name, info }, chatId, userInfo.username);

                // Alert managers
                const alertMsg = `⚠️ НОВЫЙ ЛИД ОТ ИИ-БОТА:\nОт: @${userInfo.username || chatId}\nИмя: ${name}\nТелефон: ${phone}\nКонтекст: ${info}`;
                const { data: managers } = await supabase.from("telegram_managers").select("telegram_id").eq("is_active", true);
                if (managers && managers.length > 0) {
                    for (const m of managers) {
                        if (m.telegram_id) {
                            await sendMessage(token, String(m.telegram_id), alertMsg).catch(() => { });
                        }
                    }
                }

                // Generate text
                console.log("[Bot] Executing Communication Agent (Lead Captured)...");
                finalReplyText = await runCommunicationAgent(messages, botKnowledge, "Контактные данные успешно переданы менеджеру. Менеджер скоро свяжется с клиентом. Скажи спасибо.");
                break;

            case "communicate":
            default:
                console.log("[Bot] Route: communicate. Executing Communication Agent...");
                finalReplyText = await runCommunicationAgent(messages, botKnowledge, "Просто ответь на вопрос клиента. База данных не задействована. Контекст: " + routerInstruction.context_for_communication);
                break;
        }

        // 4. Final Output to User
        if (finalReplyText) {
            console.log("[Bot] Sending final text to Telegram...");
            await sendMessage(token, chatId, finalReplyText);
            await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: finalReplyText });
        }

        // 5. Send Photos strictly AFTER text message if we found units
        if (route === "search_apartments" && unitsFound.length > 0) {
            console.log(`[Bot] Sending photos for ${unitsFound.length} units...`);
            // Only send photos for the top 3 presented
            const displayedUnits = unitsFound.slice(0, 3);
            for (const unit of displayedUnits) {
                if (unit.id) {
                    await handleGetPhotos({ unit_id: String(unit.id) }, token, chatId).catch(e => console.error("Error sending photo for", unit.id, e));
                }
            }
        }

        console.log("[Bot] Turn complete.");

    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        await sendMessage(token, chatId, "Произошла ошибка системы. Попробуйте еще раз. Текст: " + (globalErr?.message || String(globalErr)));
    }
}
