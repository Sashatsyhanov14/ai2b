import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    let query = supabase
        .from("units")
        .select("id, project, price, rooms, city, area_m2, floor, features, media") // added media just in case, or we fetch it later
        .eq("status", "available")
        .limit(5);

    if (args.city) {
        query = query.ilike("city", "%" + args.city + "%");
    }

    if (args.price) {
        query = query.lte("price", args.price);
    }

    if (args.rooms) {
        // Try to match "2+1" fuzzy or exact
        // Since DB might have int or string, we'll try basic string match if it's text
        // Or parse if columns are numbers. Assuming 'rooms' is int or text.
        // Let's use simple text match for robustness if type is unknown, 
        // or better, if we know schema: 'rooms' appeared to be int (1, 2, 3) or string "2+1".
        // I'll assume text for flexibility or convert.
        // Let's strict match if possible, or ilike.
        // Previous code parsed it. Let's keep it simple: cast columns if needed or just use ilike for text.
        // Assuming 'rooms' is numeric from previous attempts.
        const match = args.rooms.match(/^(\d+)/);
        if (match) {
            const roomNum = parseInt(match[1]);
            query = query.gte("rooms", roomNum);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Search DB Error:", error);
        return JSON.stringify({ status: "error", message: "DB Error" });
    }

    if (!data || data.length === 0) {
        return JSON.stringify({ status: "success", count: 0, message: "No units found matching criteria." });
    }

    return JSON.stringify({
        status: "success",
        count: data.length,
        units: data.map(u => ({
            id: u.id,
            title: `${u.project} (${u.city})`,
            price: u.price,
            rooms: u.rooms,
            features: u.features
        }))
    });
}
