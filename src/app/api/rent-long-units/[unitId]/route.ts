import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

type Params = {
  params: { unitId: string };
};

export async function PATCH(req: Request, { params }: Params) {
  try {
    const supabase = getServerClient();
    const body = await req.json().catch(() => ({}));

    if (typeof body.is_occupied !== "boolean") {
      return NextResponse.json(
        { error: "Field is_occupied (boolean) is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("rent_long_units")
      .update({ is_occupied: body.is_occupied })
      .eq("id", params.unitId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ unit: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const supabase = getServerClient();

    const { error } = await supabase
      .from("rent_long_units")
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
