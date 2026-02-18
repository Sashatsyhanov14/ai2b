import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    let query = supabase
        .from("units")
        .select("*")
        .eq("status", "available")
        .limit(10); // increased limit to 10

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

    // Return FULL data so AI can decide what to show
    return JSON.stringify({
        status: "success",
        count: data.length,
        units: data.map(u => ({
            id: u.id,
            city: u.city,
            address: u.address,
            project: u.project, // if exists in DB schema, otherwise might be project_id? 
            // In types/units.ts it says project_id, but the original code selected 'project'. 
            // Let's assume 'project' exists or use safe access.
            // Actually, let's just dump the whole object, it's safer and gives AI everything.
            ...u
        }))
    });
}
