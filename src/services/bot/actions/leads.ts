import { getServerClient } from "@/lib/supabaseClient";
import { SubmitLeadArgs, Lang } from "../types";

// Dumb Helper: Just sends a debug message, doesn't break flow
function logNotify(msg: string) {
  console.log("[Lead Notification] " + msg);
}

export async function handleSubmitLead(
  args: SubmitLeadArgs,
  lang: Lang,
  chatId: string,
  token: string,
  sessionId: string | null,
  userInfo: { username?: string | null; fullName?: string | null }
): Promise<string> {
  try {
    const sb = getServerClient();

    // 1. Just Insert. No logic.
    const { data: lead, error } = await sb
      .from("leads")
      .insert({
        source_bot_id: "telegram",
        source: "telegram",
        name: args.user_name || userInfo.fullName || "Unknown",
        phone: args.user_phone,
        data: {
          chat_id: chatId,
          interest_summary: args.interest_summary,
          tg_username: userInfo.username
        },
        status: "new",
        notes: args.interest_summary || "Bot Lead"
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Lead Error:", error);
      return JSON.stringify({ status: "error", message: "Database error" });
    }

    // 2. Log it (Manager notification is now secondary, can be added back if needed but keeping it dumb for now)
    logNotify("New Lead: " + (lead as any).id);

    // 3. Return Success JSON
    return JSON.stringify({
      status: "success",
      lead_id: (lead as any).id,
      message: "Lead saved successfully"
    });

  } catch (e: any) {
    console.error("submitLead exception:", e);
    return JSON.stringify({ status: "error", message: e.message });
  }
}
