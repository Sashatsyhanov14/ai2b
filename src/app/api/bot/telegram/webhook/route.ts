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
export const dynamic = 'force-dynamic';

type Lang = "ru" | "en";

type ToolAction =
  | {
    tool: "send_message";
    args: { text: string };
  }
  | {
    tool: "show_apartment";
    args: {
      city?: string | null;
      dates?: { from?: string | null; to?: string | null } | null;
      rental_type?: string | null;
      guests?: number | null;
      exclude_ids?: string[] | null;
      caption?: string | null;
    };
  }
  | {
    tool: "create_lead";
    args: {
      unit_id?: string | null;
      apartment_id?: string | null; // backward compatibility
      name?: string | null;
      phone?: string | null;
      city?: string | null;
      dates?: { from?: string | null; to?: string | null } | null;
      rental_type?: string | null;
      guests?: number | null;
    };
  };

type ShowApartmentArgs = Extract<
  ToolAction,
  { tool: "show_apartment" }
>["args"];
type CreateLeadArgs = Extract<ToolAction, { tool: "create_lead" }>["args"];

type LlmPayload = {
  reply?: string;
  step?: string;
  intent?: string | null;
  state?: {
    mode?: "rent" | "buy" | "unknown" | string;
    city?: string | null;
    dates?: { from?: string | null; to?: string | null } | null;
    rental_type?: "daily" | "long" | null | string;
    guests?: number | null;
    current_unit_id?: string | null;
    shown_unit_ids?: string[];
    [key: string]: any;
  } | null;
  actions?: ToolAction[];
};

function detectLang(code?: string | null): Lang {
  if (!code) return "en";
  const c = code.toLowerCase();
  if (c.startsWith("ru") || c.startsWith("uk") || c.startsWith("be")) {
    return "ru";
  }
  return "en";
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

async function sendUnitPhotos(
  token: string,
  chatId: string,
  unitId: string,
  caption: string,
) {
  const sb = getServerClient();
  const { data: photos } = await sb
    .from("unit_photos")
    .select("url")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true })
    .limit(10);

  if (!photos || photos.length === 0) {
    return;
  }

  if (photos.length === 1) {
    await sendPhoto(token, chatId, (photos[0] as any).url as string, caption);
  } else {
    const media = (photos as any[]).map(
      (p: { url: string }, idx: number) => ({
        type: "photo" as const,
        media: p.url,
        caption: idx === 0 ? caption : undefined,
      }),
    );
    await sendMediaGroup(token, chatId, media);
  }
}

function normalizeCity(raw: string): string {
  const city = raw.trim();
  const lc = city.toLowerCase();
  if (lc.startsWith("антал")) return "Antalya";
  if (lc.startsWith("алан") || lc.startsWith("алани")) return "Alanya";
  if (lc.startsWith("стамбул")) return "Istanbul";
  if (lc.startsWith("дубай")) return "Dubai";
  return city;
}

function buildRentDescription(
  unit: any,
  lang: Lang,
  rentalType?: string | null,
): string {
  const city = unit.city || "-";
  const rooms =
    typeof unit.rooms === "number"
      ? unit.rooms === 1
        ? lang === "ru"
          ? "студия"
          : "studio"
        : lang === "ru"
          ? `${unit.rooms}-комнатная квартира`
          : `${unit.rooms}-room apartment`
      : lang === "ru"
        ? "квартира"
        : "apartment";

  const type = (rentalType ?? "").toString().toLowerCase();

  let priceText: string;
  if (type === "long") {
    const priceMonth =
      typeof unit.price_month === "number"
        ? lang === "ru"
          ? `${unit.price_month} €/месяц`
          : `${unit.price_month} €/month`
        : lang === "ru"
          ? "цена по запросу"
          : "price on request";

    const minTermText =
      typeof unit.min_term === "number" && unit.min_term > 1
        ? lang === "ru"
          ? `минимум ${unit.min_term} мес.`
          : `minimum ${unit.min_term} months`
        : "";

    priceText = minTermText ? `${priceMonth}, ${minTermText}` : priceMonth;
  } else {
    const priceDay =
      typeof unit.price_day === "number"
        ? lang === "ru"
          ? `${unit.price_day} €/день`
          : `${unit.price_day} €/day`
        : null;
    const priceWeek =
      typeof unit.price_week === "number"
        ? lang === "ru"
          ? `${unit.price_week} €/неделя`
          : `${unit.price_week} €/week`
        : null;

    priceText =
      priceDay && priceWeek
        ? `${priceDay}, ${priceWeek}`
        : priceDay || priceWeek || (lang === "ru" ? "цена по запросу" : "price on request");
  }

  const pets =
    unit.allow_pets === true
      ? lang === "ru"
        ? "можно с питомцами"
        : "pets allowed"
      : lang === "ru"
        ? "без животных"
        : "no pets";

  if (lang === "ru") {
    return `${rooms} в ${city}. ${priceText}. ${pets}.`;
  }
  return `${rooms} in ${city}. ${priceText}. ${pets}.`;
}

async function handleShowApartment(
  args: ShowApartmentArgs | undefined,
  lang: Lang,
  chatId: string,
  token: string,
  sessionId: string | null,
  botId: string,
) {
  const rawCity = (args?.city ?? "").trim();
  const cityFilter = rawCity ? normalizeCity(rawCity) : "";

  let exclude: string[] =
    Array.isArray(args?.exclude_ids) && args?.exclude_ids.length
      ? args.exclude_ids.map((id) => String(id))
      : [];

  let rentalType: "short" | "long" = "short";
  const requestedType = (args?.rental_type ?? "").toString().toLowerCase();
  if (requestedType === "short" || requestedType === "long") {
    rentalType = requestedType as "short" | "long";
  } else {
    const from = args?.dates?.from;
    const to = args?.dates?.to;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays >= 30) {
          rentalType = "long";
        }
      }
    }
  }

  const sb = getServerClient();
  let data: any[] = [];
  let error: any = null;

  // Если LLM не передал exclude_ids, попробуем автоматически исключить
  // последнюю показанную квартиру из этой же сессии и города.
  if (!exclude.length && sessionId) {
    try {
      const history = await listMessages(sessionId, 50);
      if (history && history.length) {
        const exclSet = new Set<string>();
        for (let i = history.length - 1; i >= 0; i -= 1) {
          const m = history[i] as any;
          if (m.role !== "assistant" || !m.payload) continue;
          const payloadCity = (m.payload.city ?? "") as string;
          const payloadUnitId = m.payload.unit_id;
          if (!payloadUnitId) continue;
          if (
            cityFilter &&
            payloadCity &&
            normalizeCity(String(payloadCity)) !== cityFilter
          ) {
            continue;
          }
          exclSet.add(String(payloadUnitId));
        }
        if (exclSet.size) {
          exclude = Array.from(exclSet);
        }
      }
    } catch (e) {
      console.error(
        "handleShowApartment history exclude error:",
        (e as any)?.message || e,
      );
    }
  }

  if (rentalType === "long") {
    try {
      let query = sb
        .from("rent_long_units")
        .select(
          "id, city, address, rooms, price_month, min_term, allow_pets, is_occupied, description, created_at",
        )
        .eq("is_occupied", false)
        .order("created_at", { ascending: false });

      if (cityFilter) {
        query = query.ilike("city", `%${cityFilter}%`);
      }

      const result = await query.limit(10);
      data = result.data ?? [];
      error = result.error;
    } catch (e) {
      error = e;
    }
  } else {
    try {
      let query = sb
        .from("rent_daily_units")
        .select(
          "id, city, address, rooms, price_day, price_week, allow_pets, description, created_at",
        )
        .order("created_at", { ascending: false });

      if (cityFilter) {
        query = query.ilike("city", `%${cityFilter}%`);
      }

      const result = await query.limit(10);
      data = result.data ?? [];
      error = result.error;
    } catch (e) {
      error = e;
    }
  }

  if (error) {
    console.error("show_apartment query error:", (error as any)?.message || error);
    const msg =
      lang === "ru"
        ? "Не удалось получить объекты из базы."
        : "Failed to load apartments from the database.";
    await sendMessage(token, chatId, msg);
    return;
  }

  const list = (data ?? []).filter(
    (unit: any) => !exclude.includes(String(unit.id)),
  );
  const unit = list[0];

  if (!unit) {
    const msg =
      lang === "ru"
        ? "По этим параметрам сейчас нет доступных вариантов."
        : "No matching apartments for these parameters.";
    await sendMessage(token, chatId, msg);
    return;
  }

  const baseHeader = buildRentDescription(unit, lang, rentalType);

  const descRaw =
    typeof unit.description === "string" && unit.description.trim().length
      ? unit.description.trim()
      : null;
  const shortDesc =
    descRaw && descRaw.length > 220 ? `${descRaw.slice(0, 220)}…` : descRaw;

  const addressLine =
    unit.address && typeof unit.address === "string" && unit.address.trim().length
      ? lang === "ru"
        ? `Адрес: ${unit.address.trim()}.`
        : `Address: ${unit.address.trim()}.`
      : null;

  const question =
    lang === "ru"
      ? "Подходит или показать другой вариант?"
      : "Does this work for you, or should I show another option?";

  const headerParts = [baseHeader, addressLine, shortDesc, question].filter(
    Boolean,
  ) as string[];
  const header = headerParts.join(" ");

  await sendUnitPhotos(token, chatId, unit.id as string, header);

  if (sessionId) {
    try {
      await appendMessage({
        session_id: sessionId,
        bot_id: botId,
        role: "assistant",
        content: header,
        payload: { unit_id: unit.id, city: unit.city, rental_type: rentalType },
      });
    } catch (e) {
      console.error(
        "appendMessage show_apartment error:",
        (e as any)?.message || e,
      );
    }
  }
}

async function notifyManagersAboutLead(
  lang: Lang,
  token: string,
  leadId: string,
  payload: {
    city?: string | null;
    dates?: { from?: string | null; to?: string | null } | null;
    rentalType?: string | null;
    apartmentId?: string | null;
    chatId: string;
  },
) {
  try {
    const sb = getServerClient();
    const { data: managers, error } = await sb
      .from("telegram_managers")
      .select("telegram_id, name, is_active")
      .eq("is_active", true);

    if (error || !managers || managers.length === 0) {
      return;
    }

    const city = payload.city ?? null;
    const dates = payload.dates ?? null;
    const rentalType = (payload.rentalType ?? "").toString().toLowerCase();
    const apartmentId = payload.apartmentId ?? null;
    const chatId = payload.chatId;

    const datesText =
      dates && dates.from
        ? dates.to
          ? `${dates.from}–${dates.to}`
          : `${dates.from}`
        : null;

    for (const m of managers as any[]) {
      const mgrId = m.telegram_id;
      if (!mgrId) continue;

      const baseRu = [
        "Новый лид из Telegram.",
        city ? `Город: ${city}.` : null,
        rentalType ? `Тип аренды: ${rentalType}.` : null,
        datesText ? `Даты: ${datesText}.` : null,
        apartmentId ? `Квартира: ${apartmentId}.` : null,
        `Чат клиента: ${chatId}.`,
        `ID лида: ${leadId}.`,
      ]
        .filter(Boolean)
        .join(" ");

      const baseEn = [
        "New lead from Telegram.",
        city ? `City: ${city}.` : null,
        rentalType ? `Rental type: ${rentalType}.` : null,
        datesText ? `Dates: ${datesText}.` : null,
        apartmentId ? `Apartment: ${apartmentId}.` : null,
        `Client chat: ${chatId}.`,
        `Lead id: ${leadId}.`,
      ]
        .filter(Boolean)
        .join(" ");

      const msg = lang === "ru" ? baseRu : baseEn;
      await sendMessage(token, String(mgrId), msg);
    }
  } catch (e) {
    console.error(
      "notifyManagersAboutLead error:",
      (e as any)?.message || e,
    );
  }
}

async function handleCreateLeadWithContracts(
  args: CreateLeadArgs | undefined,
  lang: Lang,
  chatId: string,
  token: string,
) {
  const unitId = args?.unit_id ?? args?.apartment_id ?? null;

  if (!unitId) {
    const msg =
      lang === "ru"
        ? "Не удалось создать лид: отсутствует apartment_id."
        : "Cannot create lead: apartment_id is missing.";
    await sendMessage(token, chatId, msg);
    return;
  }

  try {
    const lead = await createLead({
      source_bot_id: "telegram",
      source: "telegram",
      name: args?.name ?? null,
      phone: args?.phone ?? null,
      email: null,
      data: {
        apartment_id: unitId,
        unit_id: unitId,
        city: args?.city ?? null,
        dates: args?.dates ?? null,
        rental_type: args?.rental_type ?? null,
        guests: args?.guests ?? null,
        chat_id: chatId,
      },
      status: "new",
    });

    const rentalType = (args?.rental_type ?? "").toString().toLowerCase();
    if (rentalType === "long") {
      try {
        const sb = getServerClient();

        await sb
          .from("rent_long_units")
          .update({ is_occupied: true })
          .eq("id", unitId);

        const fromRaw = args?.dates?.from ?? null;
        if (fromRaw) {
          const start = new Date(fromRaw);
          if (!Number.isNaN(start.getTime())) {
            const startStr = start.toISOString().slice(0, 10);

            let months = 1;
            try {
              const { data: unitRows } = await sb
                .from("rent_long_units")
                .select("min_term")
                .eq("id", unitId)
                .limit(1);
              const minTerm = unitRows?.[0]?.min_term;
              if (typeof minTerm === "number" && minTerm > 0) {
                months = minTerm;
              }
            } catch (e) {
              console.error(
                "rent_long_units min_term fetch error:",
                (e as any)?.message || e,
              );
            }

            const review = new Date(start);
            review.setMonth(review.getMonth() + months);
            const reviewStr = review.toISOString().slice(0, 10);

            const meta: any = {
              rental_type: rentalType,
              dates: args?.dates ?? null,
              guests: args?.guests ?? null,
            };

            const { error: contractError } = await sb
              .from("rent_long_contracts")
              .insert({
                unit_id: unitId,
                lead_id: lead.id,
                tenant_name: null,
                telegram_id: chatId,
                start_date: startStr,
                review_date: reviewStr,
                status: "active",
                meta,
              });

            if (contractError) {
              console.error(
                "create rent_long_contract error:",
                contractError.message,
              );
            }
          }
        }
      } catch (e) {
        console.error(
          "mark rent_long_units occupied / contract error:",
          (e as any)?.message || e,
        );
      }
    }

    await notifyManagersAboutLead(lang, token, lead.id as string, {
      city: args?.city ?? null,
      dates: args?.dates ?? null,
      rentalType: args?.rental_type ?? null,
      apartmentId: unitId,
      chatId,
    });
  } catch (e) {
    console.error("createLeadWithContracts error:", (e as any)?.message || e);
    const msg =
      lang === "ru" ? "Не удалось создать лид." : "Failed to create lead.";
    await sendMessage(token, chatId, msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json().catch(() => ({}))) as any;

    const message =
      update?.message ??
      update?.edited_message ??
      update?.callback_query?.message ??
      null;

    const chatIdRaw =
      message?.chat?.id ??
      update?.chat?.id ??
      update?.message?.from?.id ??
      null;

    const chatId =
      chatIdRaw !== null && chatIdRaw !== undefined
        ? String(chatIdRaw)
        : null;

    const text: string =
      message?.text ??
      update?.message?.text ??
      update?.edited_message?.text ??
      update?.callback_query?.data ??
      update?.text ??
      "";

    const langCode: string | null =
      message?.from?.language_code ??
      update?.message?.from?.language_code ??
      null;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const lang = detectLang(langCode);
    const trimmed = text.trim();
    const botId = process.env.TELEGRAM_BOT_ID || "telegram-single";

    try {
      await sendTyping(token, chatId);
    } catch {
      // ignore
    }

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

    const photoCmd = trimmed.match(/^\/photo\s+([A-Za-z0-9-]+)$/i);

    if (photoCmd) {
      const unitId = photoCmd[1];

      try {
        const sb = getServerClient();
        const { data: photos, error } = await sb
          .from("unit_photos")
          .select("url")
          .eq("unit_id", unitId)
          .order("sort_order", { ascending: true })
          .limit(10);

        if (error || !photos || photos.length === 0) {
          const msg =
            lang === "ru"
              ? "Фото для этого объекта не найдены."
              : "No photos found for this listing.";
          await sendMessage(token, chatId, msg);
        } else if (photos.length === 1) {
          await sendPhoto(token, chatId, photos[0].url as string, undefined);
        } else {
          const media = (photos as { url: string }[]).map((p, idx) => ({
            type: "photo" as const,
            media: p.url,
            caption:
              idx === 0
                ? lang === "ru"
                  ? `Фото по объекту #${unitId}`
                  : `Photos for listing #${unitId}`
                : undefined,
          }));
          await sendMediaGroup(token, chatId, media);
        }
      } catch (e) {
        const errMsg = (e as any)?.message || e;
        console.error("photo album error:", errMsg);
        const msg =
          lang === "ru"
            ? "Не удалось загрузить фотографии для этого объекта."
            : "Failed to load photos for this listing.";
        await sendMessage(token, chatId, msg);
      }

      return NextResponse.json({ ok: true, mode: "photo" });
    }

    // "Хочу предыдущий" — показать прошлый вариант ещё раз
    const lower = trimmed.toLowerCase();
    const wantsPrevious =
      lower.includes("предыдущ") || lower.includes("previous");

    if (wantsPrevious && sessionId) {
      try {
        const history = await listMessages(sessionId, 30);
        if (history && history.length) {
          const assistants = history
            .filter((m: any) => m.role === "assistant" && m.payload)
            .sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );

          const lastTwo = assistants.slice(-2);
          const previousPayload =
            lastTwo.length === 2
              ? (lastTwo[0] as any).payload
              : lastTwo.length === 1
                ? (lastTwo[0] as any).payload
                : null;

          if (previousPayload?.unit_id) {
            const prevUnitId = String(previousPayload.unit_id);
            const rentalType =
              (previousPayload.rental_type ?? "short").toString().toLowerCase();
            const tableName =
              rentalType === "long" ? "rent_long_units" : "rent_daily_units";

            const sb = getServerClient();
            const { data: rows, error } = await sb
              .from(tableName)
              .select(
                "id, city, address, rooms, price_day, price_week, price_month, min_term, allow_pets, description",
              )
              .eq("id", prevUnitId)
              .limit(1);

            if (!error && rows && rows[0]) {
              const unit = rows[0] as any;
              const header = buildRentDescription(
                unit,
                lang,
                rentalType === "long" ? "long" : "short",
              );
              const caption =
                lang === "ru"
                  ? `${header} Это тот предыдущий вариант. Подходит или показать другой?`
                  : `${header} This is the previous option. Does it work for you, or should I show another one?`;

              await sendUnitPhotos(token, chatId, prevUnitId, caption);

              try {
                await appendMessage({
                  session_id: sessionId,
                  bot_id: botId,
                  role: "assistant",
                  content: caption,
                  payload: {
                    unit_id: prevUnitId,
                    city: unit.city,
                    rental_type: rentalType,
                  },
                });
              } catch (e) {
                console.error(
                  "appendMessage previous apartment error:",
                  (e as any)?.message || e,
                );
              }

              return NextResponse.json({ ok: true, mode: "previous" });
            }
          }
        }
      } catch (e) {
        console.error(
          "previous apartment handler error:",
          (e as any)?.message || e,
        );
      }

      const msg =
        lang === "ru"
          ? "Предыдущий вариант не найден, но могу подобрать ещё квартиры по тем же параметрам."
          : "I couldn't find the previous option, but I can show more apartments for the same request.";
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true, mode: "previous-miss" });
    }

    const phoneMatch = trimmed.match(/(\+?\d[\d\s\-()]{6,}\d)/);
    const emailMatch = trimmed.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    );

    if (phoneMatch || emailMatch) {
      const phone = phoneMatch ? phoneMatch[1].trim() : null;
      const email = emailMatch ? emailMatch[0].trim() : null;
      let leadId: string | null = null;
      try {
        const sb = getServerClient();

        const { data: existing, error } = await sb
          .from("leads")
          .select("id, phone, email, data")
          .eq("source", "telegram")
          .contains("data", { chat_id: chatId })
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && existing && existing.length) {
          const target = existing[0] as any;
          const update: any = {};
          if (phone) update.phone = phone;
          if (email) update.email = email;
          const { error: updError } = await sb
            .from("leads")
            .update(update)
            .eq("id", target.id);
          if (updError) {
            console.error("update lead phone error:", updError.message);
          } else {
            leadId = String(target.id);
          }
        } else {
          const newLead = await createLead({
            source_bot_id: botId,
            source: "telegram",
            name: null,
            phone,
            email,
            data: { text, chat_id: chatId },
            status: "new",
          });
          leadId = String(newLead.id);
        }

        if (leadId) {
          await notifyManagersAboutLead(lang, token, leadId, {
            city: null,
            dates: null,
            rentalType: null,
            apartmentId: null,
            chatId,
          });
        }

        const confirm =
          lang === "ru"
            ? "Принял. Менеджер скоро свяжется с вами."
            : "I've recorded your interest. A manager will contact you soon.";
        await sendMessage(token, chatId, confirm);
        return NextResponse.json({ ok: true, mode: "lead-with-contact" });
      } catch (e) {
        console.error(
          "lead phone/email handling error:",
          (e as any)?.message || e,
        );
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      const msg =
        lang === "ru"
          ? "LLM ошибка конфигурации: переменная OPENROUTER_API_KEY не установлена на сервере."
          : "LLM config error: environment variable OPENROUTER_API_KEY is not set on the server.";
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true, mode: "config-error" });
    }

    const legacySystemPrompt = `You are a Telegram real-estate rental agent. Always reply in the same language the user writes in.

# Goal
Collect rental details, show suitable apartments one by one, and create a lead when the user chooses a property.

# STRICT DIALOG FLOW (mandatory)
1. Start with a warm, human greeting (as a real realtor, no emojis), then ask whether the user wants: rent or buy.
2. Ask for the city.
3. Ask for the exact dates.
4. Internally decide whether the rental is short-term (daily) or long-term based on the dates (up to about 30 days → short-term, longer stays → long-term). Do NOT ask the user this question unless they explicitly talk about long-term or short-term.
5. Do NOT ask how many people will live there; use this information only if the user shares it on their own.
6. Show the first apartment (short description + photo album).
7. Ask one short question: "Does it work for you?"
   - If no → show the next apartment.
   - If the user asks details → answer based on the database only.
8. If the user says "yes / works / suitable" → ask politely for a contact phone / WhatsApp, and only after they send it, use the create_lead tool.

# BEHAVIOR RULES (highest priority)
- Short replies only (2-3 short sentences maximum).
- Warm, friendly and polite tone. No aggressive, cold or robotic phrases.
- You may use short polite phrases, but avoid long scripted intros.
- Address the user respectfully (normally on "вы"); if they share their name, occasionally use it.
- No small talk and no empty filler, but you may sound friendly.
- Never use predefined answer options ("1/2", "yes/no", etc.).
- Do not ask extra questions outside the strict dialog flow.
- Never repeat exactly the same question twice in a row.
- If the user answers a different step than you asked (for example, says "long-term" when you asked for dates), treat that information as the next step and move the dialog forward; gently clarify missing details once, but do not spam the same question again.
- Do not speak on behalf of managers or offer bookings yourself.
- Do not use phrases like "let's look", "of course", "I understand".
- Use only real data from the database (never invent anything).
- Always stay strictly on topic.

# VARIETY / NO TEMPLATE RULES
- Do not start every message with the same word like "Понял", "Хорошо", "Ок". Vary openings or skip them entirely.
- Prefer to answer сразу по сути, without meta-phrases about what you are going to do.
- Do not repeat identical sentences in consecutive replies; change wording and structure so speech feels natural.
- If there is nothing important to add, answer shorter instead of padding with generic phrases.
- Never explain your internal logic ("сейчас подберу", "тогда сделаю..."), just ask the next question or show an apartment.

# APARTMENT PRESENTATION (strict)
Once all required data is collected:
1) Provide a short description of the apartment (max 2 sentences).
2) Mention the price.
3) Mention the district or nearby landmarks (if available).
4) Assume the backend can send a full photo album (all available photos) when you describe the apartment.
5) Ask one question: "Does it work for you? I can show another option."

# IF USER SAYS "ANOTHER OPTION"
- Simply show the next apartment using the same structure.
- No extra clarifying questions.
- No commentary or reasoning.

# USER QUESTIONS ABOUT THE APARTMENT
If the user asks about the apartment (district, price, sea distance, pets, children, etc.):
- answer briefly and only based on database facts;
- never invent additional information;
- do NOT call the tool "show_apartment" again in this case, just use "send_message" to answer the question about the current apartment.

# LEAD CREATION
When the user says "works", "yes", "I'll take it", "suitable":
- if you do NOT yet know the user's phone / WhatsApp, do NOT call "create_lead"; instead, send a short message asking politely for a contact number;
- when the user sends a phone number or WhatsApp, THEN call "create_lead" with city, dates, rental type, number of people (if known) and apartment ID;
- after the lead is created, reply to the user IN THE USER'S LANGUAGE, for example:
  - if user writes in Russian: "Принял. Менеджер скоро свяжется с вами."
  - otherwise: "I've recorded your interest. A manager will contact you soon."

# PROHIBITED
- Long messages of any kind.
- Describing "atmosphere", "quiet area", "cozy place", or other vague filler.
- Repeating questions that have already been asked.
- Offering booking on your own.
- Breaking the dialog flow.

# RESPONSE FORMULA (always follow)
- Maximum meaning in minimum words.
- No extra sentences.
- No intro phrases.
- Clear structure → action → next question.

# AVAILABLE TOOLS (use via "actions")
- send_message: { "text": "..." } → send a short text message.
- show_apartment: { "city": "...", "dates": {...}, "rental_type": "short|long", "guests": number, "exclude_ids": [] }
  → the backend will choose a real apartment from rent_daily_units (short) or rent_long_units (long), describe it, send the photo album and store the last shown ID.
- create_lead: { "apartment_id": "...", "city": "...", "dates": {...}, "rental_type": "...", "guests": number }
  → records the user's interest.

# OUTPUT FORMAT (mandatory)
Reply ONLY with a valid JSON object:
{
  "reply": "string",
  "step": "ask_intent | ask_city | ask_dates | show_apartment | ask_next | create_lead | idle",
  "intent": "rent | buy | unknown",
  "state": { ...rental data... },
  "actions": [
    {
      "tool": "send_message" | "show_apartment" | "create_lead",
      "args": { ...tool arguments... }
    }
  ]
}

Never return raw text outside JSON.`;

    const systemPrompt = `You are AI2B Telegram Real Estate Assistant.

You are a friendly, human-like rental agent that talks with users in Telegram and uses server tools to:
- send text messages,
- show apartments with photo albums,
- create leads in CRM.

You NEVER talk to the user directly by yourself.
Instead, you return a JSON object that describes:
- what you want to say to the user,
- which tools should be called,
- and how the current dialog state should change.

Your JSON format MUST ALWAYS be:

{
  "reply": "text you want to send to user (in user language)",
  "state": {
    "mode": "rent" | "buy" | "unknown",
    "city": string | null,
    "dates": { "from": string | null, "to": string | null } | null,
    "rental_type": "daily" | "long" | null,
    "guests": number | null,
    "current_unit_id": string | null,
    "shown_unit_ids": string[]
  },
  "actions": [
    {
      "tool": "send_message" | "show_apartment" | "create_lead",
      "args": object
    }
  ]
}

- If you don’t need any tools in this turn, return "actions": [].
- If some field is unknown, set it to null.
- NEVER output anything except this single JSON object.
- NO markdown, NO comments, NO explanations around JSON.

LANGUAGE & STYLE

- ALWAYS answer in the same language the user writes in (Russian, English, etc.).
- Tone: warm, polite, calm, like a good real estate agent.
- Messages must be short and natural: 1–3 short sentences.
- No emoji by default.
- No reply options or lists of suggested answers.

TOOLS (SERVER SIDE)

You can request these tools via the "actions" array:

1) send_message
   - Use to send plain text to the user.
   - Args: { "text": string }

2) show_apartment
   - Use to show one apartment from the database with a photo album and a caption.
   - The server will pick a unit from rent_daily_units or rent_long_units using your filters,
     load photos from unit_photos, send an album with your caption,
     and remember current_unit_id and add it to shown_unit_ids.
   - Args (all optional except city):
     {
       "city": string | null,
       "rental_type": "daily" | "long" | null,
       "dates": { "from": string | null, "to": string | null } | null,
       "guests": number | null,
       "exclude_ids": string[] | null,
       "caption": string | null
     }

3) create_lead
   - Use when the user clearly confirms that the apartment suits them and shares phone/contacts.
   - The server will create a lead, mark long‑term units as occupied if needed, and notify managers.
   - Args:
     {
       "unit_id": string | null,
       "name": string | null,
       "phone": string | null,
       "city": string | null,
       "rental_type": "daily" | "long" | null,
       "dates": { "from": string | null, "to": string | null } | null,
       "guests": number | null
     }

DIALOG FLOW (RENT FIRST)

- Greet politely, say you help with rentals and sales, and ask whether the user wants to rent or buy.
- For rent:
  - Ask city if unknown.
  - Ask dates. If the user writes about a long stay without an end date, treat it as long‑term with only start date.
  - Infer rental_type: short date range → "daily", long stay → "long". Only ask explicitly if still unclear.
  - Guests are optional; ask only if really needed.
  - As soon as mode="rent", city is known, and dates or rental_type are known, call show_apartment using state.
- For “ещё вариант / другой / next one”:
  - Call show_apartment again with the same filters and exclude_ids = shown_unit_ids.
- For questions about the current apartment:
  - Answer briefly with send_message, do not call show_apartment again.
- When the user chooses an apartment (“подходит”, “беру” etc.):
  - First ask for name and phone/WhatsApp if you don’t have them yet.
  - After user sends contacts, call create_lead with current_unit_id and state.
  - In reply, give a short confirmation that a manager will contact them.

CAPTION QUALITY
- When you call show_apartment, include a lively caption (2–3 short sentences) that:
  - mentions type/rooms, area/city,
  - price (per day for daily, per month for long-term),
  - 1–2 concrete features (furnished, balcony, near sea, pets ok, etc.),
  - ends with a soft question like “Подходит или показать другой?”.
  - no templates, no “варианты ответов”.

STATE HANDLING

- You receive previous state from the server (as JSON in the prompt under the "STATE:" section).
- Always read it, update it according to the new user message, and return updated state.
- Maintain shown_unit_ids to avoid repeating the same apartment.

Never output anything except the JSON object described above.`;

    let promptForLLM = trimmed || text || "";
    if (sessionId) {
      try {
        const history = await listMessages(sessionId, 20);
        if (history && history.length) {
          const ordered = [...history].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );

          // Try to find the last state
          let lastState: any = {};
          for (let i = ordered.length - 1; i >= 0; i--) {
            if (ordered[i].role === "assistant" && ordered[i].payload) {
              lastState = ordered[i].payload;
              break;
            }
          }

          const historyLines = ordered
            .map((m) => {
              const role =
                m.role === "assistant"
                  ? "assistant"
                  : m.role === "system"
                    ? "system"
                    : "user";
              return `${role}: ${m.content ?? ""}`;
            })
            .join("\n");

          promptForLLM = `${historyLines}\nuser: ${trimmed}\n\nSTATE:\n${JSON.stringify(lastState, null, 2)}`;
        }
      } catch (e) {
        console.error("listMessages error:", (e as any)?.message || e);
      }
    }

    let llmRaw: string;
    try {
      llmRaw = await askLLM(promptForLLM, systemPrompt);
    } catch (e) {
      const errMsg = (e as any)?.message || String(e);
      console.error("askLLM error:", errMsg);
      const msg =
        lang === "ru"
          ? "Ошибка LLM: " + errMsg
          : "LLM error: " + errMsg;
      await sendMessage(token, chatId, msg);
      return NextResponse.json({ ok: true, mode: "llm-error" });
    }

    let parsed: LlmPayload | null = null;
    try {
      let jsonText = llmRaw.trim();
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("LLM JSON parse error:", e);
      await sendMessage(token, chatId, llmRaw);
      return NextResponse.json({ ok: true, mode: "llm-text" });
    }

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
        if (typeof textToSend === "string") {
          const t = textToSend.trim();
          if (t) {
            await sendMessage(token, chatId, t);
            sentReply = true;
            finalReply = t;
          }
        }
      } else if (action.tool === "show_apartment") {
        await handleShowApartment(
          action.args,
          lang,
          chatId,
          token,
          sessionId,
          botId,
        );
        sentReply = true;
      } else if (action.tool === "create_lead") {
        await handleCreateLeadWithContracts(action.args, lang, chatId, token);
        sentReply = true;
      }
    }

    if (!sentReply) {
      const candidate =
        typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
      if (candidate) {
        finalReply = candidate;
      } else {
        finalReply =
          lang === "ru"
            ? "Принял. Напиши, пожалуйста, город и примерные даты, когда планируешь заехать."
            : "Got it. Please tell me the city and approximate dates when you plan to move in.";
      }
      await sendMessage(token, chatId, finalReply);
      sentReply = true;
    }

    if (sessionId && (finalReply || parsed?.reply)) {
      try {
        const contentToStore =
          finalReply ?? (parsed && typeof parsed.reply === "string"
            ? parsed.reply
            : "");
        if (!contentToStore) {
          return NextResponse.json({ ok: true });
        }
        await appendMessage({
          session_id: sessionId,
          bot_id: botId,
          role: "assistant",
          content: contentToStore,
          payload: parsed?.state ?? {},
        });
      } catch (e) {
        console.error(
          "appendMessage assistant error:",
          (e as any)?.message || e,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("webhook fatal error:", e?.message || e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
