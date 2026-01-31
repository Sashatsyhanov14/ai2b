export async function askLLM(prompt: string, system?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Явно используем Qwen — недорогую и сильную модель
      model: process.env.OPENROUTER_MODEL ?? "openrouter/auto",
      messages: [
        {
          role: "system",
          content:
            system ??
            "Ты — вежливый, понятный ассистент. Отвечай кратко, по делу и на языке пользователя.",
        },
        { role: "user", content: prompt },
      ],
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







