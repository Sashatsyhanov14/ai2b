import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";
import { normalizeCity } from "@/lib/cityNormalizer";
import { runUnitTranslationAgent } from "@/services/bot/ai/agents";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = getServerClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || searchParams.get("type"); // backward compatibility for 'type'
    const id = searchParams.get("id");

    let query = supabase
      .from("units")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) query = query.eq("id", id);
    if (category) query = query.eq("category", category);

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

    const category = body.category || body.type || "sale";

    // 1. AI Translation
    console.log(`[API Units] Translating for category: ${category}`);
    const translationResult = await runUnitTranslationAgent({
      title: body.title,
      city: body.city,
      address: body.address,
      description: body.description,
    });

    const baseEn = translationResult?.base_en || {};
    const i18nData = translationResult?.i18n || { ru: {}, tr: {} };

    // 2. Prepare Payload
    const payload = {
      category,
      title: baseEn.title ?? body.title ?? null,
      city: baseEn.city ? normalizeCity(baseEn.city) : body.city ? normalizeCity(body.city) : null,
      address: baseEn.address ?? body.address ?? null,
      description: baseEn.description ?? body.description ?? null,

      // Common Specs
      rooms: body.rooms ?? null,
      floor: body.floor ?? null,
      floors_total: body.floors_total ?? body.total_floors ?? null,
      area_m2: body.area_m2 ?? body.area ?? null,
      price: body.price ?? body.price_total ?? null,

      // Rental Specs (New)
      price_per_day: body.price_per_day ?? null,
      price_per_month: body.price_per_month ?? null,
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      max_guests: body.max_guests ?? null,

      features: body.features ?? [],
      ai_instructions: body.ai_instructions ?? null,
      i18n: i18nData,
      photos: Array.isArray(body.photos) ? body.photos : [],
      is_active: true,
    };

    const { data, error } = await supabase
      .from("units")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ unit: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
