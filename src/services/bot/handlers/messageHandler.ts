import { sendMessage, sendChatAction } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { runRouterAgent, runCommunicationAgent, RoleMessage } from "../ai/agents";

// Tools
import { handleSearchDatabase } from "../actions/search";
import { handleSaveLead } from "../actions/leads";
import { handleGetPhotos } from "../actions/photos";
import { handleGetAgencyInfo } from "../actions/agency";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

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

        const agencyFiles = await handleGetAgencyInfo();

        const botKnowledge = `[ПРАВИЛА]:\n${rules}\n\n[О КОМПАНИИ]:\n${companyInfoStr}\n\n[МНЕНИЯ/ФАЙЛЫ КОМПАНИИ]:\n${agencyFiles}`;

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
        sendChatAction(token, chatId, 'typing').catch(() => { });
        const routerInstruction = await runRouterAgent(messages, botKnowledge);
        console.log(`[Bot] Router decision:`, JSON.stringify(routerInstruction));

        let unitsFound: any[] = [];
        let finalReplyText = "";

        // A. MANAGER AGENT (Alerts & Leads)
        if (routerInstruction.instructions_for_manager_agent) {
            console.log("[Bot] 🚨 MANAGER AGENT TRIGGERED 🚨");
            const mgr = routerInstruction.instructions_for_manager_agent;
            const phone = mgr.client_phone || userInfo.phone || "Unknown";
            const name = mgr.client_name || userInfo.fullName || userInfo.username || "Client";
            const reason = mgr.reason || "Аналитика диалога";
            const email = mgr.client_email || null;
            const budget = mgr.budget || null;
            const interested_units = mgr.interested_units || [];
            const temp = mgr.lead_temperature || "cold";
            const lang = routerInstruction.detected_language || userInfo.language_code || "ru";

            if (phone !== "Unknown" || temp === "warm" || temp === "hot") {
                console.log(`[Bot] Saving Lead for ${chatId}...`);
                try {
                    await handleSaveLead({ phone, name, info: reason, email, budget, interested_units, temperature: temp, language: lang } as any, chatId, userInfo.username);
                    console.log(`[Bot] Lead saved successfully.`);
                } catch (saveErr) {
                    console.error("[Bot] handleSaveLead failed:", saveErr);
                }
            }

            let alertMsg = `🔥 <b>ВНИМАНИЕ МЕНЕДЖЕРАМ! (ИИ-БОТ)</b> 🔥\n\n👤 Пользователь: @${userInfo.username || chatId}\n👤 Имя: ${name}\n📞 Контакт: ${phone !== "Unknown" ? phone : "Пока не оставил"}\n💬 Инфо: ${reason}`;
            if (budget) alertMsg += `\n💰 Бюджет: $${budget}`;
            if (temp) alertMsg += `\n🌡 Горячесть: ${temp === 'hot' ? '🔥 Горячий' : temp === 'warm' ? '☀️ Теплый' : '❄️ Холодный'}`;
            if (interested_units && interested_units.length > 0) alertMsg += `\n🏢 Интересы: ${interested_units.join(', ')}`;
            alertMsg += `\n\n🤖 <i>ИИ продолжает диалог, но вы можете перехватить!</i>`;

            // Send notifications to Managers only for formed leads (warm or hot)
            if (temp === "warm" || temp === "hot") {
                const { data: managers } = await supabase
                    .from("telegram_managers")
                    .select("telegram_id, preferred_lang")
                    .eq("is_active", true);

                if (managers && managers.length > 0) {
                    const dashboardUrl = "https://ai2b.app/app/leads";

                    for (const m of managers) {
                        if (!m.telegram_id) continue;

                        const m_lang = m.preferred_lang || "ru";
                        const safeName = escapeHtml(name);
                        const notificationText =
                            m_lang === "tr" ? `🚀 <b>Yeni bir lead'iniz var!</b>\n\nMüşteri: ${safeName}\nDetayları görüntülemek için panele gidin.` :
                                m_lang === "en" ? `🚀 <b>You have a new lead!</b>\n\nClient: ${safeName}\nGo to the dashboard to view details.` :
                                    `🚀 <b>У вас новый лид!</b>\n\nКлиент: ${safeName}\nПерейдите в дашборд для просмотра деталей.`;

                        const btnLabel =
                            m_lang === "tr" ? "Panele Git ↗️" :
                                m_lang === "en" ? "To Dashboard ↗️" :
                                    "В дашборд ↗️";

                        try {
                            await sendMessage(token, m.telegram_id, notificationText, {
                                parse_mode: "HTML",
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: btnLabel, url: dashboardUrl }]
                                    ]
                                }
                            });
                        } catch (e) {
                            console.error("Manager Alert failed for", m.telegram_id, e);
                        }
                    }
                }
            }
        }

        // B. SEARCH AGENT
        if (routerInstruction.instructions_for_search_agent) {
            console.log("[Bot] 🔍 SEARCH AGENT TRIGGERED ");
            const baseParams = routerInstruction.instructions_for_search_agent;

            const searchTasks = [
                baseParams, // 1. Strict search (up to Price + 15% as per agent rules)
                { ...baseParams, rooms: undefined }, // 2. Relaxed rooms
                { ...baseParams, rooms: undefined, price: baseParams.price ? baseParams.price * 1.5 : undefined } // 3. Very relaxed price
            ];

            for (let i = 0; i < searchTasks.length; i++) {
                console.log(`[Bot] Executing Multi-Search attempt ${i + 1}/${searchTasks.length}...`, searchTasks[i]);
                try {
                    const rawResult = await handleSearchDatabase(searchTasks[i]);
                    const parsed = JSON.parse(rawResult);

                    if (parsed.units && Array.isArray(parsed.units) && parsed.units.length > 0) {
                        const assistantHistory = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ");
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
        }

        // C. COMMUNICATION AGENT
        if (routerInstruction.instructions_for_communication_agent) {
            console.log("[Bot] 🗣 COMMUNICATION AGENT TRIGGERED");

            let dbData = "База данных не запрашивалась.";
            if (routerInstruction.instructions_for_search_agent) {
                dbData = unitsFound.length > 0
                    ? JSON.stringify(unitsFound.slice(0, 1), null, 2)
                    : "Квартиры по запросу (и всем авто-запасным вариантам: бюджет+, любой тип) НЕ НАЙДЕНЫ. Предложи изменить параметры кардинально.";
            }

            let customInstruction = routerInstruction.instructions_for_communication_agent;

            // Force prioritization of found units
            if (unitsFound.length > 0) {
                customInstruction = `ОБЪЕКТЫ НАЙДЕНЫ! СНАЧАЛА ОПИШИ ИХ ПОДРОБНО. Только потом задавай уточняющие вопросы.\n\n${customInstruction}`;
            }

            const fullInstruction = `[УКАЗАНИЕ ОТ ДИСПЕТЧЕРА]:\n${customInstruction}\n\n[ИСТОРИЯ И КОНТЕКСТ]:\nОпирайся на историю диалога и учитывай правила компании!`;
            const lang = routerInstruction.detected_language || userInfo.language_code || "ru";

            sendChatAction(token, chatId, 'typing').catch(() => { });
            finalReplyText = await runCommunicationAgent(messages, botKnowledge, dbData + "\n\n" + fullInstruction, lang);
        }

        // 4. Final Output to User
        if (finalReplyText) {
            console.log("[Bot] Sending final text to Telegram...");
            await sendMessage(token, chatId, finalReplyText);

            // secretly append UUIDs to the database history so the search agent won't show repeats
            let dbStoreText = finalReplyText;
            if (routerInstruction.instructions_for_search_agent && unitsFound.length > 0) {
                const shownIdsString = unitsFound.slice(0, 1).map((u: any) => `[HIDDEN_SYSTEM_ID: ${u.id}]`).join("\n");
                dbStoreText += `\n\n${shownIdsString}`;
            }
            await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: dbStoreText });
        }

        // 5. Send Photos strictly AFTER text message if we found units
        if (routerInstruction.instructions_for_search_agent && unitsFound.length > 0) {
            console.log(`[Bot] Sending photos for ${unitsFound.length} units...`);
            const displayedUnits = unitsFound.slice(0, 1); // Show exactly 1 unit per response
            for (const unit of displayedUnits) {
                if (unit.id) {
                    sendChatAction(token, chatId, 'upload_photo').catch(() => { });
                    await handleGetPhotos({ unit_id: String(unit.id) }, token, chatId).catch(e => console.error("Error sending photo for", unit.id, e));
                }
            }
        }

        console.log("[Bot] Turn complete.");

    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        const errorDetail = globalErr.message ? `: ${globalErr.message}` : "";
        await sendMessage(token, chatId, `Произошла системная ошибка${errorDetail}. Мы уже чиним!`).catch(() => { });
    }
}
