type Message = {
    role: "system" | "user" | "assistant";
    content: string;
};

/**
 * Ask LLM via Google Gemini API (Native REST)
 * @param promptOrMessages - Either a string prompt or an array of messages for full conversation history
 * @param system - System prompt (only used when promptOrMessages is a string)
 */
export async function askLLM(
    promptOrMessages: string | Message[],
    system?: string,
    noJson: boolean = false,
    jsonSchema?: any
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Настройте GEMINI_API_KEY в Vercel и .env.local");

    let inputMessages: Message[];

    if (typeof promptOrMessages === "string") {
        inputMessages = [
            {
                role: "system",
                content:
                    system ??
                    "Ты — вежливый, понятный ассистент. Отвечай кратко, по делу и на языке пользователя.",
            },
            { role: "user", content: promptOrMessages },
        ];
    } else {
        inputMessages = promptOrMessages;
    }

    // 1. Extract system instruction
    const systemMessages = inputMessages.filter((m) => m.role === "system");
    const systemInstructionText = systemMessages.map((m) => m.content).join("\n\n");

    // 2. Map history to Gemini format
    const contents: any[] = [];

    for (const m of inputMessages) {
        if (m.role === "system") continue;

        // Gemini roles: "user" | "model"
        const role = m.role === "assistant" ? "model" : "user";

        // Empty strings are not allowed in Gemini textual parts.
        const text = m.content && m.content.trim().length > 0 ? m.content : " ";

        contents.push({
            role,
            parts: [{ text }],
        });
    }

    // Gemini strict constraint: the conversation history contents must start with a user role
    if (contents.length > 0 && contents[0].role === "model") {
        // Prepend a silent user ping to fix the sequence
        contents.unshift({
            role: "user",
            parts: [{ text: "Здравствуйте" }]
        });
    }

    const modelName = "gemini-2.0-flash"; // Fast and capable model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody: any = {
        contents,
        generationConfig: {
            maxOutputTokens: 2048,
        },
    };

    if (systemInstructionText) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstructionText }]
        };
    }

    // Native JSON Mode support in Gemini
    if (!noJson) {
        requestBody.generationConfig.responseMimeType = "application/json";
        if (jsonSchema) {
            requestBody.generationConfig.responseSchema = jsonSchema;
        }
    }

    console.log(`[Gemini] Requesting model: ${modelName}, messages count: ${contents.length}`);

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[Gemini] API error:", res.status, text.substring(0, 500));
        throw new Error(`Gemini API error ${res.status}: ${text.substring(0, 200)}`);
    }

    const json = await res.json();
    const content: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("[Gemini] Response content length:", content?.length ?? 0);
    return content ?? "";
}
