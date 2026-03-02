import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    // DUMP THE ENTIRE TABLE but exclude "description" to save tokens and prevent Vercel timeouts.
    const { data, error } = await supabase
        .from("units")
        .select("id, city, address, type, rooms, floor, floors_total, area_m2, price, status, title, features, is_active");

    if (error) {
        console.error("Search DB Error:", error);
        return JSON.stringify({ status: "error", message: "DB Error: " + error.message });
    }

    if (!data || data.length === 0) {
        return JSON.stringify({ status: "success", count: 0, message: "Database is empty." });
    }

    return JSON.stringify({
        status: "success",
        count: data.length,
        request: { city: args.city, price: args.price, rooms: args.rooms },
        units: data
    });
}
