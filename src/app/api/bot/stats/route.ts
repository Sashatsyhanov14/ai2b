import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const sb = getServerClient();
  const botId = process.env.TELEGRAM_BOT_ID || "telegram-single";

  const { count, error } = await sb
    .from("sessions")
    .select("external_user_id", { count: "exact", head: true })
    .eq("bot_id", botId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    sessionsCount: count ?? 0,
  });
}

