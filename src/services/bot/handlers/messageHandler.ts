import { askLLM } from "@/lib/openrouter";
import { sendMessage } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { SYSTEM_PROMPT } from "../ai/prompts";
import { LlmPayload, SearchArgs, SaveLeadArgs, GetPhotosArgs } from "../types";

// The Hands (Tools)
import { handleSearchDatabase } from "../actions/search";
import { handleSaveLead } from "../actions/leads";
import { handleGetPhotos } from "../actions/photos";
import { handleGetDescription } from "../actions/description";
import { handleGetAgencyInfo } from "../actions/agency";

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

        // 2. Build Context (Code = Pipe: just fetch data and pass to LLM)
        const supabase = getServerClient();
        const { data: instructions } = await supabase
            .from('bot_instructions')
            .select('text')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        let dynamicPrompt = SYSTEM_PROMPT;
        if (instructions && instructions.length > 0) {
            const rules = instructions.map((r: any) => `- ${r.text}`).join("\n");
            dynamicPrompt += `\n\n### DASHBOARD INSTRUCTIONS (CRITICAL)\n${rules}`;
        }

        // Add user language_code from Telegram as context for LLM
        const langHint = userInfo.language_code || "ru";
        dynamicPrompt += `\n\n<USER_CONTEXT>Telegram language_code: ${langHint}</USER_CONTEXT>`;

        const messages: any[] = [{ role: "system", content: dynamicPrompt }];

        // Load history
        const history = await listMessages(sessionId, 10);
        const sortedHistory = (history || []).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (const msg of sortedHistory) {
            if (msg.role === 'system') continue;
            messages.push({ role: msg.role, content: msg.content || "" });
        }

        // Avoid duplicate of current message
        const lastMsg = sortedHistory[sortedHistory.length - 1];
        if (!lastMsg || lastMsg.content !== text) {
            messages.push({ role: "user", content: text });
        }

        // 3. THE LOOP: LLM decides everything. Code just routes.
        let loopCount = 0;
        const MAX_LOOPS = 5;

        let searchCalledThisLoop = false; // Track if real data was fetched

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            console.log(`[Bot] Turn ${loopCount}: Asking LLM...`);

            const llmResponse = await askLLM(messages);
            console.log(`[Bot] Turn ${loopCount}: LLM said:`, llmResponse);

            // Parse JSON response
            let payload: LlmPayload = {};
            try {
                const clean = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
                const start = clean.indexOf("{");
                const end = clean.lastIndexOf("}");
                if (start >= 0 && end >= 0) {
                    payload = JSON.parse(clean.substring(start, end + 1));
                } else {
                    payload = { reply: llmResponse, actions: [] };
                }
            } catch (e: any) {
                console.error("JSON Parse Error:", e.message, "Raw:", llmResponse);
                payload = { reply: llmResponse, actions: [] };
            }

            console.log(`[Bot] Parsed: reply="${payload.reply?.substring(0, 50) || ""}..." actions=${JSON.stringify(payload.actions)}`);

            // GUARDRAIL: If LLM presents apartments (🏠) without search in this loop, force search
            const hasApartmentPresentation = payload.reply && payload.reply.includes("🏠");
            const hasSearchAction = payload.actions?.some((a: any) => a.tool === "search_database");

            if (hasApartmentPresentation && !searchCalledThisLoop && !hasSearchAction) {
                console.log("[Bot] GUARDRAIL: LLM hallucinated apartments without search. Forcing search...");
                payload.reply = "";
                payload.actions = [{ tool: "search_database", args: {} }];
            }

            // GUARDRAIL: Strip multiple apartments — only allow 1 per reply
            if (payload.reply) {
                const apartmentMarkers = (payload.reply.match(/🏠/g) || []).length;
                if (apartmentMarkers > 1) {
                    console.log("[Bot] GUARDRAIL: Multiple apartments in reply. Trimming to first.");
                    const firstIdx = payload.reply.indexOf("🏠");
                    const secondIdx = payload.reply.indexOf("🏠", firstIdx + 1);
                    payload.reply = payload.reply.substring(0, secondIdx).trim();
                }
            }

            // Decide if we should send this reply to the user
            const hasActions = payload.actions && payload.actions.length > 0;
            const isPhotosCombo = hasActions && payload.actions!.some((a: any) => a.tool === "get_photos");
            const shouldSend = !hasActions || isPhotosCombo;

            if (payload.reply && payload.reply.trim().length > 0 && shouldSend) {
                await sendMessage(token, chatId, payload.reply);
                await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: payload.reply });
            }

            // No actions = conversation turn complete
            if (!hasActions) {
                console.log("[Bot] No actions. Done.");
                break;
            }

            // PIPE: Execute tool calls from LLM
            messages.push({ role: "assistant", content: JSON.stringify(payload) });
            const toolOutputs = [];

            for (const action of payload.actions ?? []) {
                console.log(`[Bot] Executing tool: ${action.tool}`, JSON.stringify(action.args));
                let result = "";
                try {
                    if (action.tool === "search_database") {
                        result = await handleSearchDatabase(action.args as SearchArgs);
                        searchCalledThisLoop = true;
                    } else if (action.tool === "save_lead") {
                        result = await handleSaveLead(action.args as SaveLeadArgs, chatId, userInfo.username);
                    } else if (action.tool === "get_photos") {
                        result = await handleGetPhotos(action.args as GetPhotosArgs, token, chatId);
                    } else if (action.tool === "get_unit_description") {
                        result = await handleGetDescription(action.args as any);
                    } else if (action.tool === "get_agency_info") {
                        result = await handleGetAgencyInfo();
                    } else {
                        result = JSON.stringify({ status: "error", message: "Unknown tool: " + (action as any).tool });
                    }
                } catch (err: any) {
                    console.error(`[Bot] Tool error: ${(action as any).tool}`, err.message);
                    result = JSON.stringify({ status: "error", message: err.message });
                }
                console.log(`[Bot] Tool result (${action.tool}):`, result.substring(0, 200));
                toolOutputs.push(`Tool '${action.tool}' result: ${result}`);
            }
            // If photos were sent, this is the final step. Stop the loop.
            if (isPhotosCombo) {
                console.log("[Bot] Photos sent. Presentation complete.");
                break;
            }

            // PIPE: Return tool results to LLM for next turn.
            const toolFeedback = toolOutputs.join("\n\n");
            messages.push({ role: "user", content: `<tool_results>\n${toolFeedback}\n</tool_results>` });
        }
    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        await sendMessage(token, chatId, "Произошла ошибка. Попробуйте еще раз.");
    }
}
