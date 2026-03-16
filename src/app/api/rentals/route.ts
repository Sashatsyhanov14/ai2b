import { NextResponse, NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabaseClient";
import { normalizeCity } from "@/lib/cityNormalizer";
import { runRentalTranslationAgent } from "@/services/bot/ai/agents";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServerClient();
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (id) {
            const { data, error } = await supabase.from('rental_units').select('*').eq('id', id).single();
            if (error) throw error;
            if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
            return NextResponse.json({ unit: data });
        } else {
            const { data, error } = await supabase.from('rental_units').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return NextResponse.json({ units: data });
        }
    } catch (error: any) {
        console.error('List rentals GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supabase = getServerClient();

        console.log("[API Rentals] Running AI Translation for save...");
        const translationResult = await runRentalTranslationAgent({
            title: body.title,
            city: body.city,
            address: body.address,
            description: body.description,
        });

        const baseEn = translationResult?.base_en || {};
        const i18nData = translationResult?.i18n || { ru: {}, tr: {} };

        const payload = {
            title: baseEn.title ?? body.title ?? null,
            city: baseEn.city ? normalizeCity(baseEn.city) : body.city ? normalizeCity(body.city) : null,
            address: baseEn.address ?? body.address ?? null,
            description: baseEn.description ?? body.description ?? null,
            price_per_day: body.price_per_day ? Number(body.price_per_day) : null,
            price_per_month: body.price_per_month ? Number(body.price_per_month) : null,
            bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
            bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
            max_guests: body.max_guests ? Number(body.max_guests) : null,
            photos: Array.isArray(body.photos) ? body.photos : [],
            is_active: true,
            i18n: i18nData,
        };

        const { data, error } = await supabase.from("rental_units").insert(payload).select().single();

        if (error) {
            console.error('Rentals POST db error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ ok: true, unit: data });
    } catch (err: any) {
        console.error("Rentals POST handler err:", err);
        return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
    }
}
