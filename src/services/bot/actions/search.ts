import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    let query = supabase
        .from("units")
        .select("*")
        // .eq("status", "available") // Relaxed: User wants to see everything? Or maybe status is 'Available'? Let's remove to be safe.
        .limit(20); // increased limit to give AI more options

    if (args.city) {
        query = query.ilike("city", "%" + args.city + "%");
    }

    // Relax Price: Only filter if significantly provided? 
    // ReAct agent might provide strict limit. 
    // Let's keep it but maybe ensure we don't filter out good matches?
    // lte is correct for "up to".
    if (args.price) {
        query = query.lte("price", args.price);
    }

    if (args.rooms) {
        // Safe handling if AI sends a number (e.g. 2) instead of string "2"
        const roomStr = String(args.rooms);
        const match = roomStr.match(/^(\d+)/);
        if (match) {
            const roomNum = parseInt(match[1]);
            query = query.gte("rooms", roomNum);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Search DB Error:", error);
        return JSON.stringify({ status: "error", message: "DB Error: " + error.message });
    }

    if (!data || data.length === 0) {
        // If strict search failed, try ONE MORE fall back?
        // Detailed message so AI knows WHY
        return JSON.stringify({ status: "success", count: 0, message: `No units found matching: City=${args.city}, Price<=${args.price}, Rooms>=${args.rooms}` });
    }

    // Return FULL data so AI can decide what to show
    const results = {
        status: "success",
        count: data.length,
        units: data.map(u => ({
            id: u.id,
            city: u.city,
            address: u.address,
            project: u.project,
            ...u
        }))
    };

    console.log(`DEBUG JSON: ${JSON.stringify(results, null, 2)}`);
    return JSON.stringify(results);
}
