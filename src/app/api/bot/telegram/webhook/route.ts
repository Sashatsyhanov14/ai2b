import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage,
  sendPhoto,
  sendMediaGroup,
  sendTyping,
} from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { askLLM } from "@/lib/openrouter";
import {
  appendMessage,
  findOrCreateSession,
  listMessages,
} from "@/services/sessions";
import { createLead } from "@/services/leads";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Lang = "ru" | "en";

// =====================================================
// TOOL ACTIONS - What the LLM can request
// =====================================================
type ToolAction =
  | {
    tool: "send_message";
    args: { text: string };
  }
  | {
    tool: "show_property";
    args: ShowPropertyArgs;
  }
  | {
    tool: "create_lead";
    args: CreateLeadArgs;
  };

type ShowPropertyArgs = {
  city?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  rooms?: number | null;
  exclude_ids?: string[] | null;
};

type CreateLeadArgs = {
  unit_id?: string | null;
  name?: string | null;
  phone?: string | null;
  city?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

type LlmPayload = {
  reply?: string;
  state?: {
    city?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    rooms?: number | null;
    current_unit_id?: string | null;
    shown_unit_ids?: string[];
    [key: string]: any;
  } | null;
  actions?: ToolAction[];
};

// =====================================================
// HELPERS
// =====================================================
function detectLang(code?: string | null): Lang {
  if (!code) return "ru";
  const c = code.toLowerCase();
  if (c.startsWith("ru") || c.startsWith("uk") || c.startsWith("be")) {
    return "ru";
  }
  return "en";
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "цена по запросу";
  const usd = price.toLocaleString("ru-RU");
  const tryValue = Math.round(price * 34).toLocaleString("ru-RU");
  return `$${usd} (≈${tryValue} ₺)\n*Точную цену в лирах узнаете у менеджера*`;
}

function buildPropertyDescription(unit: any, lang: Lang): string {
  const city = unit.city || "—";
  const rooms = unit.rooms
    ? unit.rooms === 1
      ? lang === "ru"
        ? "студия"
        : "studio"
      : lang === "ru"
        ? `${unit.rooms}-комнатная`
        : `${unit.rooms}-room`
    : "";
  const area = unit.area ? `${unit.area} м²` : "";
  const floor = unit.floor
    ? unit.floors_total
      ? `${unit.floor}/${unit.floors_total} этаж`
      : `${unit.floor} этаж`
    : "";
  const price = formatPrice(unit.price);

  const parts = [rooms, area, floor].filter(Boolean).join(", ");

  if (lang === "ru") {
    return `${city}. ${parts}. ${price}`;
  }
  return `${city}. ${parts}. ${price}`;
}

// =====================================================
// SEND PROPERTY PHOTOS
// =====================================================
async function sendPropertyPhotos(
  token: string,
  chatId: string,
  unitId: string,
  caption: string
) {
  const sb = getServerClient();
  const { data: photos } = await sb
    .from("unit_photos")
    .select("url")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true })
    .limit(10);

  if (!photos || photos.length === 0) {
    // No photos, just send caption as text
    await sendMessage(token, chatId, caption);
    return;
  }

  if (photos.length === 1) {
    await sendPhoto(token, chatId, photos[0].url, caption);
  } else {
    const media = photos.map((p: { url: string }, idx: number) => ({
      type: "photo" as const,
      media: p.url,
      caption: idx === 0 ? caption : undefined,
    }));
    await sendMediaGroup(token, chatId, media);
  }
}

// =====================================================
// HANDLE SHOW PROPERTY
// =====================================================
async function handleShowProperty(
  args: ShowPropertyArgs | undefined,
  lang: Lang,
  chatId: string,
  token: string,
  sessionId: string | null,
  botId: string
): Promise<string | null> {
  const sb = getServerClient();

  const city = args?.city?.trim() || null;
  const budgetMin = args?.budget_min || null;
  const budgetMax = args?.budget_max || null;
  const rooms = args?.rooms || null;
  const excludeIds = args?.exclude_ids || [];

  // Build query
  let query = sb
    .from("units")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }
  if (budgetMin != null) {
    query = query.gte("price", budgetMin);
  }
  if (budgetMax != null) {
    query = query.lte("price", budgetMax);
  }
  if (rooms != null) {
    query = query.eq("rooms", rooms);
  }
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error("show_property query error:", error.message);
    const msg =
      lang === "ru"
        ? "Не удалось загрузить объекты из базы."
        : "Failed to load properties from database.";
    await sendMessage(token, chatId, msg);
    return null;
  }

  const list = data || [];
  const unit = list[0];

  if (!unit) {
    const msg =
      lang === "ru"
        ? "По вашим параметрам сейчас нет доступных объектов. Попробуйте изменить город или бюджет."
        : "No properties match your criteria. Try different city or budget.";
    await sendMessage(token, chatId, msg);
    return null;
  }

  // Build caption
  const baseDesc = buildPropertyDescription(unit, lang);
  const descRaw = unit.description?.trim() || "";
  const shortDesc = descRaw.length > 200 ? `${descRaw.slice(0, 200)}…` : descRaw;
  const addressLine = unit.address ? `Адрес: ${unit.address}.` : "";

  const question =
    lang === "ru"
      ? "Интересует? Или показать другой вариант?"
      : "Interested? Or shall I show another option?";

  const caption = [baseDesc, addressLine, shortDesc, question]
    .filter(Boolean)
    .join(" ");

  await sendPropertyPhotos(token, chatId, unit.id, caption);

  // Save to session
  if (sessionId) {
    try {
      await appendMessage({
        session_id: sessionId,
        bot_id: botId,
        role: "assistant",
        content: caption,
        payload: {
          unit_id: unit.id,
          city: unit.city,
          ai_instructions: unit.ai_instructions // <--- Added this
        },
      });
    } catch (e) {
      console.error("appendMessage show_property error:", (e as any)?.message);
    }
  }

  return unit.id;
}

// =====================================================
// HANDLE CREATE LEAD
// =====================================================
async function handleCreateLead(
  args: CreateLeadArgs | undefined,
  lang: Lang,
  chatId: string,
  token: string
) {
  try {
    const lead = await createLead({
      source_bot_id: "telegram",
      source: "telegram",
      name: args?.name || null,
      phone: args?.phone || null,
      email: null,
      data: {
        unit_id: args?.unit_id || null,
        city: args?.city || null,
        budget_min: args?.budget_min || null,
        budget_max: args?.budget_max || null,
        chat_id: chatId,
        tg_username: (global as any).tgUsername,
        tg_full_name: (global as any).tgFullName,
      },
      status: "new",
    });

    // Notify managers
    await notifyManagers(lang, token, lead.id, {
      city: args?.city || null,
      unitId: args?.unit_id || null,
      chatId,
      tgUsername: (global as any).tgUsername, // Using global to pass from POST to handleCreateLead context
      tgFullName: (global as any).tgFullName,
    });

    const msg =
      lang === "ru"
        ? "Отлично! Я записал вашу заявку. Менеджер свяжется с вами в ближайшее время."
        : "Great! I've recorded your inquiry. A manager will contact you shortly.";
    await sendMessage(token, chatId, msg);
  } catch (e) {
    console.error("createLead error:", (e as any)?.message || e);
    const msg =
      lang === "ru"
        ? "Не удалось создать заявку. Попробуйте позже."
        : "Failed to create inquiry. Please try again later.";
    await sendMessage(token, chatId, msg);
  }
}

// =====================================================
// NOTIFY MANAGERS
// =====================================================
async function notifyManagers(
  lang: Lang,
  token: string,
  leadId: string,
  payload: { city?: string | null; unitId?: string | null; chatId: string; tgUsername?: string | null; tgFullName?: string | null }
) {
  try {
    const sb = getServerClient();

    // 1. Fetch lead details
    const { data: lead } = await sb.from("leads").select("*").eq("id", leadId).single();
    if (!lead) return;

    // 2. Fetch conversation history for summary
    const { data: session } = await sb.from("sessions").select("id").eq("chat_id", payload.chatId).eq("bot_id", "telegram").single();
    let conversationHistory = "";
    if (session) {
      const messages = await listMessages(session.id, 20);
      conversationHistory = messages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
    }

    // 3. AISummary Prompt (Requested Format)
    const summaryPrompt = `Твоя задача — проанализировать диалог между AI-брокером и Клиентом и составить Краткую Карточку Лида для менеджера.

Входящие данные:
История переписки:
"""
${conversationHistory || "История недоступна"}
"""

ВЫВЕДИ ОТВЕТ СТРОГО В ТАКОМ ФОРМАТЕ (без лишних слов):

🔥 **НОВЫЙ ЛИД (ТУРЦИЯ)**
👤 **Язык:** [Русский / English / Türkçe]
💰 **Бюджет:** [Бюджет клиента]
🎯 **Цель:** [Инвестиции / ПМЖ / Отдых / Неизвестно]
🏠 **Интересовали объекты:** [Какие объекты смотрел/обсуждал]
⚠️ **Важные детали:** [Оплата криптой, питомцы, гражданство и т.д.]
📊 **Температура:** [Холодный / Теплый / Горячий]

Также добавь советы (например по национальности как лучше общаться и тд).
Номер телефона: ${lead.phone || "не указан"}
UserName в ТГ: ${payload.tgUsername ? `@${payload.tgUsername}` : "не указан"}
Имя: ${payload.tgFullName || lead.name || "не указано"}
`;

    const summary = await askLLM(summaryPrompt, "Ты — эксперт CRM, анализирующий диалоги и создающий карточки лидов для менеджеров по недвижимости в Турции.", true);

    // 4. Update Lead with Summary
    await sb.from("leads").update({ notes: summary }).eq("id", leadId);

    // 5. Notify Managers
    const { data: managers } = await sb
      .from("telegram_managers")
      .select("id, telegram_id, name, preferred_lang")
      .eq("is_active", true)
      .order("last_notified_at", { ascending: true, nullsFirst: true });

    if (!managers || managers.length === 0) return;

    // Conditional: rotate if > 2, otherwise notify all active
    const targets = managers.length > 2 ? [managers[0]] : managers;

    for (const target of targets) {
      if (target.telegram_id) {
        // Generate summary in manager's language if not Russian
        let finalSummary = summary;
        if (target.preferred_lang && target.preferred_lang !== "ru") {
          const transPrompt = `Translate this lead card into ${target.preferred_lang === 'en' ? 'English' : 'Turkish'}. Keep the emojis and structure exactly the same.\n\n${summary}`;
          finalSummary = await askLLM(transPrompt, "You are a professional translator for real estate leads.", true);
        }

        await sendMessage(token, String(target.telegram_id), finalSummary);
        await sb
          .from("telegram_managers")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", target.id);
      }
    }
  } catch (e) {
    console.error("notifyManagers error:", (e as any)?.message || e);
  }
}

// =====================================================
// SYSTEM PROMPT - SALES ONLY
// =====================================================
const systemPrompt = `Ты — профессиональный ассистент по продаже недвижимости.

ТВОЯ ЦЕЛЬ:
Помочь клиенту выбрать квартиру из базы и записать его на просмотр или получить контакт для менеджера.

ТВОИ ИСТОЧНИКИ ДАННЫХ:
1. Список квартир (используй только объекты, что есть в базе).
2. Файл "О компании" (условия, комиссия, контакты).

СТРОГИЕ ПРАВИЛА:
1. РАБОТАЙ ТОЛЬКО ПО БАЗЕ. Никогда не придумывай квартиры, цены или услуги, которых нет в источниках. Если информации нет — отвечай: "Этот момент я уточню у менеджера, оставьте ваш телефон".
2. БУДЬ КРАТОК. Клиенты читают с телефона. Пиши емко, разбивай текст на абзацы.
3. ВЕДИ К СДЕЛКЕ. Не оставляй сообщение без вопроса. В конце каждого ответа побуждай к действию.
   - Плохой ответ: "Квартира стоит 5 млн, 40 кв.м."
   - Хороший ответ: "Цена — 5 млн за 40 кв.м. Это отличная цена для района. Хотите посмотреть фото?"

ПРИМЕРЫ ДИАЛОГА:
Клиент: "Есть что-то до 4 млн?"
Ты: "Да, есть отличная студия за 3.5 млн руб. 22 кв.м., идеально под сдачу. Рассказать подробнее?"

Клиент: "Какой процент берете?"
Ты: (Берешь инфо из файла о компании) "Наша комиссия — 3% от сделки, оплата только по факту успеха. Вас интересует покупка или продажа?"

IMPORTANT: You ONLY output a JSON object. No other text.

JSON FORMAT:
{
  "reply": "your message",
  "state": {
    "city": string | null,
    "budget_min": number | null,
    "budget_max": number | null,
    "rooms": number | null,
    "current_unit_id": string | null,
    "shown_unit_ids": string[]
  },
  "actions": [
    { "tool": "send_message", "args": { "text": "..." } },
    { "tool": "show_property", "args": { "city": "...", "budget_max": 100000 } },
    { "tool": "create_lead", "args": { "unit_id": "...", "name": "...", "phone": "..." } }
  ]
}

TOOLS:
- send_message: Text communication.
- show_property: Search DB for matches.
- create_lead: Records a formal inquiry (name+phone required).

STYLE:
- Professional, sales-driven, but helpful and elite.
- Short, punchy messages.
- Always lead the conversation with a question.
- No emoji unless user uses them.

NEVER output anything except the JSON object.`;

// =====================================================
// GET HANDLER
// =====================================================
export async function GET() {
  return NextResponse.json({ ok: true });
}

// =====================================================
// POST HANDLER - Main webhook
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const update = (await req.json().catch(() => ({}))) as any;

    const message =
      update?.message ??
      update?.edited_message ??
      update?.callback_query?.message ??
      null;

    const chatIdRaw =
      message?.chat?.id ?? update?.chat?.id ?? update?.message?.from?.id ?? null;

    const chatId =
      chatIdRaw !== null && chatIdRaw !== undefined ? String(chatIdRaw) : null;

    const text: string =
      message?.text ??
      update?.message?.text ??
      update?.edited_message?.text ??
      update?.callback_query?.data ??
      "";

    const langCode: string | null =
      message?.from?.language_code ?? update?.message?.from?.language_code ?? null;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const lang = detectLang(langCode);
    const trimmed = text.trim();
    const botId = process.env.TELEGRAM_BOT_ID || "telegram";

    const tgUsername = message?.from?.username || update?.message?.from?.username || null;
    const tgFirstName = message?.from?.first_name || update?.message?.from?.first_name || "";
    const tgLastName = message?.from?.last_name || update?.message?.from?.last_name || "";
    const tgFullName = `${tgFirstName} ${tgLastName}`.trim() || "не указано";

    // Set globals for tools called deep in branching
    (global as any).tgUsername = tgUsername;
    (global as any).tgFullName = tgFullName;

    // Send typing indicator
    try {
      await sendTyping(token, chatId);
    } catch {
      // ignore
    }

    // Find or create session
    let sessionId: string | null = null;
    try {
      const session = await findOrCreateSession(botId, chatId);
      sessionId = session.id;
      await appendMessage({
        session_id: session.id,
        bot_id: botId,
        role: "user",
        content: text,
        payload: { update },
      });
    } catch (e) {
      console.error("session/appendMessage error:", (e as any)?.message || e);
    }

    // Check for phone/contact in message
    const phoneMatch = trimmed.match(/(\+?[\d\s\-()]{7,})/);
    if (phoneMatch) {
      // User sent phone number - might be responding to contact request
      // Continue to LLM to handle context
    }

    // Check OpenRouter API key
    if (!process.env.OPENROUTER_API_KEY) {
      const msg =
        lang === "ru"
          ? "Ошибка конфигурации: OPENROUTER_API_KEY не установлен."
          : "Config error: OPENROUTER_API_KEY not set.";
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true, mode: "config-error" });
    }

    // Build message array for LLM
    type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

    // Load Company Knowledge
    let companyContext = "";
    try {
      const sb = getServerClient();
      // Check if content_text column exists by trying to select it. If fails, fallback to description.
      // Or just try select with error handling? 
      // Safest: select all, check fields in code? NO, select specific fields.
      // Assuming migration applied or will be applied.
      const { data: files } = await sb.from("company_files").select("name, description, content_text").eq("is_active", true);
      if (files && files.length > 0) {
        companyContext = "\n\nCOMPANY KNOWLEDGE BASE:\n" + files.map((f: any) => {
          const content = f.content_text || f.description || "";
          if (!content) return "";
          return `[${f.name}]: ${content.slice(0, 1000)}`; // limit context size per file
        }).filter(Boolean).join("\n\n");
      }
    } catch (e) {
      console.error("Failed to load company context:", e);
    }

    // Load Global Instructions (structured)
    let globalInstructions = "";
    try {
      const sb = getServerClient();
      const { data: rules } = await sb
        .from("bot_instructions")
        .select("text")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (rules && rules.length > 0) {
        const formattedRules = rules
          .map((r, i) => `${i + 1}. ${r.text}`)
          .join("\n");
        globalInstructions = `GLOBAL INSTRUCTIONS AND RULES (STRICTLY FOLLOW):\n${formattedRules}\n\n`;
      }
    } catch (e) {
      console.error("Failed to load global instructions:", e);
    }

    const messages: LLMMessage[] = [{ role: "system", content: globalInstructions + systemPrompt + companyContext }];

    // Load conversation history
    if (sessionId) {
      try {
        const history = await listMessages(sessionId, 30);
        if (history && history.length) {
          const ordered = [...history].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          for (const msg of ordered) {
            const role =
              msg.role === "assistant"
                ? "assistant"
                : msg.role === "system"
                  ? "system"
                  : "user";

            let content = msg.content ?? "";

            if (
              role === "assistant" &&
              msg.payload &&
              Object.keys(msg.payload).length > 0
            ) {
              content += `\n[STATE: ${JSON.stringify(msg.payload)}]`;
            }

            messages.push({ role, content });
          }
        }
      } catch (e) {
        console.error("listMessages error:", (e as any)?.message || e);
      }
    }

    // Add current user message
    messages.push({ role: "user", content: trimmed });

    // Call LLM
    let llmRaw: string;
    try {
      llmRaw = await askLLM(messages);
      console.log("[LLM] Raw:", llmRaw.slice(0, 500));
    } catch (e) {
      const errMsg = (e as any)?.message || String(e);
      console.error("askLLM error:", errMsg);
      const msg =
        lang === "ru" ? "Ошибка LLM: " + errMsg : "LLM error: " + errMsg;
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true, mode: "llm-error" });
    }

    // Parse LLM response
    let parsed: LlmPayload | null = null;
    try {
      let jsonText = llmRaw.trim();
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(jsonText);
      console.log("[LLM] Parsed:", JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error("LLM JSON parse error:", e, "Raw:", llmRaw);
      // Send raw response if JSON parse fails
      await sendMessage(token, chatId, llmRaw);
      return NextResponse.json({ ok: true, mode: "llm-text" });
    }

    // Execute actions
    let sentReply = false;
    let finalReply: string | null = null;
    const actions: ToolAction[] = Array.isArray(parsed?.actions)
      ? (parsed.actions as ToolAction[])
      : [];

    for (const action of actions) {
      if (!action) continue;

      if (action.tool === "send_message") {
        const textToSend =
          typeof action.args?.text === "string"
            ? action.args.text
            : parsed?.reply ?? "";
        if (textToSend.trim()) {
          await sendMessage(token, chatId, textToSend.trim());
          sentReply = true;
          finalReply = textToSend.trim();
        }
      } else if (action.tool === "show_property") {
        await handleShowProperty(
          action.args as any,
          lang,
          chatId,
          token,
          sessionId,
          botId
        );
        sentReply = true;
      } else if (action.tool === "create_lead") {
        await handleCreateLead(action.args as any, lang, chatId, token);
        sentReply = true;
      }
    }

    // If no actions sent a reply, use the reply field
    if (!sentReply) {
      const candidate =
        typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
      if (candidate) {
        finalReply = candidate;
      } else {
        finalReply =
          lang === "ru"
            ? "Здравствуйте! Я помогу вам найти недвижимость в Турции. В каком городе вы ищете?"
            : "Hello! I'll help you find property in Turkey. Which city are you looking in?";
      }
      await sendMessage(token, chatId, finalReply);
    }

    // Save assistant response to session
    if (sessionId && finalReply) {
      try {
        await appendMessage({
          session_id: sessionId,
          bot_id: botId,
          role: "assistant",
          content: finalReply,
          payload: parsed?.state ?? {},
        });
      } catch (e) {
        console.error("appendMessage assistant error:", (e as any)?.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("webhook fatal error:", e?.message || e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
