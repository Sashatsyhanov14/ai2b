import { getServerClient } from "@/lib/supabaseClient";
import { SaveLeadArgs } from "../types";

export async function handleSaveLead(
    args: SaveLeadArgs,
    chatId: string,
    username?: string | null
): Promise<string> {
    const supabase = getServerClient();

    // First look for existing active lead from this chat
    const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("status", "new")
        .contains("data", { chat_id: chatId })
        .maybeSingle();

    const payload = {
        source: "telegram",
        source_bot_id: "telegram",
        phone: args.phone !== "Unknown" ? args.phone : null,
        name: args.name || "Unknown",
        data: {
            chat_id: chatId,
            tg_username: username,
            interest: args.info,
            email: args.email,
            budget: args.budget,
            interested_units: args.interested_units,
            temperature: args.temperature || "cold",
            score: args.temperature === 'hot' ? 10 : args.temperature === 'warm' ? 5 : 1
        },
        status: "new",
        notes: args.info || "Bot Lead"
    };

    let data, error;

    if (existing) {
        const res = await supabase.from("leads").update(payload).eq("id", existing.id).select().single();
        data = res.data;
        error = res.error;
    } else {
        const res = await supabase.from("leads").insert(payload as any).select().single();
        data = res.data;
        error = res.error;
    }

    if (error) {
        console.error("Save Lead Error:", error);
        return JSON.stringify({ status: "error", message: "Failed to save lead" });
    }

    return JSON.stringify({ status: "success", lead_id: (data as any).id, message: "Lead saved successfully in database." });
}
