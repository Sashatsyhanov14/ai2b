import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

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
    // is_rent removed from schema. Filter by type if needed, but for now units table is all sales.

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

    const payload = {
      project_id: body.project_id ?? null,
      type: body.type ?? "apartment",
      title: body.title ?? null,
      city: body.city ?? null,
      address: body.address ?? null,
      rooms: body.rooms ?? null,
      floor: body.floor ?? null,
      floors_total: body.floors_total ?? body.total_floors ?? null,
      area: body.area_m2 ?? body.area ?? null,
      price: body.price_total ?? body.price ?? null,
      description: body.description ?? null,
      // is_rent removed
      // meta: body.meta ?? {}, // meta removed from schema? No, checked schema, it doesn't have meta.
      // Schema has: title, description, features[], project_id, is_active.
      // Payload should match schema.
      features: body.features ?? [],
      ai_instructions: body.ai_instructions ?? null,
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
