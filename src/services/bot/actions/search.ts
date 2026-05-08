import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";
import { normalizeSearchKeywords } from "@/lib/cityNormalizer";

export async function handleSearchDatabase(args: SearchArgs & { id?: string; price?: number }): Promise<string> {
    const supabase = getServerClient();

    const tableName = "units";

    // Query active units with the new consolidated schema
    let query = supabase
        .from(tableName)
        .select(`
            id, city, address, area_m2, price, price_period,
            title, is_active, unit_type, intent,
            bedrooms, bathrooms, photos
        `)
        .eq("is_active", true);

    if (args.id) {
        query = query.eq("id", args.id);
    }

    if (args.intent) {
        if (args.intent === "rent" || args.intent === "sale") {
            query = query.eq("intent", args.intent);
            // Optionally default to apartment if not specified
            if (args.category === "land") query = query.eq("unit_type", "land");
            else if (args.category === "commercial") query = query.eq("unit_type", "commercial");
        } else {
            // If intent is 'land' or 'commercial' directly (legacy parsing)
            query = query.eq("unit_type", args.intent);
        }
    }

    // AI Typos / Fuzzy Search: normalize Russian/Turkish city names to English first
    const normalizedKeywords = normalizeSearchKeywords(args.search_keywords);
    if (normalizedKeywords.length > 0) {
        // Only search TEXT fields, title is JSONB now
        const orConditions = normalizedKeywords.map(kw => {
            const safeKw = kw.trim().replace(/,/g, ''); 
            return `city.ilike.%${safeKw}%,address.ilike.%${safeKw}%`;
        }).join(",");
        query = query.or(orConditions);
    }

    if (args.rooms) {
        const num = parseInt(args.rooms);
        if (!isNaN(num)) query = query.eq("bedrooms", num);
    }

    if (args.price) {
        query = query.lte("price", args.price);
    }
    if (args.price_min) {
        query = query.gte("price", args.price_min);
    }
    if (args.area_min && (args.intent === "land" || args.category === "land")) {
        query = query.gte("area_m2", args.area_min);
    }
    if (args.area_max && (args.intent === "land" || args.category === "land")) {
        query = query.lte("area_m2", args.area_max);
    }

    console.log(`[Search] intent=${args.intent} table=${tableName} keywords=${JSON.stringify(args.search_keywords)} rooms=${args.rooms}`);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

    console.log(`[Search] Result: ${error ? 'ERROR: ' + error.message : `${data?.length ?? 0} units found`}`);

    if (error) {
        console.error("Search DB Error:", error);
        return JSON.stringify({ status: "error", message: "DB Error: " + error.message });
    }

    if (!data || data.length === 0) {
        return JSON.stringify({ status: "success", count: 0, message: "Database is empty or no matches found." });
    }

    return JSON.stringify({
        status: "success",
        count: data.length,
        request: args,
        units: data
    });
}
