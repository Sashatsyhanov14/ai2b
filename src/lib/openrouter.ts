type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Ask LLM via OpenRouter API
 * @param promptOrMessages - Either a string prompt or an array of messages for full conversation history
 * @param system - System prompt (only used when promptOrMessages is a string)
 */
export async function askLLM(
  promptOrMessages: string | Message[],
  system?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  let messages: Message[];

  if (typeof promptOrMessages === "string") {
    // Legacy mode: simple string prompt
    messages = [
      {
        role: "system",
        content:
          system ??
          "Ты — вежливый, понятный ассистент. Отвечай кратко, по делу и на языке пользователя.",
      },
      { role: "user", content: promptOrMessages },
    ];
  } else {
    // New mode: full message array with proper role separation
    messages = promptOrMessages;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openrouter/auto",
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  return content ?? "";
}







