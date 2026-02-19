import { getServerClient } from "@/lib/supabaseClient";
import { SearchArgs } from "../types";

export async function handleSearchDatabase(args: SearchArgs): Promise<string> {
    const supabase = getServerClient();

    // DUMP THE ENTIRE TABLE. AI is the brain — it decides.
    const { data, error } = await supabase
        .from("units")
        .select("*");

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
