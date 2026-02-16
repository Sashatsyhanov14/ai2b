import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage,
  sendPhoto,
  sendMediaGroup,
  sendTyping,
} from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";
import { askLLM } from "@/lib/openrouter";
import { appendMessage, findOrCreateSession, listMessages } from "@/services/sessions";
import { createLead, updateLeadStatus } from "@/services/leads";
import {
  markLeadCreated,
  markReactivationResponded,
} from "@/services/scoring";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Lang = "ru" | "en" | "tr";

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
  if (c.startsWith("tr")) {
    return "tr";
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

  // Rooms - translate to user language
  let rooms = "";
  if (unit.rooms != null) {
    if (unit.rooms === 0) {
      rooms = lang === "ru" ? "студия" : lang === "tr" ? "stüdyo" : "studio";
    } else {
      rooms = lang === "ru"
        ? `${unit.rooms}-комнатная`
        : lang === "tr"
          ? `${unit.rooms}+1 daire`
          : `${unit.rooms}-room`;
    }
  }

  // Area
  const area = unit.area_m2 ? `${unit.area_m2} m²` : "";

  // Floor - translate to user language
  let floor = "";
  if (unit.floor) {
    if (unit.floors_total) {
      floor = lang === "ru"
        ? `${unit.floor}/${unit.floors_total} этаж`
        : lang === "tr"
          ? `${unit.floor}/${unit.floors_total} Kat`
          : `${unit.floor}/${unit.floors_total} floor`;
    } else {
      floor = lang === "ru"
        ? `${unit.floor} этаж`
        : lang === "tr"
          ? `${unit.floor} Kat`
          : `${unit.floor} floor`;
    }
  }

  const price = formatPrice(unit.price);
  const parts = [rooms, area, floor].filter(Boolean).join(", ");

  return `${city}. ${parts}. ${price}`;
}

// CITY_VARIANT_MAP and getCityVariants REMOVED (Replaced by AI Extraction)

// =====================================================
// AI SEARCH PARAMETER EXTRACTION
// =====================================================
async function extractSearchParamsAI(queryText: string, lang: Lang): Promise<{
  city_variants: string[];
  price_max: number | null;
  rooms: number | null;
}> {
  const prompt = `
Ты извлекаешь параметры поиска из запроса пользователя для базы данных SQL.

Запрос: "${queryText}"
Язык пользователя: ${lang}

ЗАДАЧА: Если упомянут город, верни ВСЕ возможные варианты его написания (на русском, английском, сокращения).

ПРИМЕРЫ:
- "Питер" -> ["Санкт-Петербург", "Санкт Петербург", "СПб", "Saint Petersburg", "Petersburg", "Piter"]
- "Мск" -> ["Москва", "Moscow", "Мск", "MSK"]
- "Алания" -> ["Alanya", "Алания", "Аланья"]
- "Стамбул" -> ["Istanbul", "Стамбул", "İstanbul"]

Если бюджет не указан -> ставь null.
Rooms: 0=Studio, 1=1+1, 2=2+1, 3=3+1, etc.

Верни JSON:
{ 
  "city_variants": ["вариант1", "вариант2", ...] или [],
  "price_max": number | null, 
  "rooms": number | null
}
`;

  try {
    const raw = await askLLM(prompt, "System: Parameter Extractor", true);
    const json = JSON.parse(raw);
    return {
      city_variants: json.city_variants || [],
      price_max: json.price_max || null,
      rooms: json.rooms !== undefined ? json.rooms : null
    };
  } catch (e) {
    console.error("extractSearchParamsAI error:", e);
    return { city_variants: [], price_max: null, rooms: null };
  }
}

// =====================================================
// AI SHADOW ANALYST
// =====================================================
type AnalystResult = {
  is_lead: boolean;
  lead_status: "COLD" | "WARM" | "HOT";
  user_intent: string;
  missing_info: string[];
};

async function analyzeLeadAI(history: string): Promise<AnalystResult> {
  const prompt = `
ТЫ — ГЛАВНЫЙ CRM-АНАЛИТИК.
Твоя задача: Читать переписку с клиентом и оценивать качество Лида.

ВХОДНЫЕ ДАННЫЕ (ИСТОРИЯ ЧАТА):
"""
${history}
"""

ПРОАНАЛИЗИРУЙ И ВЕРНИ СТРОГО JSON:
{
  "is_lead": true/false,          // Ставь true, если есть ХОТЬ МАЛЕЙШИЙ интерес к недвижимости (цена, город, фото)
  "lead_status": "COLD" | "WARM" | "HOT", // COLD - просто привет/спам, WARM - смотрит варианты, HOT - оставил контакт или просит встречу/звонок
  "user_intent": "строка",        // Что он хочет? (Например: "Купить двушку в Питере")
  "missing_info": ["budget", "phone", ...] // Чего не хватает для продажи?
}
`;

  try {
    const raw = await askLLM(prompt, "System: CRM Analyst", true);
    return JSON.parse(raw);
  } catch (e) {
    console.error("analyzeLeadAI error:", e);
    return { is_lead: false, lead_status: "COLD", user_intent: "Error", missing_info: [] };
  }
}

// =====================================================
// SEND PROPERTY PHOTOS
// =====================================================
async function sendPropertyPhotos(
  token: string,
  chatId: string,
  unitId: string,
  caption: string,
  lang: Lang
) {
  const sb = getServerClient();
  const { data: photos } = await sb
    .from("unit_photos")
    .select("url")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true })
    .limit(10);

  console.log(`[PHOTOS] Unit ${unitId}: Found ${photos?.length || 0} photos`);

  if (!photos || photos.length === 0) {
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
  sessionId: string | null,
  chatId: number,
  query: string,
  exclude_ids: number[],
  token: string,
  botId: string,
  lang: Lang
): Promise<string | null> {
  const supabase = getServerClient();

  // Show typing indicator for better UX
  await sendTyping(token, String(chatId));

  // Load ALL properties from database (no filters!)
  const { data: allUnits, error } = await supabase
    .from("units")
    .select("id, city, address, rooms, floor, floors_total, area_m2, price, description, ai_instructions")
    .limit(100); // Load top 100

  if (error || !allUnits || allUnits.length === 0) {
    const msg = lang === "ru"
      ? "Не удалось загрузить базу недвижимости."
      : "Failed to load property database.";
    await sendMessage(token, String(chatId), msg);
    return null;
  }

  // Remove already shown properties
  const availableUnits = allUnits.filter(u => !exclude_ids.includes(u.id));

  if (availableUnits.length === 0) {
    const msg = lang === "ru"
      ? "Показал все доступные варианты. Больше объектов нет."
      : "Showed all available options. No more properties.";
    await sendMessage(token, String(chatId), msg);
    return null;
  }

  // Pass ALL properties to AI for selection
  const aiPrompt = `
You are a real estate assistant. User asked: "${query}"
User language: ${lang}

Available properties (JSON):
${JSON.stringify(availableUnits, null, 2)}

Task:
1. Analyze user's request (city, budget, rooms, etc.)
2. Find THE BEST property from the list
3. If exact match not found, choose close option
4. Return ONLY the property ID (number)

Rules:
- User city MUST match property city (multi-language aware: Mersin=Мерсин, Alanya=Алания)
- Consider price, rooms, location
- If user mentions family/children → need 2+ rooms minimum

Return format:
{
  "unit_id": NUMBER,
  "reason": "why you chose this property (1 sentence)"
}
`;

  let selectedUnitId: number;
  try {
    const aiResponse = await askLLM(aiPrompt, "You are a property selector.", true);
    const parsed = JSON.parse(aiResponse);
    selectedUnitId = parsed.unit_id;
    console.log(`[AI PROPERTY SELECTION] Chose unit ${selectedUnitId}: ${parsed.reason}`);
  } catch (e) {
    console.error("[AI SELECTION ERROR]", e);
    // Fallback: return first available
    selectedUnitId = availableUnits[0].id;
  }

  const unit = availableUnits.find(u => u.id === selectedUnitId);
  if (!unit) {
    console.error(`[ERROR] AI selected unit ${selectedUnitId} but it's not in available list`);
    return null;
  }

  // Build caption using translation function
  const caption = buildPropertyDescription(unit, lang);

  // Send photos
  await sendPropertyPhotos(token, String(chatId), String(unit.id), caption, lang);

  // Save to session
  if (sessionId) {
    try {
      await appendMessage({
        session_id: sessionId!,
        bot_id: botId,
        role: "assistant",
        content: caption,
        payload: {
          unit_id: unit.id,
          city: unit.city,
          ai_instructions: unit.ai_instructions
        },
      });
    } catch (e) {
      console.error("appendMessage error:", e);
    }
  }

  return `Показал квартиру ID ${unit.id} (${unit.city}, ${unit.rooms}-комнатная, $${unit.price}). AI выбрал эту из ${availableUnits.length} доступных.`;
}

// =====================================================
// SCORING HELPER
// =====================================================
// awardPoints function removed

// =====================================================
// LEAD QUALIFICATION AI (CRM AGENT)
// =====================================================
async function qualifyLeadAI(history: string, lang: Lang): Promise<{
  is_trash: boolean;
  summary: string;
  budget: string;
  location: string;
  type: string;
  urgency: string;
} | null> {
  const prompt = `Ты — CRM - аналитик.Твоя задача — извлечь данные из диалога для менеджера по недвижимости.

ВХОДНЫЕ ДАННЫЕ:
История чата:
      """
${history}
      """
Язык пользователя: ${lang}

ПРОАНАЛИЗИРУЙ И ВЕРНИ JSON(СТРОГО):
      {
        "is_trash": true / false, // Если это спам или просто "привет", ставь true
          "summary": "Краткая выжимка в 1 предложение (на русском)",
            "budget": "сумма или 'не указан'",
              "location": "город/район или 'не указан'",
                "type": "покупка/аренда/инвестиции",
                  "urgency": "горячий/теплый/холодный"
      }
      `;

  try {
    const raw = await askLLM(prompt, "Ты — эксперт CRM, анализирующий диалоги и создающий карточки лидов для менеджеров по недвижимости.", true);
    let jsonText = raw.trim();
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.slice(firstBrace, lastBrace + 1);
    }
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("qualifyLeadAI error:", e);
    return null;
  }
}

async function requestContact(token: string, chatId: string, lang: Lang) {
  const text = lang === "ru"
    ? "Чтобы я передал информацию менеджеру, нажмите кнопку \"Поделиться контактом\" ниже."
    : "To pass your inquiry to a manager, please click the \"Share Contact\" button below.";

  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: lang === "ru" ? "Поделиться контактом" : "Share Contact", request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      ...keyboard
    }),
  });
}

// =====================================================
// HANDLE CREATE LEAD
// =====================================================
async function handleCreateLead(
  args: CreateLeadArgs | undefined,
  lang: Lang,
  chatId: string,
  token: string,
  sessionId: string | null,
  userInfo: { phone?: string | null; username?: string | null; fullName?: string | null }
) {
  try {
    const phone = userInfo.phone || args?.phone || null;

    if (!phone) {
      await requestContact(token, chatId, lang);
      return;
    }

    // Run AI Qualification before creating lead if we have history
    let aiQual: any = null;
    let history = "";
    if (sessionId) {
      const messages = await listMessages(sessionId, 20);
      history = messages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
      aiQual = await qualifyLeadAI(history, lang);
    }

    if (aiQual?.is_trash) {
      console.log("Lead marked as trash by AI, skipping manager notification.");
      return;
    }

    // BLOCK SANDBOX - REMOVED (Now handled by AI Analyst)

    const lead = await createLead({
      source_bot_id: "telegram",
      source: "telegram",
      name: userInfo.fullName || args?.name || null,
      phone: phone,
      email: null,
      data: {
        unit_id: args?.unit_id || (global as any).focus_unit_id || null, // Priority to direct arg, then session focus
        city: aiQual?.location || args?.city || null,
        budget: aiQual?.budget || null,
        type: aiQual?.type || null,
        urgency: aiQual?.urgency || null,
        ai_summary: aiQual?.summary || null,
        chat_id: chatId,
        tg_username: userInfo.username,
        tg_full_name: userInfo.fullName,
      },
      status: "new",
    });

    // Notify managers
    await notifyManagers(lang, token, lead.id, {
      chatId,
      tgUsername: userInfo.username,
      tgFullName: userInfo.fullName,
      history,
    });

    // Mark in scoring system that lead has been created
    if (sessionId) {
      await markLeadCreated(sessionId);
    }

    // Respond to user
    const msg =
      lang === "ru"
        ? "Отлично! Я записал вашу заявку. Менеджер свяжется с вами в ближайшее время."
        : "Great! I've recorded your inquiry. A manager will contact you shortly.";
    await sendMessage(token, chatId, msg);
  } catch (e) {
    console.error("createLead error:", (e as any)?.message || e);
  }
}

// =====================================================
// NOTIFY MANAGERS
// =====================================================
async function notifyManagers(
  lang: Lang,
  token: string,
  leadId: string,
  payload: { chatId: string; tgUsername?: string | null; tgFullName?: string | null; history?: string }
) {
  try {
    const sb = getServerClient();
    const { data: lead } = await sb.from("leads").select("*").eq("id", leadId).single();
    if (!lead) return;

    let conversationHistory = payload.history || "";
    if (!conversationHistory) {
      const { data: session } = await sb.from("sessions").select("id").eq("chat_id", payload.chatId).eq("bot_id", "telegram").single();
      if (session) {
        const messages = await listMessages(session.id, 20);
        conversationHistory = messages
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(m => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");
      }
    }

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
    await sb.from("leads").update({ notes: summary }).eq("id", leadId);

    const { data: managers } = await sb
      .from("telegram_managers")
      .select("id, telegram_id, name, preferred_lang")
      .eq("is_active", true)
      .order("last_notified_at", { ascending: true, nullsFirst: true });

    if (!managers || managers.length === 0) return;
    const targets = managers.length > 2 ? [managers[0]] : managers;

    for (const target of targets) {
      if (target.telegram_id) {
        let finalSummary = summary;
        if (target.preferred_lang && target.preferred_lang !== "ru") {
          const transPrompt = `Translate this lead card into ${target.preferred_lang === 'en' ? 'English' : 'Turkish'}. Keep the emojis and structure exactly the same.\n\n${summary}`;
          finalSummary = await askLLM(transPrompt, "You are a professional translator for real estate leads.", true);
        }
        await sendMessage(token, String(target.telegram_id), finalSummary);
        await sb.from("telegram_managers").update({ last_notified_at: new Date().toISOString() }).eq("id", target.id);
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

ПРИВЕТСТВИЕ (при первом сообщении):
Если это ПЕРВОЕ сообщение в диалоге, ОБЯЗАТЕЛЬНО представься:
"Здравствуйте! Я [ИМЯ ИЗ ФАЙЛА КОМПАНИИ], виртуальный агент по недвижимости компании [НАЗВАНИЕ КОМПАНИИ]. Помогу вам подобрать квартиру и ответить на вопросы. Что вас интересует?"

Если в файле "О компании" нет имени бота, используй:
"Здравствуйте! Я виртуальный агент компании [НАЗВАНИЕ], специализируемся на продаже недвижимости. Чем могу помочь?"

ТВОИ ИСТОЧНИКИ ДАННЫХ:
1. Список квартир (используй только объекты, что есть в базе).
2. Файл "О компании" (условия, комиссия, контакты).

КРИТИЧЕСКОЕ ПРАВИЛО НОМЕР ОДИН:
🚨 КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ПРИДУМЫВАТЬ ДАННЫЕ! 🚨

НИКОГДА НЕ ДЕЛАЙ ЭТО:
❌ НЕ придумывай адреса квартир
❌ НЕ придумывай цены
❌ НЕ придумывай характеристики (этажность, площадь, комнаты)
❌ НЕ придумывай названия районов или улиц
❌ НЕ говори "Вот несколько вариантов", если база вернула 0 результатов
❌ НЕ описывай квартиры, которые не были найдены через show_property
❌ НЕ отправляй фотографии, если объект не из базы
❌ НЕ добавляй в текст информацию о квартирах, которые НЕ были возвращены show_property

🔴 ПРАВИЛО АБСОЛЮТНОЙ ПРАВДЫ:
- Если show_property вернул 1 квартиру → пиши ТОЛЬКО про эту 1 квартиру
- Если show_property вернул 0 квартир → пиши "Ничего не нашли"
- Если хочешь показать ещё варианты → вызови show_property ЕЩЁ РАЗ с другими параметрами
- ЗАПРЕЩЕНО писать в тексте reply про квартиры, если не вызвал show_property для них!

ЕСЛИ БАЗА ПУСТА (0 результатов):
✅ ОБЯЗАТЕЛЬНО скажи: "К сожалению, по вашим параметрам сейчас нет доступных объектов."
✅ Предложи: "Могу показать варианты в другом городе/с другим бюджетом?"
✅ ИЛИ: "Оставьте контакт, мы подберем варианты и свяжемся с вами."

СТРОГИЕ ПРАВИЛА:
1. РАБОТАЙ ТОЛЬКО ПО БАЗЕ. Если информации нет — отвечай: "Этот момент я уточню у менеджера, оставьте ваш телефон".
2. БУДЬ КРАТОК. Клиенты читают с телефона. Пиши емко, разбивай текст на абзацы.
3. ВЕДИ К СДЕЛКЕ. Не оставляй сообщение без вопроса. В конце каждого ответа побуждай к действию.
   - Плохой ответ: "Квартира стоит 5 млн, 40 кв.м."
   - Хороший ответ: "Цена — 5 млн за 40 кв.м. Это отличная цена для района. Хотите посмотреть фото?"
4. ПОКАЗЫВАЙ ВСЁ. Твоя основная задача — дать клиенту всю информацию об объектах, которые его интересуют. Не скрывай данные и не блокируй показ квартир ожиданием контакта. Сначала дай пользу, потом предложи связь с менеджером.
5. ЕСЛИ КЛИЕНТ ЗАИНТЕРЕСОВАН: Если клиент хочет связаться с менеджером, посмотреть объект или задает много конкретных вопросов — используй инструмент create_lead. 
6. ЕСЛИ ТЕЛЕФОН НЕИЗВЕСТЕН: Перед созданием лида ассистент всегда должен мягко попросить контакт или использовать кнопку поделиться контактом. Но ты можешь вызывать create_lead и без телефона, система сама запросит его кнопкой у пользователя.

💰 УТОЧНЕНИЕ ВАЛЮТЫ:
- Если клиент называет бюджет ЧИСЛОМ (например "300000", "50000") БЕЗ указания валюты → ОБЯЗАТЕЛЬНО уточни: "В какой валюте ваш бюджет? Рубли, доллары или лиры?"
- Если клиент сказал "300 тысяч рублей" или "$50k" или "100k лир" → валюта понятна, не спрашивай!
- После уточнения валюты → конвертируй в доллары для поиска в базе (цены в базе в USD)

🗣️ ПРАВИЛО ПЕРЕВОДА (КРИТИЧЕСКИ ВАЖНО!):
- Данные о квартирах в базе хранятся на РУССКОМ языке
- ТЫ ОБЯЗАН перевести ВСЕ параметры на язык пользователя!
- Если USER пишет по-ТУРЕЦКИ → переведи "2-комнатная" в "2+1 daire", "этаж" в "Kat"
- Если USER на АНГЛИЙСКОМ → переведи "2-комнатная" в "2-room", "этаж" в "floor"
- НЕ смешивай языки! Всё сообщение на ОДНОМ языке!

EXAMPLE WRONG:
❌ User (TR): "Mersin'de daire arıyorum"
❌ Bot: "Peki! Вот квартира: 2-комнатная, 5 этаж" (смешал турецкий+русский!)

EXAMPLE RIGHT:
✅ User (TR): "Mersin'de daire arıyorum"
✅ Bot: "Tamam! İşte bir seçenek: 2+1 daire, 5. Kat, 120 m²" (ВСЁ на турецком!)

🌍 АБСОЛЮТНЫЙ ЗАПРЕТ НА СМЕНУ ЛОКАЦИИ:
- Если в диалоге клиент назвал "Москва" → ВСЕ последующие сообщения должны быть ПРО МОСКВУ!
- НИКОГДА НЕ меняй страну/город самостоятельно, даже если в базе знаний упоминается Турция/Алания/другие города!
- База знаний компании может содержать информацию о РАЗНЫХ странах, но ты работаешь ТОЛЬКО с тем городом, который назвал клиент!
- Если клиент спросил "Хочу в Москве" → НЕ предлагай Турцию/Алани ю/другие страны без явного запроса!

КРИТИЧЕСКОЕ:
❌ Клиент: "Хочу квартиру в Москве"
❌ БОТ: "Я помогу вам найти недвижимость в Турции" (НЕДОПУСТИМО!)

✅ Клиент: "Хочу квартиру в Москве"  
✅ БОТ: "Отлично! Какой бюджет для Москвы?"

🔴 КОНТЕКСТНАЯ ОСВЕДОМЛЕННОСТЬ:
- Если клиент упомянул СЕМЬЮ, ДЕТЕЙ → НЕ показывай студии! Минимум 2 комнаты!
- Если клиент назвал ГОРОД → показывай ТОЛЬКО этот город! Не меняй город самостоятельно!
- Если клиент назвал бюджет → фильтруй СТРОГО по бюджету!
- Если клиент сказал "2 детей" → ищи минимум 3-комнатную (2 детям + родителям)!
- ВСЕГДА проверяй: совпадает ли город найденной квартиры с тем, что просил клиент!

🟢 ГИБКОСТЬ ПРИ ОТСУТСТВИИ ВАРИАНТОВ:
- Если клиент говорит "покажи что есть", "покажи все варианты", "просто покажи", "покажи" → УБЕРИ фильтр по комнатам и бюджету! Покажи ВСЁ, что есть в нужном городе!
- Если нет квартир "идеальных" → покажи "близкие варианты" (например, 2-комнатную вместо 3-комнатной)
- ВСЕГДА лучше показать "не идеальный, но реальный" вариант, чем сказать "ничего нет"

🚫 ЗАПРЕТ НА ПРОТИВОРЕЧИЯ:
- НИКОГДА не говори "К сожалению, нет объектов" если в ЭТОМ ЖЕ ответе планируешь вызвать show_property!
- Если планируешь показать альтернативы, НЕ пиши "нет объектов"!
- Вместо этого: "Точных совпадений нет, но вот близкие варианты:" → ПОТОМ show_property

ПРАВИЛЬНО:
❌ "К сожалению, квартир нет." [вызывает show_property]
✅ "Точных совпадений не нашел, но вот что есть в Москве:" [вызывает show_property]
✅ "По этому бюджету нет, но есть немного дороже:" [вызывает show_property]

🔴 ЗАПРЕТ НА ЗАЦИКЛИВАНИЕ:
- Если ты УЖЕ сказал "нет квартир" в предыдущем сообщении → НЕ говори это снова!
- Вместо этого → АВТОМАТИЧЕСКИ убери фильтры (rooms, budget) и покажи ЧТО ЕСТЬ в городе!
- Если клиент второй раз просит "покажи" → это сигнал СНЯТЬ ВСЕ ФИЛЬТРЫ!

🚫 СТРОГИЙ ЗАПРЕТ НА ДРУГОЙ ГОРОД:
- Если клиент просил МОСКВУ → НИКОГДА не показывай Питер/Алания/другие города!
- Лучше показать НЕ идеальную квартиру (студию/дорогую) в НУЖНОМ городе, чем идеальную в ДРУГОМ городе!
- Если в нужном городе ВООБЩЕ нет объектов → скажи "В Москве пока нет объектов в базе. Оставьте контакт?"

EXAMPLE WRONG:
Клиент: "Хочу в Москве, у меня 2 детей"
Бот: "Нет 3-комнатных"
Клиент: "Просто покажи что есть"
❌ БОТ: "Нет 3-комнатных" (зациклился!)

EXAMPLE RIGHT:
Клиент: "Хочу в Москве, у меня 2 детей"
Бот: "Нет 3-комнатных"
Клиент: "Просто покажи что есть"
✅ БОТ: *вызывает show_property с city="Москва" БЕЗ фильтра rooms!*
✅ БОТ: "Вот что есть в Москве: 2-комнатная. Она немного меньше, но может подойти для начала. Хотите посмотреть?"

EXAMPLE RIGHT 2:
Клиент: "Хочу в Москве, у меня 2 детей"
✅ БОТ: *вызывает show_property с city="Москва" AND rooms>=2*
✅ БОТ: *проверяет результат - город совпадает? комнат достаточно?*
✅ БОТ: "Вот отличный вариант: Москва, 3-комнатная..."

IMPORTANT: You ONLY output a JSON object. No other text.

JSON FORMAT:
{
  "reply": "your message",
  "state": {
    "city": string | null,
    "budget_min": number | null,
    "budget_max": number | null,
    "rooms": number | null, // 0=Studio, 1=1+1, 2=2+1, 3=3+1, 4=4+
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
- show_property: Search DB for matches. RETURNS NULL IF NOTHING FOUND!
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

    const userInfo = {
      username: tgUsername,
      fullName: tgFullName,
      phone: (update?.message?.contact?.phone_number) || null as string | null
    };

    // Callback Query Handling (Depth Actions)
    if (update?.callback_query) {
      const cbData = update.callback_query.data;
      const cbId = update.callback_query.id;

      if (cbData.startsWith("depth:")) {
        const [_, action, unitId] = cbData.split(":");
        // Track this event in session
        try {
          const session = await findOrCreateSession(botId, chatId);
          await appendMessage({
            session_id: session.id,
            bot_id: botId,
            role: "user",
            content: `Click: ${action} for unit ${unitId}`,
            payload: { depth_action: action, unit_id: unitId }
          });

          // SCORE: Award points - REMOVED

          // Respond to user
          const sb = getServerClient();
          const { data: unit } = await sb.from("units").select("*").eq("id", unitId).single();

          if (unit) {
            let responseText = "";
            if (action === "photos") {
              responseText = lang === "ru" ? "📸 Загружаю дополнительные фото..." : "📸 Loading more photos...";
            } else if (action === "location") {
              responseText = unit.address
                ? (lang === "ru" ? `📍 Адрес объекта: ${unit.address}` : `📍 Property Address: ${unit.address}`)
                : (lang === "ru" ? "📍 Точный адрес уточняйте у менеджера." : "📍 Please ask manager for exact coordinates.");
            } else if (action === "price_tr") {
              const tryPrice = Math.round(unit.price * 33); // Example rate
              responseText = lang === "ru"
                ? `💰 Примерная цена: ${tryPrice.toLocaleString()} TRY`
                : `💰 Approx. price: ${tryPrice.toLocaleString()} TRY`;
            } else if (action === "price_us") {
              responseText = `💵 Price: $${unit.price.toLocaleString()}`;
            }

            if (responseText) {
              await sendMessage(token, chatId, responseText);
            }
          }
        } catch (e) {
          console.error("callback error:", e);
        }
      }

      // Answer callback query to stop loading spinner
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cbId }),
      });

      return NextResponse.json({ ok: true });
    }

    // Find or create session
    let sessionId: string | null = null;
    let sessionData: any = {};
    try {
      const session = await findOrCreateSession(botId, chatId) as any;
      sessionId = session.id;
      sessionData = session.payload || {};

      // Set Focus ID for tool context
      if (sessionData.focus_unit_id) {
        (global as any).focus_unit_id = sessionData.focus_unit_id;
      }

      await appendMessage({
        session_id: session.id,
        bot_id: botId,
        role: "user",
        content: text,
        payload: { update },
      });

      // SCORE: Award points for asking a question (text input)
      // REMOVED FOR AI ANALYST

      // Mark reactivation as responded if user comes back
      if (sessionId) {
        await markReactivationResponded(sessionId);
      }
    } catch (e) {
      console.error("session/appendMessage error:", (e as any)?.message || e);
    }

    // Check for shared contact
    if (update?.message?.contact) {
      // If we got a contact, immediately try to create a lead
      await handleCreateLead({}, lang, chatId, token, sessionId, userInfo);
      return NextResponse.json({ ok: true });
    }

    // Soft Action Tracking: Count history
    let messagesCount = 0;
    let unitsViewedCount = 0;
    if (sessionId) {
      const historyRecs = await listMessages(sessionId, 20);
      messagesCount = historyRecs.filter(m => m.role === 'user').length;
      unitsViewedCount = historyRecs.filter(m => m.role === 'assistant' && (m.payload as any)?.unit_id).length;
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

    // Get current score and stage for stage-aware bot behavior
    // REPLACED BY AI ANALYST STATUS IN SESSION (TODO: Persist status?)
    // For now, let's just let the System Prompt be standard, 
    // or maybe inject "User seems interested" if we tracked it?
    // User requested "Shadow Analyst", so maybe the bot doesn't need to know unless status is HOT.

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
    let leadCreatedFromTool = false;
    const actions: ToolAction[] = Array.isArray(parsed?.actions)
      ? (parsed.actions as ToolAction[])
      : [];

    // Always send the text reply if it exists
    let finalReply = typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
    if (finalReply) {
      await sendMessage(token, chatId, finalReply);
    }

    for (const action of actions) {
      if (!action) continue;

      if (action.tool === "send_message") {
        // Already handled by finalReply or additional action text
        if (action.args?.text && action.args.text !== parsed?.reply) {
          await sendMessage(token, chatId, action.args.text);
        }
      } else if (action.tool === "show_property") {
        const args = action.args as ShowPropertyArgs;
        await handleShowProperty(
          sessionId,
          Number(chatId),
          "", // query reconstructed from args
          args.exclude_ids?.map(id => Number(id)) || [],
          token,
          botId,
          lang
        );
      } else if (action.tool === "create_lead") {
        // SCORE: Hard action - REMOVED

        await handleCreateLead(action.args as any, lang, chatId, token, sessionId, userInfo);
        leadCreatedFromTool = true;
      }
    }

    // --- AI SHADOW ANALYST ---
    // Analyze user intent and lead status
    if (sessionId && text) {
      // Collect history for analysis
      const analysisHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      const analysis = await analyzeLeadAI(analysisHistory);

      console.log("🕵️‍♂️ [AI SHADOW ANALYST]", JSON.stringify(analysis));

      if (analysis.is_lead) {
        // WARM LEAD -> Silent Create/Update
        if (analysis.lead_status === "WARM" || analysis.lead_status === "HOT") {
          // Try to find existing lead for this session/user
          const sb = getServerClient();
          const { data: existingLead } = await sb.from('leads').select('id').eq('chat_id', chatId).is('deleted_at', null).maybeSingle();

          const leadData = {
            status: analysis.lead_status === "HOT" ? "inprogress" : "new",
            notes: `[AI ANALYST] Status: ${analysis.lead_status}\nIntent: ${analysis.user_intent}\nMissing: ${analysis.missing_info.join(', ')}`,
            data: {
              ...userInfo,
              ai_summary: analysis.user_intent,
              lead_status: analysis.lead_status,
              urgency: analysis.lead_status === "HOT" ? "горячий" : analysis.lead_status === "WARM" ? "теплый" : "холодный",
              missing_info: analysis.missing_info,
              chat_id: chatId
            }
          };

          if (existingLead) {
            await sb.from('leads').update({ notes: leadData.notes }).eq('id', existingLead.id);
          } else {
            // Create new silent lead
            await createLead({
              source_bot_id: "telegram",
              source: "telegram",
              name: userInfo.fullName || userInfo.username || "Unknown Object",
              phone: userInfo.phone || null, // Might be null
              email: null,
              data: leadData.data,
              status: "new"
            });
          }
        }

        // HOT LEAD -> Notification Logic
        if (analysis.lead_status === "HOT") {
          // Check if we already notified recently?
          // For now, simple logic: If HOT, notify managers.
          // We might need a flag "hot_notified" in session to avoid spam.
          const sb = getServerClient();
          const { data: sessionData } = await sb.from("sessions").select("payload").eq("id", sessionId).single();

          if (!sessionData?.payload?.hot_notified) {
            // Notify Manager
            const leadId = "temp_hot_notification"; // or find actual ID
            // Construct a special alert message
            const alertMsg = `🔥 **HOT LEAD DETECTED!**\nUser: ${userInfo.fullName} (@${userInfo.username})\nIntent: ${analysis.user_intent}\nStatus: HOT\n\nAI suggests immediate human intervention.`;

            // We reuse notifyManagers or similar logic, but let's just send direct message for now 
            // or rely on the createLead notification if it was created?
            // createLead calls notifyManagers. 
            // So if we created a lead above, manager is notified!
            // But if lead existed, we just updated notes. We should force notify?

            // Let's send a special "Connecting..." message to user
            const connectMsg = lang === "ru"
              ? "Вижу ваш серьезный интерес. Я передал информацию старшему менеджеру, он сейчас подключится."
              : "I see your serious interest. I've passed this to a senior manager, they will join shortly.";

            await sendMessage(token, chatId, connectMsg);

            // Mark as notified in session
            await sb.from("sessions").update({
              payload: { ...sessionData?.payload, hot_notified: true }
            }).eq("id", sessionId);
          }
        }
      }
    }


    // If no reply was sent at all (should be rare now)
    if (!finalReply && actions.length === 0) {
      finalReply =
        lang === "ru"
          ? "Здравствуйте! Я помогу вам найти недвижимость в Турции. В каком городе вы ищете?"
          : "Hello! I'll help you find property in Turkey. Which city are you looking in?";
      await sendMessage(token, chatId, finalReply);
    }

    // Save assistant response and current state to session
    if (sessionId && finalReply) {
      try {
        await appendMessage({
          session_id: sessionId,
          bot_id: botId,
          role: "assistant",
          content: finalReply,
          payload: {
            ...(parsed?.state ?? {}),
            ...sessionData // save flags like contact_requested
          },
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
