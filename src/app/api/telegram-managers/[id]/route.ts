import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const update: any = {};
  if (typeof body.name === "string") {
    update.name = body.name.trim() || null;
  }
  if (typeof body.is_active === "boolean") {
    update.is_active = body.is_active;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update" },
      { status: 400 },
    );
  }

  const sb = getServerClient();
  const { data, error } = await sb
    .from("telegram_managers")
    .update(update)
    .eq("id", id)
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

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = params;
  const sb = getServerClient();
  const { error } = await sb
    .from("telegram_managers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

