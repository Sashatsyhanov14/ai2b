import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage, sendPhoto, sendMediaGroup } from "@/lib/telegram";
import { Lang } from "../types";

export async function sendPropertyPhotos(
    token: string,
    chatId: string,
    unitId: string,
    caption: string,
    lang: Lang
) {
    const sb = getServerClient();
    const { data: photos } = await sb
        .from("unit_photos")
        .select("url")
        .eq("unit_id", unitId)
        .order("sort_order", { ascending: true })
        .limit(10);

    console.log(`[PHOTOS] Unit ${unitId}: Found ${photos?.length || 0} photos`);

    if (!photos || photos.length === 0) {
        await sendMessage(token, chatId, caption);
        return;
    }

    if (photos.length === 1) {
        await sendPhoto(token, chatId, photos[0].url, caption);
    } else {
        const media = photos.map((p: { url: string }, idx: number) => ({
            type: "photo" as const,
            media: p.url,
            caption: idx === 0 ? caption : undefined,
        }));
        await sendMediaGroup(token, chatId, media);
    }
}
