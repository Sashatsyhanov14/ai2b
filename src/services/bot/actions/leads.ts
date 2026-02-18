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

    // 2. Notify Active Managers
    const { data: managers } = await supabase
        .from("telegram_managers")
        .select("telegram_id")
        .eq("is_active", true);

    if (managers && managers.length > 0) {
        const { sendMessage } = await import("@/lib/telegram");
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
            const notification = `🚀 **NEW LEAD**\n\n👤 Name: ${args.name || "Unknown"}\n📱 Phone: ${args.phone}\n📝 Note: ${args.info || "No details"}\n🔗 Chat: @${username || "Unknown"}`;

            for (const manager of managers) {
                if (manager.telegram_id) {
                    await sendMessage(token, String(manager.telegram_id), notification).catch(e => console.error("Failed to notify manager:", e));
                }
            }
        }
    }

    return JSON.stringify({ status: "success", lead_id: (data as any).id, message: "Lead saved and managers notified." });
}
