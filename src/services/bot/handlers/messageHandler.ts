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

    // 3. BRAIN: "THINK"
    console.log("[Bot] Asking Brain...");
    const llmResponse = await askLLM(messages);
    console.log("[Bot] Brain said:", llmResponse);

    // 4. HANDS: Parse & Act
    let payload: LlmPayload = {};
    try {
        const cleanJson = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const start = cleanJson.indexOf("{");
        const end = cleanJson.lastIndexOf("}");
        if (start >= 0 && end >= 0) {
            payload = JSON.parse(cleanJson.substring(start, end + 1));
        } else {
            // Fallback: AI didn't listen and sent text. Treat as reply.
            payload = { reply: llmResponse, actions: [] };
        }
    } catch (e) {
        console.error("JSON Parse Error:", e);
        payload = { reply: llmResponse, actions: [] };
    }

    // If AI wants to say something immediately (e.g. "One moment..."), send it.
    // BUT usually ReAct waits for tools. The prompt says "reply" is optional.
    if (payload.reply) {
        await sendMessage(token, chatId, payload.reply);
        await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: payload.reply });
    }

    // Execute Tools
    if (payload.actions && payload.actions.length > 0) {
        const toolOutputs = [];

        for (const action of payload.actions) {
            console.log(`[Bot] Tool Call: ${action.tool}`);
            let result = "";
            try {
                if (action.tool === "search_database") {
                    result = await handleSearchDatabase(action.args as SearchArgs);
                } else if (action.tool === "save_lead") {
                    // We inject phone/name if not provided by AI, or trust AI?
                    // The AI *should* extract it. But if it misses phone, we might have it in userInfo?
                    // Let's pass args as is, but maybe enhance with system info if needed?
                    // prompt says: save_lead(phone, name)
                    result = await handleSaveLead(action.args as SaveLeadArgs, chatId, userInfo.username);
                } else if (action.tool === "get_photos") {
                    // Update: pass token/chatId for native sending
                    result = await handleGetPhotos(action.args as GetPhotosArgs, token, chatId);
                } else {
                    result = "Error: Unknown tool " + (action as any).tool;
                }
            } catch (err: any) {
                console.error(`Tool Fail: ${(action as any).tool}`, err);
                result = JSON.stringify({ status: "error", message: err.message });
            }
            toolOutputs.push(`Tool '${action.tool}' output: ${result}`);
        }

        // 5. OBSERVATION -> BRAIN
        // Feed tool outputs back to AI to generate final natural response
        const toolFeedback = toolOutputs.join("\n\n");

        // Add the tool execution interaction to history context for this turn
        messages.push({ role: "assistant", content: JSON.stringify(payload) });
        messages.push({ role: "user", content: `Tool Results:\n${toolFeedback}\n\nNow write a response to the user.` });

        console.log("[Bot] Feeding back tool results...");
        const finalResponse = await askLLM(messages);

        // Parse final response. It might be JSON again (if loop) or just text.
        // The prompt says "Always JSON". So we accept JSON.
        // If it returns { reply: "..." }, we send that.
        let finalReply = finalResponse;
        try {
            const clean = finalResponse.replace(/```json/g, "").replace(/```/g, "").trim();
            if (clean.startsWith("{")) {
                const p = JSON.parse(clean);
                if (p.reply) finalReply = p.reply;
            }
        } catch (e) { /* just text */ }

        await sendMessage(token, chatId, finalReply);
        await appendMessage({ session_id: sessionId, bot_id: botId, role: "assistant", content: finalReply });
    }
}

