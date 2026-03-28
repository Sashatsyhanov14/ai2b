import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";
import { normalizeSearchKeywords } from "@/lib/cityNormalizer";

export async function handleSearchDatabase(args: SearchArgs & { id?: string; price?: number }): Promise<string> {
    const supabase = getServerClient();

    const tableName = "units";

    // Query active units
    let query = supabase
        .from(tableName)
        .select(`
            id, city, address, rooms, floor, floors_total, area_m2, price, 
            status, title, features, is_active, category,
            price_per_day, price_per_month, bedrooms, bathrooms, max_guests, photos
        `)
        .neq("is_active", false);

    if (args.id) {
        query = query.eq("id", args.id);
    }

    if (args.intent) {
        if (args.intent === "rent" || args.intent === "sale") {
            // intent 'rent' and 'sale' generally target Residential (apartment/villa) which are stored as category 'sale' (and legacy 'rent')
            query = query.in("category", ["sale", "rent"]);
        } else {
            // 'commercial' or 'land'
            query = query.eq("category", args.intent);
        }
    }
    
    // Explicit Transaction Type filters for Residential
    if (args.intent === "rent") {
        query = query.not("price_per_month", "is", null);
    } else if (args.intent === "sale") {
        query = query.not("price", "is", null);
    }

    // Date filtering (exclude booked units) - REMOVED BY USER REQUEST
    /*
    if (args.intent === "rent" && args.start_date && args.end_date) {
        ...
    }
    */

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
        } else if (args.intent !== "land") {
            query = query.eq("rooms", args.rooms);
        }
    }
    if (args.guests && args.intent === "rent") {
        query = query.gte("max_guests", args.guests);
    }
    if (args.price) {
        if (args.intent === "rent") {
            // Check both per day and per month if appropriate, or just month as primary
            query = query.or(`price_per_month.lte.${args.price},price_per_day.lte.${args.price}`);
        } else {
            query = query.lte("price", args.price);
        }
    }
    if (args.price_min) {
        query = query.gte(args.intent === "rent" ? "price_per_month" : "price", args.price_min);
    }
    if (args.area_min && args.intent === "land") {
        query = query.gte("area_m2", args.area_min);
    }
    if (args.area_max && args.intent === "land") {
        query = query.lte("area_m2", args.area_max);
    }
    if (args.project) {
        query = query.ilike("title", `%${args.project}%`); // fallback checking title since project isn't exported in select
    }

    console.log(`[Search] intent=${args.intent} table=${tableName} keywords=${JSON.stringify(args.search_keywords)} dates=${args.start_date}→${args.end_date} rooms=${args.rooms} guests=${args.guests}`);

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
