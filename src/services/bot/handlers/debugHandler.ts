import { getServerClient } from "@/lib/supabaseClient";

export async function handleDebug(): Promise<string> {
    const supabase = getServerClient();
    try {
        const { count: unitsCount, error: unitsError } = await supabase.from("units").select("*", { count: "exact", head: true });
        const { count: photosCount, error: photosError } = await supabase.from("unit_photos").select("*", { count: "exact", head: true });
        const { data: sample } = await supabase.from("units").select("id, project, price").limit(3);

        return JSON.stringify({
            units_total: unitsCount,
            units_error: unitsError,
            photos_total: photosCount,
            photos_error: photosError,
            sample_units: sample,
            timestamp: new Date().toISOString()
        }, null, 2);
    } catch (e: any) {
        return `DEBUG_ERROR: ${e.message}`;
    }
}
