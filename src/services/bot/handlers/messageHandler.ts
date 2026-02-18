import { askLLM } from "@/lib/openrouter";
import { sendMessage } from "@/lib/telegram";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { SYSTEM_PROMPT } from "../ai/prompts";
import { LlmPayload, SearchArgs, SaveLeadArgs, GetPhotosArgs } from "../types";

// The Hands
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
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    const history = await listMessages(sessionId, 10);
    const sortedHistory = (history || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const msg of sortedHistory) {
        if (msg.role === 'system') continue;
        messages.push({ role: msg.role, content: msg.content || "" });
    }

    // Add current message (already in history? No, listMessages might not have it if we just added it, 
    // actually appendMessage ADDS it to DB. So sortedHistory SHOULD have it.
    // BUT listMessages might be slightly cached or eventual consistent? 
    // Let's rely on sortedHistory having it if we just awaited appendMessage.
    // WAIT: appendMessage inserts into DB. listMessages fetches from DB.
    // So 'text' is likely at the end of sortedHistory.
    // IF NOT, we should verify. 
    // Safety check: is the last message 'text'?
    const lastMsg = sortedHistory[sortedHistory.length - 1];
    if (!lastMsg || lastMsg.content !== text) {
        // If for some reason DB didn't return it yet, push it manually to context
        messages.push({ role: "user", content: text });
    }

    // 3. BRAIN: "THINK" (Start of ReAct Loop)
    let loopCount = 0;
    const MAX_LOOPS = 5;
    let finalUserReply = "";

    while (loopCount < MAX_LOOPS) {
        loopCount++;
        console.log(`[Bot] Turn ${loopCount}: Asking Brain...`);

        const llmResponse = await askLLM(messages);
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
                // Should not happen with good prompt, but fallback
                payload = { reply: llmResponse, actions: [] };
            }
        } catch (e) {
            console.error("JSON Parse Error:", e);
            payload = { reply: llmResponse, actions: [] };
        }

        // Send Text Reply (Intermediate or Final)
        if (payload.reply) {
            await sendMessage(token, chatId, payload.reply);
            await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: payload.reply });
            finalUserReply = payload.reply; // Track last reply
        }

        // Check for Actions
        if (!payload.actions || payload.actions.length === 0) {
            console.log("[Bot] No actions. Turn complete.");
            break; // No more tools, we are done
        }

        // Add Assistant's "Thought/Call" to history
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

        // Critical: If we just searched and found stuff, FORCE photos next context
        if (toolFeedback.includes('"count":') && !toolFeedback.includes('"count":0') && !photosFound) {
            systemInjection = "\n\nCRITICAL: You found units. NOW YOU MUST CALL get_photos(unit_id) for the best option. DO NOT ASK. JUST CALL IT.";
        }

        // Critical: Maintain Language
        systemInjection += "\n\nREMINDER: REPLY IN THE USER'S LANGUAGE.";

        messages.push({ role: "user", content: `Tool Results:\n${toolFeedback}${systemInjection}` });

        // Loop continues to next iteration to let Brain process the results
    }
}

