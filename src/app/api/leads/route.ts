import { NextResponse } from 'next/server';
import { handleSaveLead } from '@/services/bot/actions/leads';
import { notifyAdminsOfLead } from '@/services/bot/actions/notify';
import { getServerClient } from '@/lib/supabaseClient';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, unit_id, title, phone, user } = body;

        if (!phone || !user?.id) {
            return NextResponse.json({ error: 'Missing phone or user ID' }, { status: 400 });
        }

        console.log(`[API Leads] Processing lead from user ${user.id} for unit ${unit_id}`);

        const supabase = getServerClient();

        // 1. Fetch unit details for enrichment
        let unit = null;
        if (unit_id) {
            const { data } = await supabase.from('units').select('*').eq('id', unit_id).maybeSingle();
            unit = data;
        }

        // 2. Fetch user's referrer
        const { data: userRecord } = await supabase
            .from('users')
            .select('referrer_id')
            .eq('telegram_id', user.id)
            .maybeSingle();
        
        const referrer_id = userRecord?.referrer_id;

        // 3. Save Lead to Database
        let interested_units: string[] = [];
        if (unit) {
            interested_units = [`${unit.city}, ${unit.address}`];
        }

        await handleSaveLead({
            phone: phone,
            name: user.first_name || user.username || "Client",
            info: action === 'book_now' ? "Бронирование из Mini App" : "Вопрос по объекту из Mini App",
            temperature: action === 'book_now' ? "hot" : "warm",
            language: "ru", // Default to RU for Mini App for now
            purpose: "НЕДВИЖИМОСТЬ",
            unit_id: unit_id,
            interested_units: interested_units,
            referrer_id: referrer_id
        } as any, String(user.id), user.username);

        // 4. Notify Admins
        if (BOT_TOKEN) {
            await notifyAdminsOfLead(
                BOT_TOKEN,
                String(user.id),
                { username: user.username, fullName: user.first_name + (user.last_name ? ' ' + user.last_name : '') },
                { action, title, phone, unit_id },
                unit
            );
        }

        return NextResponse.json({ success: true, message: 'Lead processed successfully' });
    } catch (error: any) {
        console.error('[API Leads] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
