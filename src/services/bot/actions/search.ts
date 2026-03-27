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
        .neq("is_active", false); // null treated as active

    if (args.id) {
        query = query.eq("id", args.id);
    }

    if (args.intent === "land") {
        query = query.ilike("type", "%land%"); // Or eq("type", "land") depending on db strings. Using ilike for safety (e.g. "Land", "land", "Участок"). We'll use eq("type", "land") per standard if we strictly enforce it, but ilike "%land%" helps catch variations. Actually, let's use eq("type", "land"). Wait, in DB it's often saved via translations. If it's standardized, let's just do eq("type", "land"). I will do ilike("%land%") just in case or just expect it to be handled by keyword search if not strict. Let's strictly enforce eq("type", "land").
        query = query.eq("type", "land");
    }

    // Date filtering (exclude booked units)
    if (args.intent === "rent" && args.start_date && args.end_date) {
        const { data: bookings } = await supabase
            .from("rental_bookings")
            .select("unit_id")
            .neq("status", "cancelled")
            .lt("start_date", args.end_date)
            .gt("end_date", args.start_date);

        if (bookings && bookings.length > 0) {
            const bookedUnitIds = bookings.map(b => b.unit_id);
            query = query.not("id", "in", `(${bookedUnitIds.join(',')})`);
        }
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
        } else if (args.intent !== "land") {
            query = query.eq("rooms", args.rooms);
        }
    }
    if (args.guests && args.intent === "rent") {
        query = query.gte("max_guests", args.guests);
    }
    if (args.price) {
        // Return properties up to the maximum budget
        query = query.lte(args.intent === "rent" ? "price_per_month" : "price", args.price);
    }
    if (args.price_min) {
        // Return properties at or above the minimum budget (e.g. for VNJ $250k+ requirement)
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
