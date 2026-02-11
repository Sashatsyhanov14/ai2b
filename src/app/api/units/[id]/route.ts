import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const sb = getServerClient();

        const { data: unit, error } = await sb
            .from("units")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        return NextResponse.json(unit);
    } catch (error: any) {
        console.error("Error fetching unit:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch unit" },
            { status: 500 }
        );
    }
}
