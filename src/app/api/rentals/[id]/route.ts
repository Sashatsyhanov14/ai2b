import { NextResponse, NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";
import { normalizeCity } from "@/lib/cityNormalizer";
import { runRentalTranslationAgent } from "@/services/bot/ai/agents";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = getServerClient();
        const payload = await req.json();

        // Fetch existing logic
        const { data: existing, error: fetchErr } = await supabase
            .from('rental_units')
            .select('*')
            .eq('id', params.id)
            .single();

        if (fetchErr) throw fetchErr;
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Translation interception
        let baseEn: any = {};
        let i18nData: any = existing.i18n || {};

        if (payload.title || payload.city || payload.address || payload.description) {
            console.log(`[API Rentals ${params.id}] Running Translation Agent for update...`);
            const mergedForTranslation = {
                title: payload.title ?? existing.title,
                city: payload.city ?? existing.city,
                address: payload.address ?? existing.address,
                description: payload.description ?? existing.description,
            };

            const translationResult = await runRentalTranslationAgent(mergedForTranslation);
            baseEn = translationResult?.base_en || {};
            i18nData = translationResult?.i18n || i18nData;
        }

        const patch: any = {};
        if (payload.title !== undefined) patch.title = baseEn.title ?? payload.title;
        if (payload.city !== undefined) patch.city = baseEn.city ? normalizeCity(baseEn.city) : normalizeCity(payload.city);
        if (payload.address !== undefined) patch.address = baseEn.address ?? payload.address;
        if (payload.description !== undefined) patch.description = baseEn.description ?? payload.description;

        if (payload.price_per_day !== undefined) patch.price_per_day = payload.price_per_day ? Number(payload.price_per_day) : null;
        if (payload.price_per_month !== undefined) patch.price_per_month = payload.price_per_month ? Number(payload.price_per_month) : null;
        if (payload.bedrooms !== undefined) patch.bedrooms = payload.bedrooms ? Number(payload.bedrooms) : null;
        if (payload.bathrooms !== undefined) patch.bathrooms = payload.bathrooms ? Number(payload.bathrooms) : null;
        if (payload.max_guests !== undefined) patch.max_guests = payload.max_guests ? Number(payload.max_guests) : null;
        if (payload.features !== undefined) patch.features = payload.features;
        if (payload.ai_instructions !== undefined) patch.ai_instructions = payload.ai_instructions;
        if (payload.photos !== undefined) patch.photos = payload.photos;
        if (payload.is_active !== undefined) patch.is_active = payload.is_active;

        patch.i18n = i18nData;
        patch.updated_at = new Date().toISOString();

        const { data, error } = await supabase.from('rental_units').update(patch).eq('id', params.id).select().single();
        if (error) throw error;

        return NextResponse.json({ ok: true, unit: data });
    } catch (err: any) {
        console.error(`Rentals PATCH err for id=${params.id}:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = getServerClient();
        const { error } = await supabase.from('rental_units').delete().eq('id', params.id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("Rentals DELETE err:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
