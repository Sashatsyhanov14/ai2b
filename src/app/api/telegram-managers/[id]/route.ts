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
    .maybeSingle();

  if (error) {
    console.error("PATCH telegram-manager error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  if (!data) {
    console.warn(`No manager found with ID: ${id}`);
    return NextResponse.json(
      { ok: false, error: "Менеджер не найден или доступ запрещен (RLS)" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = params;
  const sb = getServerClient();
  // We specify '*' or 'id' to get back what was deleted, which helps confirm it worked
  const { data, error } = await sb
    .from("telegram_managers")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("DELETE telegram-manager error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Удаление не выполнено. Возможно, у вас нет прав (RLS) или запись уже удалена." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}

