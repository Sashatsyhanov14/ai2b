type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

/**
 * Ask LLM via Polza AI API
 */
type ModelType = 'deepseek' | 'gpt-4o-mini' | 'gemini-1.5-flash' | 'gemini-2.0-flash-001';

export async function askLLM(
    promptOrMessages: string | Message[] | any[],
    system?: string,
    noJson: boolean = false,
    jsonSchema?: any,
    modelType: ModelType = 'gpt-4o-mini'
): Promise<string> {
    const apiKey = process.env.POLZA_API_KEY;
    if (!apiKey) throw new Error("POLZA_API_KEY is not set.");

    const modelName = modelType === 'deepseek' ? 'deepseek/deepseek-chat-v3-0324' 
        : modelType === 'gemini-1.5-flash' ? 'google/gemini-2.0-flash-001' 
        : modelType === 'gemini-2.0-flash-001' ? 'google/gemini-2.0-flash-001'
        : 'openai/gpt-4o-mini';

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

    console.log(`[Polza AI] Requesting model: ${modelName}, messages: ${messages.length}`);

    const res = await fetch("https://polza.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Polza API error ${res.status}: ${text.substring(0, 500)}`);
    }

    const json = await res.json();
    let content = json?.choices?.[0]?.message?.content ?? "";

    // Clean up if the model wrapped it in markdown anyway
    content = content.trim();
    if (!noJson) {
        content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    console.log("[Polza AI] Response content length:", content.length);
    return content;
}
