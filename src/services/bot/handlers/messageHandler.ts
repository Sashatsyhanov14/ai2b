import { sendMessage, sendChatAction } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { runAnalyzerAgent, runSaleWriterAgent, runRentWriterAgent, runLandWriterAgent, RoleMessage } from "../ai/agents";

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

        const botKnowledge = `[ПРАВИЛА КОМПАНИИ]:
${rules}

[О КОМПАНИИ]:
${companyInfoStr}

[МНЕНИЯ/ФАЙЛЫ КОМПАНИИ]:
${agencyFiles}`;

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
        console.log(`[Bot] Executing Analyzer Agent...`);
        sendChatAction(token, chatId, 'typing').catch(() => { });
        const analyzerInstruction = await runAnalyzerAgent(messages, botKnowledge);
        console.log(`[Bot] Analyzer decision:`, JSON.stringify(analyzerInstruction));

        // DEBUG OUTPUT FOR USER
        await sendMessage(token, chatId, `<pre>DEBUG JSON:\n${JSON.stringify(analyzerInstruction, null, 2)}</pre>`, { parse_mode: "HTML" }).catch(()=>{});

        let unitsFound: any[] = [];
        let finalReplyText = "";
        
        // ==========================================
        // 1. EXTRACT SEARCH PARAMS
        // ==========================================
        let searchParams: any = null;
        let activeIntent = analyzerInstruction.writer_agent?.intent || "general";
        
        if (analyzerInstruction.search_sale_agent) {
            searchParams = analyzerInstruction.search_sale_agent;
            searchParams.intent = "sale";
            activeIntent = "sale";
        } else if (analyzerInstruction.search_rent_agent) {
            searchParams = analyzerInstruction.search_rent_agent;
            searchParams.intent = "rent";
            activeIntent = "rent";
            searchParams.rooms = searchParams.bedrooms != null ? String(searchParams.bedrooms) : undefined;
            searchParams.price = searchParams.price_per_month || undefined;
        } else if (analyzerInstruction.search_land_agent) {
            searchParams = analyzerInstruction.search_land_agent;
            searchParams.intent = "land";
            activeIntent = "land";
        } else if (analyzerInstruction.search_commercial_agent) {
            searchParams = analyzerInstruction.search_commercial_agent;
            searchParams.intent = "commercial";
            activeIntent = "commercial";
        }

        // ==========================================
        // 2. RUN RAG AGENT (Database Info Retrieval)
        // ==========================================
        let ragResponse = "Специфических запросов RAG не требовалось.";
        if (analyzerInstruction.rag_agent && analyzerInstruction.rag_agent.rag_query) {
            console.log("[Bot] 🧠 RAG AGENT TRIGGERED for query:", analyzerInstruction.rag_agent.rag_query);
            ragResponse = await require("../ai/agents").runRagAgent(analyzerInstruction.rag_agent.rag_query, botKnowledge);
        }

        // ==========================================
        // 3. RUN SEARCH EXECUTOR
        // ==========================================
        if (searchParams) {
            console.log("[Bot] 🔍 SEARCH EXECUTOR TRIGGERED for", activeIntent);
            const baseParams = searchParams;
            const searchTasks = [
                baseParams, 
                { ...baseParams, rooms: undefined }, 
                { ...baseParams, rooms: undefined, price: baseParams.price ? baseParams.price * 1.5 : undefined }
            ];

            for (let i = 0; i < searchTasks.length; i++) {
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
                            break;
                        } else if (parsed.units.length > 0) {
                            unitsFound = parsed.units;
                            break;
                        }
                    }
                } catch (e: any) {}
            }
        }

        // ==========================================
        // 4. RUN WRITER AGENT (Base Response Generation)
        // ==========================================
        let dbData = "База недвижимости не запрашивалась.";
        if (searchParams) {
            dbData = unitsFound.length > 0
                ? JSON.stringify(unitsFound.slice(0, 1), null, 2)
                : "[ВНИМАНИЕ: ОБЪЕКТЫ ПО ЗАПРОСУ НЕ НАЙДЕНЫ. Не придумывай. Скажи, что объектов нет.]";
        }


        if (analyzerInstruction.writer_agent) {
            console.log("[Bot] ✍️ WRITER AGENT TRIGGERED for intent:", activeIntent);
            let customInstruction = analyzerInstruction.writer_agent.instruction || "Общайся вежливо.";
            
            if (activeIntent === "rent" && searchParams && unitsFound.length > 0) {
                const unit = unitsFound[0];
                const startD = searchParams.start_date;
                const endD = searchParams.end_date;
                if (startD && endD && unit.price_per_day) {
                    const days = Math.round((new Date(endD).getTime() - new Date(startD).getTime()) / 86400000);
                    if (days > 0) {
                        const totalCost = days * unit.price_per_day;
                        customInstruction = `РАСЧЁТ: Клиент просил ${startD} - ${endD} (${days} дн). ИТОГО: ${totalCost} €. ОБРЕЗУЙ ЦЕНУ!\n\n${customInstruction}`;
                    }
                }
            }

            if (unitsFound.length > 0) {
                customInstruction = `ВНИМАНИЕ: ОБЪЕКТ НАЙДЕН! 1) ОТВЕТЬ клиенту; 2) ПРЕЗЕНТУЙ объект; 3) ЗАКРОЙ (CTA - возьми номер!).\n\n${customInstruction}`;
            }

            const combinedInstruction = `[ИНСТРУКЦИЯ]: ${customInstruction}\n\n[ДАННЫЕ ОТ RAG-АГЕНТА (База Знаний)]:\n${ragResponse}`;
            
            // Generate the base text in generic language (usually RU or EN depending on history)
            sendChatAction(token, chatId, 'typing').catch(() => { });
            if (activeIntent === "rent") {
                finalReplyText = await require("../ai/agents").runRentWriterAgent(messages, combinedInstruction, dbData);
            } else if (activeIntent === "land") {
                finalReplyText = await require("../ai/agents").runLandWriterAgent(messages, combinedInstruction, dbData);
            } else {
                finalReplyText = await require("../ai/agents").runSaleWriterAgent(messages, combinedInstruction, dbData);
            }
        } else {
            // Fallback if DeepSeek hallucinates missing writer
            finalReplyText = "Спасибо за ваш запрос! Минуту, я проверяю данные...";
        }

        // ==========================================
        // 5. RUN CLIENT TRANSLATOR AGENT (Localization)
        // ==========================================
        if (finalReplyText && analyzerInstruction.client_translator_agent) {
            console.log("[Bot] 🌍 CLIENT TRANSLATOR AGENT TRIGGERED");
            const targetLang = analyzerInstruction.client_translator_agent.target_language || userInfo.language_code || "ru";
            finalReplyText = await require("../ai/agents").runClientTranslatorAgent(finalReplyText, targetLang, messages);
        }

        // ==========================================
        // 6. SYNCHRONOUS MEDIA DISPATCH (Photos arrive before text)
        // ==========================================
        if (searchParams && unitsFound.length > 0) {
            console.log("[Bot] 📸 PHOTO AGENT (Auto Trigger)");
            const displayedUnits = unitsFound.slice(0, 1);
            for (const unit of displayedUnits) {
                if (unit.id) {
                    sendChatAction(token, chatId, 'upload_photo').catch(() => { });
                    await handleGetPhotos({ unit_id: String(unit.id) }, token, chatId).catch(e => console.error(e));
                }
            }
        } else if (analyzerInstruction.photo_agent && analyzerInstruction.photo_agent.send_photos) {
            console.log("[Bot] 📸 PHOTO AGENT (Explicit Instruction)");
            // In case the agent explicitly asked for photos of the last known unit but didn't trigger search
            const assistantHistory = messages.filter((m: any) => m.role === "assistant").map((m: any) => m.content).join(" ");
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
            const shownIds = Array.from(assistantHistory.matchAll(uuidRegex)).map((m: any) => m[0]);
            if (shownIds.length > 0) {
                await handleGetPhotos({ unit_id: String(shownIds[shownIds.length - 1]) }, token, chatId).catch(e => console.error(e));
            }
        }

        // ==========================================
        // 7. OUTPUT TO USER
        // ==========================================
        if (finalReplyText) {
            console.log("[Bot] Sending final text to Telegram...");
            await sendMessage(token, chatId, finalReplyText);

            let dbStoreText = finalReplyText;
            if (searchParams && unitsFound.length > 0) {
                const shownIdsString = unitsFound.slice(0, 1).map((u: any) => `[HIDDEN_SYSTEM_ID: ${u.id}]`).join("\n");
                dbStoreText += `\n\n${shownIdsString}`;
            }
            await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: dbStoreText });
        }

        // ==========================================
        // 8. ASYNC BACKGROUND AGENTS (Leads, Bookings)
        // ==========================================
        // Lead Extractors
        const saleExtractor = analyzerInstruction.lead_extractor_sale_agent;
        const rentExtractor = analyzerInstruction.lead_extractor_rent_agent;
        const extractor = saleExtractor || rentExtractor;
        
        if (extractor) {
            console.log("[Bot] 💼 LEAD EXTRACTOR TRIGGERED");
            const phone = extractor.client_phone || userInfo.phone || "Unknown";
            const name = extractor.client_name || userInfo.fullName || userInfo.username || "Client";
            const temp = extractor.lead_temperature || "warm";
            const lang = analyzerInstruction.client_translator_agent?.target_language || "ru";
            const purpose = extractor.purpose || (rentExtractor ? "АРЕНДА" : "ПОКУПКА");
            
            // Save lead
            await handleSaveLead({ 
                phone, name, info: extractor.manager_alert_reason || "Аналитика диалога", 
                budget: extractor.budget, temperature: temp, language: lang, purpose,
                start_date: rentExtractor?.start_date, end_date: rentExtractor?.end_date, guests: rentExtractor?.guests
            } as any, chatId, userInfo.username).catch(e => console.error("[Bot] Save Lead Error:", e));

            // Alert Managers
            if (temp === "warm" || temp === "hot") {
                const { data: managers } = await supabase.from("telegram_managers").select("telegram_id, preferred_lang").eq("is_active", true);
                if (managers && managers.length > 0) {
                    const alertMsg = `🔥 <b>ВНИМАНИЕ МЕНЕДЖЕРАМ! (ИИ-БОТ)</b> 🔥\n\n👤 Пользователь: @${userInfo.username || chatId}\n👤 Имя: ${escapeHtml(name)}\n📞 Контакт: ${phone !== "Unknown" ? escapeHtml(phone) : "Не оставил"}\n💬 Инфо: ${escapeHtml(extractor.manager_alert_reason || "Лид из бота")}`;
                    for (const m of managers) {
                        if (m.telegram_id) {
                            await sendMessage(token, m.telegram_id, alertMsg, {
                                parse_mode: "HTML",
                                reply_markup: { inline_keyboard: [[{ text: "В дашборд ↗️", url: "https://ai2b.app/app/leads" }]] }
                            }).catch(() => {});
                        }
                    }
                }
            }

            // Booking Agent
            if (analyzerInstruction.booking_agent && unitsFound.length > 0 && rentExtractor?.start_date && rentExtractor?.end_date) {
                console.log("[Bot] 📅 BOOKING AGENT TRIGGERED");
                try {
                    const rentalUnit = unitsFound[0];
                    const { data: existing } = await supabase.from("rental_bookings").select("id")
                        .eq("unit_id", rentalUnit.id).eq("start_date", rentExtractor.start_date).eq("end_date", rentExtractor.end_date)
                        .neq("status", "cancelled").maybeSingle();

                    if (!existing) {
                        await supabase.from("rental_bookings").insert({
                            unit_id: rentalUnit.id,
                            start_date: rentExtractor.start_date, end_date: rentExtractor.end_date,
                            guest_name: name !== "Unknown" ? name : null, guest_phone: phone !== "Unknown" ? phone : null,
                            status: "pending", notes: `Авто-запрос из бота. @${userInfo.username || chatId}.`
                        });
                        console.log(`[Bot] Pending booking created for unit ${rentalUnit.id}`);
                    }
                } catch (bookErr) { console.error("[Bot] Pending booking failed:", bookErr); }
            }
        }

        console.log("[Bot] Turn complete.");

    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        const errorDetail = globalErr.message ? `: ${globalErr.message}` : "";
        await sendMessage(token, chatId, `Произошла системная ошибка${errorDetail}. Мы уже чиним!`).catch(() => { });
    }
}
