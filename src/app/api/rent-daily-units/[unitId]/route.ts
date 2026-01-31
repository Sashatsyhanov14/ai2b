import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

type Params = {
  params: { unitId: string };
};

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const supabase = getServerClient();

    const { error } = await supabase
      .from("rent_daily_units")
      .delete()
      .eq("id", params.unitId);

    if (error) {
      return NextResponse.json({ error: error.message, ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", ok: false },
      { status: 500 },
    );
  }
}

