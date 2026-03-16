import { NextResponse, NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServerClient();
        const url = new URL(request.url);
        const unitId = url.searchParams.get('unit_id');

        let query = supabase.from('rental_bookings').select('*');
        if (unitId) {
            query = query.eq('unit_id', unitId);
        }

        // Sort logic
        query = query.order('start_date', { ascending: true });

        const { data: bookings, error } = await query;
        if (error) throw error;

        return NextResponse.json({ bookings: bookings || [] });
    } catch (err: any) {
        console.error("Rental Bookings GET err:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supabase = getServerClient();

        const payload = {
            unit_id: Number(body.unit_id),
            start_date: body.start_date, // expect YYYY-MM-DD
            end_date: body.end_date, // expect YYYY-MM-DD
            user_chat_id: body.user_chat_id || null,
            status: body.status || "reserved",
        };

        const { data, error } = await supabase.from('rental_bookings').insert(payload).select().single();
        if (error) throw error;

        return NextResponse.json({ ok: true, booking: data });
    } catch (err: any) {
        console.error("Rental Bookings POST err:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
