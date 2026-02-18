import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage } from "@/lib/telegram";
import { askLLM } from "@/lib/openrouter";
import { findOrCreateSession, appendMessage, listMessages } from "@/services/sessions";
import { Lang, LlmPayload, ToolAction, LLMMessage, SearchUnitsArgs, SubmitLeadArgs } from "../types";
import { detectLang } from "../utils/formatters";
import { SYSTEM_PROMPT } from "../ai/prompts";

// Dynamic imports to avoid circular deps if any
// But for now we just import them directly or use require
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
    console.log("[Bot] New Message: " + text);
    const lang = detectLang(userInfo.language_code);
    const trimmed = text.trim();

    // 1. Session Setup
    const session = await findOrCreateSession(botId, chatId);
    const sessionId = session.id;

    // 2. Save User Message
    await appendMessage({
        session_id: sessionId,
        bot_id: botId,
        role: "user",
        content: trimmed,
        payload: { update },
    });

    // 3. Prepare AI Context
    const messages: LLMMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // Load History
    try {
        const history = await listMessages(sessionId, 20);
        if (history && history.length) {
            const ordered = [...history].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            for (const msg of ordered) {
                // Cast generic string to specific role union if needed
                messages.push({ role: msg.role as any, content: msg.content || "" });
            }
        }
    } catch (e) { console.error("History Error:", e); }

    // Add current message
    messages.push({ role: "user", content: trimmed });

    // 4. THE BRAIN: Ask LLM what to do
    let llmRaw: string;
    try {
        console.log("[Bot] Asking Brain...");
        llmRaw = await askLLM(messages);
        console.log("[Bot] Brain said: " + llmRaw);
    } catch (e: any) {
        console.error("LLM Dead:", e);
        await sendMessage(token, chatId, "Service busy. Please try again.");
        return;
    }

    // 5. THE HANDS: Parse & Execute
    let parsed: LlmPayload | null = null;
    try {
        let jsonText = llmRaw.trim();
        // Remove markdown blocks if present ( ```json ... ``` )
        jsonText = jsonText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "");

        const firstBrace = jsonText.indexOf("{");
        const lastBrace = jsonText.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.slice(firstBrace, lastBrace + 1);
            parsed = JSON.parse(jsonText);
        } else {
            // Fallback: Just send raw text if it's not JSON
            if (llmRaw.length > 2) await sendMessage(token, chatId, llmRaw);
            return;
        }
    } catch (e) {
        console.error("JSON Parse Fail:", e);
        // It might be just text. Send it.
        await sendMessage(token, chatId, llmRaw);
        return;
    }

    // 6. EXECUTE ACTIONS
    const actions = parsed?.actions || [];

    // If there is a reply text, send it first (Intro)
    if (parsed?.reply) {
        await sendMessage(token, chatId, parsed.reply);
        // Save assistant reply to history
        await appendMessage({
            session_id: sessionId,
            bot_id: botId,
            role: "assistant", // Fixed role string
            content: parsed.reply,
        });
    }

    for (const action of actions) {
        console.log("[Bot] Running Tool: " + action.tool);
        let toolResult = "";

        if (action.tool === "search_units") {
            const args = action.args as SearchUnitsArgs;
            toolResult = await handleSearchUnits(sessionId, chatId, args, [], token, botId, lang);
        }
        else if (action.tool === "submit_lead") {
            const args = action.args as SubmitLeadArgs;
            toolResult = await handleSubmitLead(args, lang, chatId, token, sessionId, userInfo);
        }
        else if (action.tool === "get_company_info") {
            toolResult = "TurkHome is a leading agency in Mersin. We offer residence permit assistance and 0% installment plans.";
        }

        console.log("[Bot] Tool Result: " + toolResult);

        // 7. FEEDBACK LOOP (Optimized)
        // In a true Agent loop, we would feed this back to LLM.
        // For now, if the tool returned a result, we might want to show it or let the LLM know.
        // CURRENT SHORTCUT: The Search Tool returns JSON strings.
        // We need to send this to the USER? OR formatted?
        // The Prompt says: "REPLY: Use the tool result to write a natural... response."
        // This implies we need a SECOND TURN if a tool was called.

        if (toolResult && toolResult.length > 5) {
            // SECOND TURN: Feed result to AI to generate final answer
            messages.push({ role: "assistant", content: JSON.stringify(parsed) }); // What valid JSON it generated
            messages.push({ role: "user", content: "Tool Output: " + toolResult });

            try {
                const finalRaw = await askLLM(messages);
                const finalParsed = JSON.parse(finalRaw.match(/\{[\s\S]*\}/)?.[0] || "{}");

                if (finalParsed.reply) {
                    await sendMessage(token, chatId, finalParsed.reply);
                    await appendMessage({
                        session_id: sessionId,
                        bot_id: botId,
                        role: "assistant",
                        content: finalParsed.reply,
                    });
                }
            } catch (e) {
                // Fallback if 2nd turn fails or is just text
                // Use simple text finding because strict JSON might fail on 2nd turn
                console.log("2nd Turn Error or Text-only response");
                // We can just send the tool result if it's readable? No, it's JSON.
                // We'll trust the AI 1st turn reply covered it OR the user sees "Done".
            }
        }
    }
}
