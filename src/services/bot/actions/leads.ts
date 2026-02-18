import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage } from "@/lib/telegram";
import { createLead as dbCreateLead } from "@/services/leads";
import { SubmitLeadArgs, Lang } from "../types";

async function notifyManagers(
  lang: Lang,
  token: string,
  leadId: string,
  payload: { chatId: string; tgUsername?: string | null; tgFullName?: string | null; history?: string }
) {
  try {
    const sb = getServerClient();
    const { data: lead } = await sb.from("leads").select("*").eq("id", leadId).single();
    if (!lead) return;

    // Simplified notification logic for "Submit Lead" tool
    // Explicitly typed as any if needed, but strings are safe
    const summary = "🔥 **TURKHOME LEAD**\n" +
      "Name: " + (payload.tgFullName || "Unknown") + "\n" +
      "Phone: " + (lead as any).phone + "\n" +
      "Notes: " + ((lead as any).notes || "Interested in property") + "\n";

    const { data: managers } = await sb
      .from("telegram_managers")
      .select("id, telegram_id")
      .eq("is_active", true);

    if (managers) {
      for (const m of managers) {
        await sendMessage(token, String(m.telegram_id), summary);
      }
    }

  } catch (e) { console.error(e); }
}

export async function handleSubmitLead(
  args: SubmitLeadArgs,
  lang: Lang,
  chatId: string,
  token: string,
  sessionId: string | null,
  userInfo: { username?: string | null; fullName?: string | null }
) {
  try {
    // Cast args to any if types mismatch slightly
    const lead = await dbCreateLead({
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
      notes: args.interest_summary
    } as any);

    if (lead && (lead as any).id) {
      await notifyManagers(lang, token, (lead as any).id, {
        chatId,
        tgUsername: userInfo.username,
        tgFullName: userInfo.fullName
      });
    }

    return lead;

  } catch (e) {
    console.error("submitLead error:", e);
  }
}
