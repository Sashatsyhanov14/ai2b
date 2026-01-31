import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export type RentDailyUnit = {
  id: string;
  city: string;
  address: string;
  rooms: number;
  price_day: number;
  price_week: number | null;
  allow_pets: boolean;
  description: string | null;
  created_at: string;
};

export async function GET() {
  const supabase = getServerClient();

  const { data, error } = await supabase
    .from("rent_daily_units")
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
    const price_day = Number(body.price_day ?? 0);
    const price_week_raw = body.price_week;
    const price_week =
      price_week_raw === undefined ||
      price_week_raw === null ||
      price_week_raw === ""
        ? null
        : Number(price_week_raw);

    const allow_pets = Boolean(body.allow_pets ?? false);
    const description =
      typeof body.description === "string" ? body.description : null;

    if (!city || !address || !rooms || !price_day) {
      return NextResponse.json(
        {
          error:
            "Поля city, address, rooms и price_day являются обязательными",
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

    if (Number.isNaN(price_day) || price_day <= 0) {
      return NextResponse.json(
        { error: "price_day должно быть числом > 0" },
        { status: 400 },
      );
    }

    if (
      price_week !== null &&
      (Number.isNaN(price_week) || price_week <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "price_week должно быть числом > 0 или null",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("rent_daily_units")
      .insert({
        city,
        address,
        rooms,
        price_day,
        price_week,
        allow_pets,
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
            "Failed to insert rent_daily_units photos:",
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

