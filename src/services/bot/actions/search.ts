import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    // 1. Primary Filtered Search — select ALL columns so AI sees everything
    let query = supabase.from("units").select("*").limit(25).order('created_at', { ascending: false });

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

    // 2. Fallback: Broad Search (drop price/rooms, keep city)
    if (!data || data.length === 0) {
        console.log("Strict search returned 0. Trying broad search...");
        let broadQuery = supabase.from("units").select("*").limit(25).order('created_at', { ascending: false });

        if (args.city) {
            broadQuery = broadQuery.ilike("city", "%" + args.city + "%");
        }

        const { data: broadData, error: broadError } = await broadQuery;

        if (broadError) {
            return JSON.stringify({ status: "success", count: 0, message: "No units found." });
        }

        if (broadData && broadData.length > 0) {
            return JSON.stringify({
                status: "success",
                count: broadData.length,
                note: "Exact match not found. Showing all available in this city.",
                units: broadData
            });
        }

        return JSON.stringify({ status: "success", count: 0, message: "No units found." });
    }

    return JSON.stringify({
        status: "success",
        count: data.length,
        units: data
    });
}
