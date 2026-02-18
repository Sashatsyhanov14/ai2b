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
