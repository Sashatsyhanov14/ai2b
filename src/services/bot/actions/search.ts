import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs & { id?: string; price?: number }): Promise<string> {
    const supabase = getServerClient();

    // Query active units
    let query = supabase
        .from("units")
        .select("id, city, address, type, rooms, floor, floors_total, area_m2, price, status, title, features, is_active")
        .eq("is_active", true);

    if (args.id) {
        query = query.eq("id", args.id);
    }

    // AI Typos / Fuzzy Search implementation
    if (args.search_keywords && args.search_keywords.length > 0) {
        // Create an OR string like: 'city.ilike.%Mersin%,address.ilike.%Mersin%,title.ilike.%Mersin%,city.ilike.%Мерсин%...'
        const orConditions = args.search_keywords.map(kw => {
            const safeKw = kw.trim().replace(/,/g, ''); // prevent SQL injection in OR syntax
            return `city.ilike.%${safeKw}%,address.ilike.%${safeKw}%,title.ilike.%${safeKw}%`;
        }).join(",");

        query = query.or(orConditions);
    }

    if (args.rooms) {
        // e.g. "1+1"
        query = query.eq("rooms", args.rooms);
    }
    if (args.price) {
        // Return properties up to the maximum budget/price
        query = query.lte("price", args.price);
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
