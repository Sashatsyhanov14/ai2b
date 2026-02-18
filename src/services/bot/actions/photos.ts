import { getServerClient } from "@/lib/supabaseClient";
import { GetPhotosArgs } from "../types";

export async function handleGetPhotos(args: GetPhotosArgs): Promise<string> {
    const supabase = getServerClient();

    const { data, error } = await supabase
        .from("units")
        .select("media, project")
        .eq("id", args.unit_id)
        .single();

    if (error || !data) {
        return JSON.stringify({ status: "error", message: "Unit not found or no photos" });
    }

    const media = data.media; // Assuming JSON array or string array
    let photos: string[] = [];

    if (Array.isArray(media)) {
        photos = media;
    } else if (typeof media === 'string') {
        // try json parse if it's a stringified array
        try { photos = JSON.parse(media); } catch { photos = [media]; }
    }

    // Limit to 5 photos to not spam
    const limited = photos.slice(0, 5);

    return JSON.stringify({
        status: "success",
        unit_project: data.project,
        photos: limited
    });
}
