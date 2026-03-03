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
  system?: string,
  noJson: boolean = false
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

  // GPT-4o-mini - stable, strict with rules, does not hallucinate, and affordable (~$0.15/1M tokens)
  const model = "openai/gpt-4o-mini";

  const requestBody: any = {
    model,
    messages,
    max_tokens: 2048, // Limit tokens to avoid overspending
  };

  if (!noJson) {
    requestBody.response_format = { type: "json_object" };
  }

  console.log("[OpenRouter] Requesting model:", model, "messages count:", messages.length);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[OpenRouter] API error:", res.status, text.substring(0, 500));
    throw new Error(`OpenRouter error ${res.status}: ${text.substring(0, 200)}`);
  }

  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  console.log("[OpenRouter] Response content length:", content?.length ?? 0);
  return content ?? "";
}







