import { NextResponse, NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = getServerClient();
        const body = await req.json();

        const patch: any = {};
        if (body.start_date !== undefined) patch.start_date = body.start_date;
        if (body.end_date !== undefined) patch.end_date = body.end_date;
        if (body.status !== undefined) patch.status = body.status;
        if (body.user_chat_id !== undefined) patch.user_chat_id = body.user_chat_id;
        if (body.notes !== undefined) patch.notes = body.notes;

        const { data, error } = await supabase
            .from('rental_bookings')
            .update(patch)
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, booking: data });
    } catch (err: any) {
        console.error(`Rental Bookings PATCH err for id=${params.id}:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = getServerClient();
        const { error } = await supabase
            .from('rental_bookings')
            .delete()
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error(`Rental Bookings DELETE err for id=${params.id}:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
