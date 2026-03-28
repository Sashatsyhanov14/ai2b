import { sendMessage, sendChatAction } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { runAnalyzerAgent, runSaleWriterAgent, runClientTranslatorAgent, RoleMessage } from "../ai/agents";
import { handleSearchDatabase } from "../actions/search";
import { handleSaveLead } from "../actions/leads";
import { handleGetPhotos } from "../actions/photos";
import { handleGetAgencyInfo } from "../actions/agency";

function escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        const rules = "Общайся вежливо, показывай максимум 1 вариант объекта зараз. Ты эксперт недвижимости.";
        
        const { data: faqRows } = await supabase.from('faq').select('question, answer, i18n').order('sort_order', { ascending: true });
        const companyInfoStr = faqRows?.map(r => `Вопрос: ${r.i18n?.ru?.question || r.question}\nОтвет: ${r.i18n?.ru?.answer || r.answer}`).join("\n\n") || "";
        const agencyFiles = await handleGetAgencyInfo(userInfo.language_code || "ru");

        const botKnowledge = `[ПРАВИЛА]:\n${rules}\n\n[О КОМПАНИИ]:\n${companyInfoStr}\n\n[ФАЙЛЫ]:\n${agencyFiles}`;

        const history = await listMessages(sessionId, 10);
        const sortedHistory = (history || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const messages: RoleMessage[] = [];
        for (const msg of sortedHistory) {
            if (msg.role === 'system' || !msg.content) continue;
            messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
        }

        const lastMsg = sortedHistory[sortedHistory.length - 1];
        if (!lastMsg || lastMsg.content !== text) {
            messages.push({ role: "user", content: text });
        }

        // ==========================================
        // 3. ORCHESTRATOR (7-AGENT PIPELINE)
        // ==========================================
        sendChatAction(token, chatId, 'typing').catch(() => {});
        const plan = await runAnalyzerAgent(messages, botKnowledge);
        console.log(`[Bot] Orchestrator Plan:`, JSON.stringify(plan));

        let propertyContext = "База недвижимости не запрашивалась.";
        let leadContext = "";
        let unitsFound: any[] = [];
        let finalReplyText = "";

        // A. SEARCH AGENT
        if (plan.search_agent) {
            console.log("[Bot] 🔍 SEARCH AGENT TRIGGERED");
            let intent = plan.search_agent.transaction_type === "rent" ? "rent" : "sale";
            if (plan.search_agent.category === "land") intent = "land";
            if (plan.search_agent.category === "commercial") intent = "commercial";
            
            const searchParams = { ...plan.search_agent, intent };
            
            const searchTasks = [
                searchParams, 
                { ...searchParams, rooms: undefined }, 
                { ...searchParams, rooms: undefined, price_max: searchParams.price_max ? searchParams.price_max * 1.5 : undefined }
            ];

            for (let task of searchTasks) {
                try {
                    const rawResult = await handleSearchDatabase(task);
                    const parsed = JSON.parse(rawResult);

                    if (parsed.units && parsed.units.length > 0) {
                        const assistantHistory = messages.filter(m => m.role === "assistant").map(m => m.content).join(" ");
                        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
                        const shownIds = Array.from(assistantHistory.matchAll(uuidRegex)).map((m: any) => m[0]);

                        const newUnits = parsed.units.filter((u: any) => !shownIds.includes(u.id));
                        if (newUnits.length > 0) {
                            unitsFound = newUnits;
                            break;
                        } else if (parsed.units.length > 0) {
                            unitsFound = parsed.units;
                            break;
                        }
                    }
                } catch (e: any) {}
            }

            if (unitsFound.length > 0) {
                // ПРАВИЛО: ТОЛЬКО 1 ВАРИАНТ ЗА РАЗ
                propertyContext = JSON.stringify(unitsFound.slice(0, 1), null, 2);
            } else {
                propertyContext = "[ВНИМАНИЕ: ОБЪЕКТЫ ПО ЗАПРОСУ НЕ НАЙДЕНЫ. Скажи клиенту, что точных совпадений нет, и предложи альтернативу.]";
            }
        }

        // B. LEAD EXTRACTOR
        if (plan.lead_extractor_agent) {
            console.log("[Bot] 💼 LEAD EXTRACTOR TRIGGERED");
            const ext = plan.lead_extractor_agent;
            leadContext = `[ПРОФИЛЬ КЛИЕНТА]: ${ext.client_profile || "Неизвестно"}. Бюджет: ${ext.budget || "Не указан"}. Температура: ${ext.lead_temperature || "warm"}`;
            
            handleSaveLead({ 
                phone: ext.client_phone || userInfo.phone || "Unknown", 
                name: ext.client_name || userInfo.fullName || userInfo.username || "Client", 
                info: ext.client_profile || "Аналитика диалога", 
                budget: ext.budget, 
                temperature: ext.lead_temperature || "warm", 
                language: userInfo.language_code || "ru", 
                purpose: "НЕДВИЖИМОСТЬ"
            } as any, chatId, userInfo.username).catch(e => console.error("[Bot] Save Lead Error:", e));
        }

        // C. NOTIFIER AGENT
        if (plan.notifier_agent) {
            console.log("[Bot] 🚨 NOTIFIER AGENT TRIGGERED");
            const { data: managers } = await supabase.from("telegram_managers").select("telegram_id").eq("is_active", true);
            if (managers && managers.length > 0) {
                const name = userInfo.fullName || userInfo.username || "Client";
                const alertMsg = `🔥 <b>ВНИМАНИЕ МЕНЕДЖЕРАМ! (ИИ-БОТ)</b> 🔥\n\n👤 Пользователь: @${userInfo.username || chatId}\n👤 Имя: ${escapeHtml(name)}\n💬 Причина: ${escapeHtml(plan.notifier_agent.alert_reason || "Вызов менеджера")}`;
                for (const m of managers) {
                    if (m.telegram_id) {
                        sendMessage(token, m.telegram_id, alertMsg, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "В дашборд ↗️", url: "https://ai2b.app/app/leads" }]] } }).catch(() => {});
                    }
                }
            }
        }

        // D. PHOTO AGENT (Auto or Manual)
        if (plan.photo_agent?.target_unit_uuid) {
            console.log("[Bot] 📸 PHOTO AGENT TRIGGERED (Explicit UUID)");
            sendChatAction(token, chatId, 'upload_photo').catch(() => {});
            await handleGetPhotos({ unit_id: plan.photo_agent.target_unit_uuid }, token, chatId).catch(e => console.error(e));
        } else if (plan.search_agent && unitsFound.length > 0) {
            // Auto dispatch photo for the 1 shown property
            console.log("[Bot] 📸 PHOTO AGENT (Auto Trigger for found unit)");
            const displayedUnit = unitsFound[0];
            if (displayedUnit.id) {
                sendChatAction(token, chatId, 'upload_photo').catch(() => {});
                await handleGetPhotos({ unit_id: String(displayedUnit.id) }, token, chatId).catch(e => console.error(e));
            }
        }

        // E. WRITER AGENT
        if (plan.writer_agent) {
            console.log("[Bot] ✍️ WRITER AGENT TRIGGERED");
            sendChatAction(token, chatId, 'typing').catch(() => {});
            
            let wInstruction = plan.writer_agent.instruction || "Ответь на вопросы клиента.";
            if (unitsFound.length > 0) {
                wInstruction = `ВНИМАНИЕ: ОБЪЕКТ НАЙДЕН! 1) ОТВЕТЬ клиенту; 2) ПРЕЗЕНТУЙ 1 объект из базы; 3) Задай вовлекающий вопрос (CTA).\n\n${wInstruction}`;
            }

            const combinedInstruction = `[ИНСТРУКЦИЯ]: ${wInstruction}\n${leadContext}`;
            // Use the unified SaleWriter logic for crafting the response natively in ru/en
            finalReplyText = await runSaleWriterAgent(messages, combinedInstruction, propertyContext);
        } else {
            // Orchestrator fallback
            finalReplyText = "Секунду, я проверяю информацию...";
        }

        // F. TRANSLATOR AGENT
        if (finalReplyText) {
            console.log("[Bot] 🌍 TRANSLATOR AGENT TRIGGERED");
            const targetLang = userInfo.language_code || "ru"; 
            try {
                finalReplyText = await runClientTranslatorAgent(finalReplyText, targetLang, messages);
            } catch (translError) {
                console.error("[Bot] Translation error, running fallback base text.", translError);
            }
        }

        // G. FINAL SEND
        if (finalReplyText) {
            console.log("[Bot] Sending final text to Telegram...");
            await sendMessage(token, chatId, finalReplyText);

            let dbStoreText = finalReplyText;
            if (plan.search_agent && unitsFound.length > 0) {
                dbStoreText += `\n\n[HIDDEN_SYSTEM_ID: ${unitsFound[0].id}]`;
            }
            // If the user explicitly requested photos, keep the uuid history active too if not found
            if (plan.photo_agent?.target_unit_uuid && unitsFound.length === 0) {
                dbStoreText += `\n\n[HIDDEN_SYSTEM_ID: ${plan.photo_agent.target_unit_uuid}]`;
            }
            await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: dbStoreText });
        }

        console.log("[Bot] Turn complete.");

    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        const errorDetail = globalErr.message ? `: ${globalErr.message}` : "";
        await sendMessage(token, chatId, `Произошла системная ошибка${errorDetail}. Мы уже чиним!`).catch(() => { });
    }
}
