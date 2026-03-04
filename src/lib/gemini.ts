type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

/**
 * Ask LLM via OpenRouter API (Free Gemini 2.0 Pro Experimental)
 */
export async function askLLM(
    promptOrMessages: string | Message[] | any[],
    system?: string,
    noJson: boolean = false,
    jsonSchema?: any
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

    const modelName = "google/gemini-2.0-pro-exp-02-05:free";

    let messages: any[] = [];

    if (typeof promptOrMessages === "string") {
        if (system) {
            messages.push({ role: "system", content: system });
        } else {
            messages.push({ role: "system", content: "Ты помощник." });
        }
        messages.push({ role: "user", content: promptOrMessages });
    } else {
        // Find existing system prompt
        const hasSystem = promptOrMessages.some(m => m.role === "system");
        if (system && !hasSystem) {
            messages.push({ role: "system", content: system });
        }
        messages.push(...(promptOrMessages as any[]));
    }

    const requestBody: any = {
        model: modelName,
        messages,
        max_tokens: 4000,
    };

    if (!noJson) {
        requestBody.response_format = { type: "json_object" };
        if (jsonSchema) {
            // Note: OpenRouter Gemini doesn't always strictly support the json_schema object, 
            // so we inject the schema into the latest system prompt as a bulletproof fallback rule.
            const schemaString = JSON.stringify(jsonSchema, null, 2);
            // Append rules to the system message
            let systemMsg = messages.find(m => m.role === "system");
            if (!systemMsg) {
                systemMsg = { role: "system", content: "" };
                messages.unshift(systemMsg);
            }
            systemMsg.content += `\n\n[CRITICAL RULE]: You MUST output strictly in JSON format according to this JSON Schema:\n${schemaString}\n\nDo not include any text before or after the JSON block. Do not wrap in markdown \`\`\`json.`;
        }
    }

    console.log(`[OpenRouter/Gemini] Requesting model: ${modelName}, messages: ${messages.length}`);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai2b.app", // Optional
            "X-Title": "AI2B Agent Army", // Optional
        },
        body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenRouter API error ${res.status}: ${text.substring(0, 500)}`);
    }

    const json = await res.json();
    let content = json?.choices?.[0]?.message?.content ?? "";

    // Clean up if the model wrapped it in markdown anyway
    content = content.trim();
    if (!noJson) {
        content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    console.log("[OpenRouter/Gemini] Response content length:", content.length);
    return content;
}
