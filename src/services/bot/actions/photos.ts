import { getServerClient } from "@/lib/supabaseClient";
import { GetPhotosArgs } from "../types";
import { sendMediaGroup, sendPhoto, InputMediaPhoto } from "@/lib/telegram";

export async function handleGetPhotos(args: GetPhotosArgs, token: string, chatId: string): Promise<string> {
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

    // Filter out empty strings or invalid urls if needed
    photos = photos.filter(p => p && typeof p === 'string' && p.startsWith('http'));

    if (photos.length === 0) {
        return JSON.stringify({ status: "success", message: "Unit found but has no photos." });
    }

    // Limit to 10 photos (Telegram limit for media group is 10)
    const limited = photos.slice(0, 10);

    try {
        if (limited.length === 1) {
            await sendPhoto(token, chatId, limited[0], `${data.project || 'Unit'} Photos`);
        } else {
            const mediaGroup: InputMediaPhoto[] = limited.map((url, i) => ({
                type: 'photo',
                media: url,
                caption: i === 0 ? `${data.project || 'Unit'} Photos` : undefined
            }));
            await sendMediaGroup(token, chatId, mediaGroup);
        }
        return JSON.stringify({ status: "success", message: `Sent ${limited.length} photos to user.` });
    } catch (e: any) {
        console.error("Failed to send photos:", e);
        return JSON.stringify({ status: "error", message: "Failed to send photos to Telegram: " + e.message });
    }
}
