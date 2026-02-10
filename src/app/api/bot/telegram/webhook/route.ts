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
  return `€${price.toLocaleString("ru-RU")}`;
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
  const area = unit.area_m2 ? `${unit.area_m2} м²` : "";
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
      },
      status: "new",
    });

    // Notify managers
    await notifyManagers(lang, token, lead.id, {
      city: args?.city || null,
      unitId: args?.unit_id || null,
      chatId,
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
  payload: { city?: string | null; unitId?: string | null; chatId: string }
) {
  try {
    const sb = getServerClient();
    const { data: managers } = await sb
      .from("telegram_managers")
      .select("telegram_id, name")
      .eq("is_active", true);

    if (!managers || managers.length === 0) return;

    for (const m of managers) {
      if (!m.telegram_id) continue;

      const msg =
        lang === "ru"
          ? `🔔 Новая заявка!\nГород: ${payload.city || "—"}\nОбъект: ${payload.unitId || "—"}\nЧат: ${payload.chatId}\nID: ${leadId}`
          : `🔔 New lead!\nCity: ${payload.city || "—"}\nUnit: ${payload.unitId || "—"}\nChat: ${payload.chatId}\nID: ${leadId}`;

      await sendMessage(token, String(m.telegram_id), msg);
    }
  } catch (e) {
    console.error("notifyManagers error:", (e as any)?.message || e);
  }
}

// =====================================================
// SYSTEM PROMPT - SALES ONLY
// =====================================================
const systemPrompt = `You are AI2B - a high-performance Real Estate Sales Agent in Turkey (Antalya, Alanya, etc.).
Your mission: Identify qualified buyers, "warm" them up with exclusive info, and capture their contact data.

IMPORTANT: You ONLY output a JSON object. No other text.

STRATEGY:
1. FILTER (Qualification):
   - Don't just answer questions. Qualify the user.
   - Ask about: Preferred city, Budget (EUR), Goal (Investment, Living, Citizenship), and Urgency.
   - If a user is "just looking", be polite but prioritize those with a clear budget and goal.

2. WARM (Secret Data Hooks):
   - Every property has a hidden "ai_instructions" field (Data for really interested clients).
   - NEVER tell this info immediately. Use it as a carrot.
   - Example: "I have some private details about the owner's flexibility for this property that I can't post publicly. Are you seriously considering this option?"
   - Only reveal the secret info if the user shows strong intent or asks for "special conditions".

3. CAPTURE (Lead Generation):
   - Your goal is to get their Phone and Name.
   - Offer value in exchange: "I can send the full technical dossier and private payment plan to your WhatsApp. What is your phone number and name?"
   - Once you have the phone, call the 'create_lead' tool immediately.

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

    const messages: LLMMessage[] = [{ role: "system", content: systemPrompt + companyContext }];

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
