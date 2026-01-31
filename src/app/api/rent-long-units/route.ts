import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export type RentLongUnit = {
  id: string;
  city: string;
  address: string;
  rooms: number;
  price_month: number;
  allow_pets: boolean;
  min_term: number;
   is_occupied: boolean;
  description: string | null;
  created_at: string;
};

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("rent_long_units")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ units: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const supabase = getServerClient();
    const body = await req.json();

    const city = String(body.city ?? "").trim();
    const address = String(body.address ?? "").trim();
    const rooms = Number(body.rooms ?? 0);
    const price_month = Number(body.price_month ?? 0);
    const allow_pets = Boolean(body.allow_pets ?? false);
    const min_term = Number(body.min_term ?? 1);
    const description =
      typeof body.description === "string" ? body.description : null;

    if (!city || !address || !rooms || !price_month) {
      return NextResponse.json(
        {
          error:
            "Поля city, address, rooms и price_month являются обязательными",
        },
        { status: 400 },
      );
    }

    if (Number.isNaN(rooms) || rooms <= 0) {
      return NextResponse.json(
        { error: "rooms должно быть числом > 0" },
        { status: 400 },
      );
    }

    if (Number.isNaN(price_month) || price_month <= 0) {
      return NextResponse.json(
        { error: "price_month должно быть числом > 0" },
        { status: 400 },
      );
    }

    const effectiveMinTerm = Number.isNaN(min_term) || min_term <= 0 ? 1 : min_term;

    const { data, error } = await supabase
      .from("rent_long_units")
      .insert({
        city,
        address,
        rooms,
        price_month,
        allow_pets,
        min_term: effectiveMinTerm,
        description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unit = data as any;

    // если пришёл массив photos, сохраняем ссылки в unit_photos
    const rawPhotos = Array.isArray(body.photos) ? body.photos : [];
    if (unit?.id && rawPhotos.length) {
      const rows = (rawPhotos as unknown[])
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((url, index) => ({
          unit_id: unit.id,
          url,
          is_main: index === 0,
          sort_order: index,
        }));

      if (rows.length) {
        const { error: photoError } =
          await supabase.from("unit_photos").insert(rows);
        if (photoError) {
          console.error(
            "Failed to insert rent_long_units photos:",
            photoError.message,
          );
        }
      }
    }

    return NextResponse.json({ unit: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
