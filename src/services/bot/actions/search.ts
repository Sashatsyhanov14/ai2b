import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    // 1. Primary Filtered Search
    let query = supabase.from("units").select("*").limit(100).order('created_at', { ascending: false });

    if (args.city) query = query.ilike("city", "%" + args.city + "%");
    if (args.price) query = query.lte("price", args.price);
    if (args.rooms) {
        const roomStr = String(args.rooms);
        const match = roomStr.match(/^(\d+)/);
        if (match) {
            query = query.gte("rooms", parseInt(match[1]));
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Search DB Error:", error);
        return JSON.stringify({ status: "error", message: "DB Error: " + error.message });
    }

    // 2. Fallback: Broad Search
    if (!data || data.length === 0) {
        console.log("Strict search returned 0. Trying broad search...");
        let broadQuery = supabase.from("units").select("*").limit(100).order('created_at', { ascending: false });

        // Keep city if present, ignore price/rooms
        if (args.city) {
            broadQuery = broadQuery.ilike("city", "%" + args.city + "%");
        }

        const { data: broadData, error: broadError } = await broadQuery;

        if (broadError) {
            return JSON.stringify({ status: "success", count: 0, message: "No units found even with broad search." });
        }

        if (broadData && broadData.length > 0) {
            return JSON.stringify({
                status: "success",
                count: broadData.length,
                note: "STRICT SEARCH FAILED. Showing BROAD results (ignored price/rooms). Process these to find the best match.",
                units: broadData
            });
        }

        return JSON.stringify({ status: "success", count: 0, message: "No units found." });
    }

    const results = {
        status: "success",
        count: data.length,
        units: data
    };

    console.log(`DEBUG JSON: ${JSON.stringify(results, null, 2)}`);
    return JSON.stringify(results);
}
