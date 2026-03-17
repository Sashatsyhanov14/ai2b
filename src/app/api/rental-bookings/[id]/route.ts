import { NextResponse, NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";

async function notifyManagers(supabase: any, message: string) {
    try {
        const { data: bots } = await supabase
            .from("telegram_bots")
            .select("token")
            .eq("is_active", true)
            .limit(1)
            .single();

        const { data: managers } = await supabase
            .from("telegram_managers")
            .select("telegram_id")
            .eq("is_active", true);

        if (!bots?.token || !managers?.length) return;

        for (const m of managers) {
            if (!m.telegram_id) continue;
            await fetch(`https://api.telegram.org/bot${bots.token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: m.telegram_id,
                    text: message,
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "Открыть календарь ↗️", url: "https://ai2b.app/app/rentals" }
                        ]]
                    }
                }),
            });
        }
    } catch (e) {
        console.error("notifyManagers failed:", e);
    }
}

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
        if (body.guest_name !== undefined) patch.guest_name = body.guest_name;
        if (body.guest_phone !== undefined) patch.guest_phone = body.guest_phone;

        // Get current booking before update (to detect status change)
        const { data: prev } = await supabase
            .from("rental_bookings")
            .select("status, start_date, end_date, guest_name, guest_phone, unit_id")
            .eq("id", params.id)
            .single();

        const { data, error } = await supabase
            .from("rental_bookings")
            .update(patch)
            .eq("id", params.id)
            .select()
            .single();

        if (error) throw error;

        // Send TG notification if status changed
        if (body.status && prev && body.status !== prev.status) {
            const statusEmoji: Record<string, string> = {
                confirmed: "✅",
                cancelled: "❌",
                reserved: "📅",
                pending: "⏳",
                blocked: "🔒",
            };
            const statusLabel: Record<string, string> = {
                confirmed: "Подтверждено",
                cancelled: "Отменено",
                reserved: "Забронировано",
                pending: "Ожидает подтверждения",
                blocked: "Заблокировано",
            };

            const guest = data.guest_name || data.user_chat_id || "Гость";
            const dates = `${new Date(data.start_date).toLocaleDateString("ru-RU")} → ${new Date(data.end_date).toLocaleDateString("ru-RU")}`;
            const emoji = statusEmoji[body.status] || "📋";
            const label = statusLabel[body.status] || body.status;

            const msg = `${emoji} <b>Статус брони изменён: ${label}</b>\n\n👤 Клиент: ${guest}\n📅 Даты: ${dates}\n\n<i>Предыдущий: ${statusLabel[prev.status] || prev.status}</i>`;

            await notifyManagers(supabase, msg);
        }

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
            .from("rental_bookings")
            .delete()
            .eq("id", params.id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error(`Rental Bookings DELETE err for id=${params.id}:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
