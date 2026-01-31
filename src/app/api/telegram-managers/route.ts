import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function GET() {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("telegram_managers")
    .select("id, telegram_id, name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const rawId = body.telegram_id ?? body.telegramId ?? body.id;
  if (!rawId) {
    return NextResponse.json(
      { ok: false, error: "telegram_id is required" },
      { status: 400 },
    );
  }

  const telegramIdNum = Number(rawId);
  if (!Number.isFinite(telegramIdNum)) {
    return NextResponse.json(
      { ok: false, error: "telegram_id must be a number" },
      { status: 400 },
    );
  }

  const row = {
    telegram_id: telegramIdNum,
    name: typeof body.name === "string" ? body.name.trim() || null : null,
    is_active: body.is_active !== false,
  };

  const sb = getServerClient();
  const { data, error } = await sb
    .from("telegram_managers")
    .insert(row)
    .select("id, telegram_id, name, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data });
}

