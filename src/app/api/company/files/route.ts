import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });
        }

        const sb = getServerClient();

        // Use service role to bypass RLS
        const { error } = await sb.from("company_files").delete().eq("id", id);

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
