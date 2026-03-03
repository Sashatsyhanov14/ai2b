import { getServerClient } from "@/lib/supabaseClient";
import { SaveLeadArgs } from "../types";

export async function handleSaveLead(
    args: SaveLeadArgs,
    chatId: string,
    username?: string | null
): Promise<string> {
    const supabase = getServerClient();

    const { data, error } = await supabase
        .from("leads")
        .insert({
            source: "telegram",
            source_bot_id: "telegram",
            phone: args.phone,
            name: args.name || "Unknown",
            data: {
                chat_id: chatId,
                tg_username: username,
                interest: args.info
            },
            status: "new",
            notes: args.info || "Bot Lead"
        } as any)
        .select()
        .single();

    if (error) {
        console.error("Save Lead Error:", error);
        return JSON.stringify({ status: "error", message: "Failed to save lead" });
    }

    return JSON.stringify({ status: "success", lead_id: (data as any).id, message: "Lead saved successfully in database." });
}
