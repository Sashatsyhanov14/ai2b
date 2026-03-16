import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";
import { normalizeSearchKeywords } from "@/lib/cityNormalizer";

export async function handleSearchDatabase(args: SearchArgs & { id?: string; price?: number }): Promise<string> {
    const supabase = getServerClient();

    const tableName = args.intent === "rent" ? "rental_units" : "units";

    // Query active units
    let query = supabase
        .from(tableName)
        .select(args.intent === "rent"
            ? "id, city, address, bedrooms, price_per_month as price_month, price_per_day as price_day, max_guests, title, is_active"
            : "id, city, address, type, rooms, floor, floors_total, area_m2, price, status, title, features, is_active")
        .eq("is_active", true);

    if (args.id) {
        query = query.eq("id", args.id);
    }

    // AI Typos / Fuzzy Search: normalize Russian/Turkish city names to English first
    const normalizedKeywords = normalizeSearchKeywords(args.search_keywords);
    if (normalizedKeywords.length > 0) {
        // Create an OR string like: 'city.ilike.%Istanbul%,address.ilike.%Istanbul%,title.ilike.%Istanbul%'
        const orConditions = normalizedKeywords.map(kw => {
            const safeKw = kw.trim().replace(/,/g, ''); // prevent SQL injection in OR syntax
            return `city.ilike.%${safeKw}%,address.ilike.%${safeKw}%,title.ilike.%${safeKw}%`;
        }).join(",");
        query = query.or(orConditions);
    }

    if (args.rooms) {
        // e.g. "1+1" or "2" bedrooms. For rent, it's just a number. For now if sale, match exactly.
        if (args.intent === "rent") {
            const num = parseInt(args.rooms);
            if (!isNaN(num)) query = query.eq("bedrooms", num);
        } else {
            query = query.eq("rooms", args.rooms);
        }
    }
    if (args.price) {
        // Return properties up to the maximum budget
        query = query.lte(args.intent === "rent" ? "price_per_month" : "price", args.price);
    }
    if (args.price_min) {
        // Return properties at or above the minimum budget (e.g. for VNJ $250k+ requirement)
        query = query.gte(args.intent === "rent" ? "price_per_month" : "price", args.price_min);
    }
    if (args.project) {
        query = query.ilike("title", `%${args.project}%`); // fallback checking title since project isn't exported in select
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

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
