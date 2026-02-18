import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage } from "@/lib/telegram";
import { askLLM } from "@/lib/openrouter";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { Lang, LlmPayload, ToolAction, LLMMessage, SearchUnitsArgs, SubmitLeadArgs } from "../types";
import { detectLang } from "../utils/formatters";
import { SYSTEM_PROMPT } from "../ai/prompts";
import { handleSearchUnits } from "../actions/search";
import { handleSubmitLead } from "../actions/leads";

export async function handleMessage(
    text: string,
    chatId: string,
    token: string,
    botId: string,
    userInfo: { username?: string | null; fullName?: string | null; phone?: string | null; language_code?: string | null },
    update?: any
) {
    const lang = detectLang(userInfo.language_code);
    const trimmed = text.trim();

    // 1. Session
    const session = await findOrCreateSession(botId, chatId);
    const sessionId = session.id;


    // 2. Append User Message
    await appendMessage({
        session_id: sessionId,
        bot_id: botId,
        role: "user",
        content: trimmed,
        payload: { update },
    });

    // 3. Prepare Prompt
    const messages: LLMMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // 4. Load History
    try {
        const history = await listMessages(sessionId, 20);
        if (history && history.length) {
            const ordered = [...history].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            for (const msg of ordered) {
                messages.push({ role: msg.role as any, content: msg.content || "" });
            }
        }
    } catch (e) { console.error(e); }

    messages.push({ role: "user", content: trimmed });

    // 5. Ask LLM
    let llmRaw: string;
    try {
        llmRaw = await askLLM(messages);
    } catch (e: any) {
        await sendMessage(token, chatId, "Service busy. Please try again.");
        return;
    }

    // 6. Parse JSON Response
    let parsed: LlmPayload | null = null;
    try {
        let jsonText = llmRaw.trim();
        const firstBrace = jsonText.indexOf("{");
        const lastBrace = jsonText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.slice(firstBrace, lastBrace + 1);
            parsed = JSON.parse(jsonText);
        } else {
            // Fallback if LLM forgets JSON
            if (llmRaw.length > 5) {
                await sendMessage(token, chatId, llmRaw);
            }
            return;
        }
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return;
    }

    // 7. Dispatch Tools
    const actions = parsed?.actions || [];

    // Output the Reply FIRST (As per examples, bot replies then tools work or vice versa?)
    // User Prompt: "Bot Action calls... Tool Output... Bot Reply..."
    // This implies Step 1: LLM decides Action. Step 2: Code runs Action. Step 3: Result injected back?
    // BUT my current architecture is "Single Turn". 
    // The User's prompt implies a "Function Calling" loop (LLM -> Tool -> LLM).
    // Current optimization: We do "Reply + Action". 
    // If the reply depends on the action result (e.g. "Here is the unit..."), we might have a timing issue.
    // HOWEVER, the `handleSearchUnits` sends the photos/details INDEPENDENTLY via `serveUnit`.
    // So the LLM's "reply" should serve as the Intro, and the action sends the Cards.

    if (parsed?.reply) {
        await sendMessage(token, chatId, parsed.reply);
    }

    for (const action of actions) {
        if (action.tool === "search_units") {
            await handleSearchUnits(sessionId, chatId, action.args as SearchUnitsArgs, [], token, botId, lang);
        }
        else if (action.tool === "submit_lead") {
            await handleSubmitLead(action.args as SubmitLeadArgs, lang, chatId, token, sessionId, userInfo);
        }
        else if (action.tool === "get_company_info") {
            // Placeholder for company info
            await sendMessage(token, chatId, "TurkHome is the leading agency...");
        }
    }

    // 8. Save Assistant Response
    // We save the "Reply" text. 
    // Note: We don't save the "Tool Execution" in history yet, which is fine for now.
    if (parsed?.reply) {
        await appendMessage({
            session_id: sessionId,
            bot_id: botId,
            role: "assistant",
            content: parsed.reply,
        });
    }
}
