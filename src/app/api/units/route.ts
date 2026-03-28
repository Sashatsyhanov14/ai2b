import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";
import { normalizeCity } from "@/lib/cityNormalizer";
import { runUnitTranslationAgent } from "@/services/bot/ai/agents";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = getServerClient();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    let query = supabase
      .from("units")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) query = query.eq("id", id);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ units: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getServerClient();
    const body = await req.json();

    // 1. Process translation using AI
    console.log("[API Units] Running Unit Translation Agent...");
    const translationResult = await runUnitTranslationAgent({
      title: body.title,
      city: body.city,
      address: body.address,
      description: body.description,
    });

    // Explicitly fallback if agent fails but returns original data
    const baseEn = translationResult?.base_en || {};
    const i18nData = translationResult?.i18n || { ru: {}, tr: {} };

    // 2. Prepare payload with English base and i18n JSON
    const payload = {
      project_id: body.project_id ?? null,
      type: body.type ?? "apartment",
      // AI Enforced English Base
      title: baseEn.title ?? body.title ?? null,
      city: baseEn.city ? normalizeCity(baseEn.city) : body.city ? normalizeCity(body.city) : null,
      address: baseEn.address ?? body.address ?? null,
      description: baseEn.description ?? body.description ?? null,

      rooms: body.rooms ?? null,
      floor: body.floor ?? null,
      floors_total: body.floors_total ?? body.total_floors ?? null,
      area_m2: body.area_m2 ?? body.area ?? null,
      price: body.price_total ?? body.price ?? null,

      features: body.features ?? [],
      ai_instructions: body.ai_instructions ?? null,

      // Store localized versions for dashboard
      i18n: i18nData,
    };

    const { data, error } = await supabase
      .from("units")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const unit = data as any;

    // Если из формы пришли фото, сохраняем их в unit_photos,
    // чтобы бот мог отправлять по /photo <id>
    const rawPhotos = Array.isArray(body.photos)
      ? body.photos
      : Array.isArray(body.meta?.photos)
        ? body.meta.photos
        : [];

    if (unit?.id && Array.isArray(rawPhotos) && rawPhotos.length) {
      const rows = (rawPhotos as unknown[])
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((url, index) => ({
          unit_id: unit.id,
          url,
          is_main: index === 0,
          sort_order: index,
        }));

      if (rows.length) {
        // Ошибку записи фото не считаем фатальной для создания квартиры
        const { error: photoError } = await supabase.from("unit_photos").insert(rows);
        if (photoError) {
          console.error("Failed to insert unit photos:", photoError.message);
        }
      }
    }

    return NextResponse.json({ unit: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
