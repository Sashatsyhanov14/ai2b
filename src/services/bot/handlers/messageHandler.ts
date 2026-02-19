import { askLLM } from "@/lib/openrouter";
import { sendMessage } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { SYSTEM_PROMPT } from "../ai/prompts";
import { LlmPayload, SearchArgs, SaveLeadArgs, GetPhotosArgs } from "../types";

// The Hands
import { handleSearchDatabase } from "../actions/search";
import { handleSaveLead } from "../actions/leads";
import { handleGetPhotos } from "../actions/photos";
import { handleGetAgencyInfo } from "../actions/agency";

// Helper to detect language from recent history
function detectLanguage(history: any[]): string {
    const recentUserMsgs = history.filter(m => m.role === 'user').slice(-3);
    const text = recentUserMsgs.map(m => m.content).join(" ").toLowerCase();

    // Simple heuristic
    if (/[а-яА-ЯёЁ]/.test(text)) return "Russian";
    if (/[ğüşıöçĞÜŞİÖÇ]/.test(text)) return "Turkish";
    if (text.includes("merhaba") || text.includes("selam")) return "Turkish";
    return "Russian"; // Default to Russian if unsure/mixed
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
        // Fetch dynamic instructions
        const supabase = getServerClient();
        const { data: instructions } = await supabase
            .from('bot_instructions')
            .select('text')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        let dynamicPrompt = SYSTEM_PROMPT;
        if (instructions && instructions.length > 0) {
            const rules = instructions.map((r: any) => `- ${r.text}`).join("\n");
            dynamicPrompt += `\n\n### DASHBOARD INSTRUCTIONS (CRITICAL)\nThe following are strict rules from the agency dashboard:\n${rules}`;
        }

        const messages: any[] = [{ role: "system", content: dynamicPrompt }];
        const history = await listMessages(sessionId, 10);
        const sortedHistory = (history || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        for (const msg of sortedHistory) {
            if (msg.role === 'system') continue;
            messages.push({ role: msg.role, content: msg.content || "" });
        }

        // Safety check: is the last message 'text'?
        const lastMsg = sortedHistory[sortedHistory.length - 1];
        if (!lastMsg || lastMsg.content !== text) {
            messages.push({ role: "user", content: text });
        }

        // DETECT LANGUAGE
        const userLang = detectLanguage(messages);
        console.log(`[Bot] Detected Language: ${userLang}`);

        // 3. BRAIN: "THINK" (Start of ReAct Loop)
        let loopCount = 0;
        const MAX_LOOPS = 5;
        let finalUserReply = "";

        while (loopCount < MAX_LOOPS) {
            loopCount++;
            console.log(`[Bot] Turn ${loopCount}: Asking Brain...`);

            // FORCE LANGUAGE INJECTION EVERY TURN
            const currentMessages = [...messages, {
                role: "system",
                content: `(SYSTEM AUTO-INJECTION) The user is speaking ${userLang}. YOU MUST REPLY IN ${userLang}. DO NOT SWITCH LANGUAGES.`
            }];

            const llmResponse = await askLLM(currentMessages);
            console.log(`[Bot] Turn ${loopCount}: Brain said:`, llmResponse);

            // Parse Response
            let payload: LlmPayload = {};
            try {
                const cleanJson = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
                const start = cleanJson.indexOf("{");
                const end = cleanJson.lastIndexOf("}");
                if (start >= 0 && end >= 0) {
                    payload = JSON.parse(cleanJson.substring(start, end + 1));
                } else {
                    payload = { reply: llmResponse, actions: [] };
                }
            } catch (e: any) {
                console.error("JSON Parse Error:", e, "Raw:", llmResponse);
                payload = { reply: llmResponse, actions: [] };
            }

            // Send Text Reply (Intermediate or Final)
            if (payload.reply) {
                await sendMessage(token, chatId, payload.reply);
                await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: payload.reply });
                finalUserReply = payload.reply;
            }

            // Check for Actions
            if (!payload.actions || payload.actions.length === 0) {
                console.log("[Bot] No actions. Turn complete.");
                break;
            }

            // Add to history
            messages.push({ role: "assistant", content: JSON.stringify(payload) });

            // Execute Tools
            const toolOutputs = [];
            let photosFound = false;

            for (const action of payload.actions) {
                console.log(`[Bot] Tool Call: ${action.tool}`);
                let result = "";
                try {
                    if (action.tool === "search_database") {
                        result = await handleSearchDatabase(action.args as SearchArgs);
                    } else if (action.tool === "save_lead") {
                        result = await handleSaveLead(action.args as SaveLeadArgs, chatId, userInfo.username);
                    } else if (action.tool === "get_photos") {
                        result = await handleGetPhotos(action.args as GetPhotosArgs, token, chatId);
                        photosFound = true;
                    } else if (action.tool === "get_agency_info") {
                        result = await handleGetAgencyInfo();
                    } else {
                        result = "Error: Unknown tool " + (action as any).tool;
                    }
                } catch (err: any) {
                    console.error(`Tool Fail: ${(action as any).tool}`, err);
                    result = JSON.stringify({ status: "error", message: err.message });
                }
                toolOutputs.push(`Tool '${action.tool}' output: ${result}`);
            }

            // Observation
            const toolFeedback = toolOutputs.join("\n\n");
            let systemInjection = "";

            if (toolFeedback.includes('"count":') && !toolFeedback.includes('"count":0') && !photosFound) {
                systemInjection = "\n\nCRITICAL: You found units. NOW YOU MUST CALL get_photos(unit_id) for the BEST matching unit ID from the list. DO NOT ASK. JUST CALL IT.";
            }

            // RE-INJECT LANGUAGE REMINDER IN TOOL RESULTS TOO
            systemInjection += `\n\nREMINDER: USER LANGUAGE IS ${userLang}. REPLY IN ${userLang}.`;

            messages.push({ role: "user", content: `Tool Results:\n${toolFeedback}${systemInjection}` });
        }
    } catch (globalErr: any) {
        console.error("CRITICAL MESSAGE HANDLER ERROR:", globalErr);
        await sendMessage(token, chatId, "Произошла ошибка. Попробуйте еще раз.");
    }
}
