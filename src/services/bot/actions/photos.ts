import { getServerClient } from "@/lib/supabaseClient";
import { GetPhotosArgs } from "../types";
import { sendMediaGroup, sendPhoto, InputMediaPhoto, sendMessage } from "@/lib/telegram";

export async function handleGetPhotos(args: any, token: string, chatId: string): Promise<string> {
    const supabase = getServerClient();

    const unitId = args.unit_id || args.id;

    if (!unitId) {
        return JSON.stringify({ status: "error", message: "CRITICAL: You must provide a valid 'unit_id' (the 'id' of the property from search results). Do not call get_photos without an ID." });
    }

    // 1. Get Unit info (project name)
    const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("title")
        .eq("id", unitId)
        .single();

    if (unitError || !unitData) {
        await sendMessage(token, chatId, `❌ Объект (ID: ${unitId}) не найден в базе.`);
        return JSON.stringify({ status: "error", message: "Unit not found" });
    }

    // 2. Get Photos from unit_photos table
    const { data: photoData, error: photoError } = await supabase
        .from("unit_photos")
        .select("url")
        .eq("unit_id", unitId)
        .order("sort_order", { ascending: true });

    if (photoError) {
        await sendMessage(token, chatId, "❌ Ошибка при загрузке фотографий.");
        return JSON.stringify({ status: "error", message: "Error fetching photos" });
    }

    let photos = photoData.map(p => p.url);

    // Filter out empty strings or invalid urls if needed
    photos = photos.filter(p => p && typeof p === 'string' && p.startsWith('http'));

    if (photos.length === 0) {
        await sendMessage(token, chatId, `К сожалению, для этого объекта (ID: ${unitId}) пока нет фотографий 😔`);
        return JSON.stringify({ status: "success", message: "Unit found but has no photos." });
    }

    // Limit to 10 photos (Telegram limit for media group is 10)
    const limited = photos.slice(0, 10);

    try {
        const caption = '📸';
        if (limited.length === 1) {
            await sendPhoto(token, chatId, limited[0], caption);
        } else {
            const mediaGroup: InputMediaPhoto[] = limited.map((url, i) => ({
                type: 'photo',
                media: url,
                caption: i === 0 ? caption : undefined
            }));
            await sendMediaGroup(token, chatId, mediaGroup);
        }
        return JSON.stringify({ status: "success", message: `Sent ${limited.length} photos to user.` });
    } catch (e: any) {
        console.error("Failed to send photos:", e);
        await sendMessage(token, chatId, "❌ Ошибка Telegram при отправке фотографий.");
        return JSON.stringify({ status: "error", message: "Failed to send photos to Telegram: " + e.message });
    }
}
