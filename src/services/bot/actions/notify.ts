import { sendMessage } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";

function escapeHtml(text: string): string {
    return (text || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyAdminsOfLead(
    token: string,
    chatId: string,
    userInfo: { username?: string; fullName?: string; phone?: string },
    leadData: { action: string; title: string; phone: string; unit_id?: string },
    unit?: any
) {
    const supabase = getServerClient();

    // Fetch all staff members (founder, admin, manager)
    const { data: staffMembers } = await supabase
        .from("users")
        .select("telegram_id, role, referrer_id")
        .in("role", ["founder", "admin", "manager"]);

    if (!staffMembers || staffMembers.length === 0) return;

    // Get the user's referrer to notify them if they are a manager
    const { data: userRecord } = await supabase
        .from('users')
        .select('referrer_id')
        .eq('telegram_id', parseInt(chatId))
        .maybeSingle();
    
    const referrer_id = userRecord?.referrer_id;

    const name = userInfo.fullName || userInfo.username || "Client";
    const phoneText = `\n📞 <b>Номер:</b> <code>${escapeHtml(leadData.phone)}</code>`;
    const unitText = unit ? `\n🏠 <b>Объект:</b> ${escapeHtml(unit.title?.ru || unit.title || unit.city)}` : `\n🏠 <b>Объект:</b> ${escapeHtml(leadData.title)}`;
    const reason = leadData.action === 'book_now' ? "ХОЧУ КУПИТЬ / ЗАБРОНИРОВАТЬ" : "Расскажи подробнее";

    const alertMsg = `🔥 <b>ЗАЯВКА ИЗ MINI APP</b> 🔥\n\n👤 Пользователь: @${userInfo.username || chatId}\n👤 Имя: ${escapeHtml(name)}\n🆔 ID: <code>${chatId}</code>${phoneText}${unitText}\n💬 Причина: ${escapeHtml(reason)}`;

    // Filter recipients: all founders/admins, and the manager if they are the referrer
    const recipients = staffMembers.filter(r => 
        r.role === 'founder' || 
        r.role === 'admin' || 
        (r.role === 'manager' && (String(r.telegram_id) === String(referrer_id)))
    );

    // If no specific manager, notify ALL managers if it's a direct booking
    const finalRecipients = recipients.length > 0 ? recipients : staffMembers;

    for (const recipient of finalRecipients) {
        if (recipient.telegram_id) {
            // Get the last lead for buttons
            const { data: lastLead } = await supabase
                .from('leads')
                .select('id')
                .eq('user_id', parseInt(chatId))
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const buttons: any = {
                inline_keyboard: [
                    [{ text: "✉️ Написать клиенту", callback_data: `contactuser_${chatId}` }]
                ]
            };

            if (lastLead) {
                buttons.inline_keyboard.push([
                    { text: "✅ Подтвердить сделку", callback_data: `deal_confirm_${lastLead.id}` },
                    { text: "❌ Отмена", callback_data: `deal_cancel_${lastLead.id}` }
                ]);
            }

            buttons.inline_keyboard.push([{ text: "В дашборд ↗️", url: "https://ai2b.app/app/stats" }]);

            await sendMessage(token, String(recipient.telegram_id), alertMsg, { 
                parse_mode: 'HTML',
                reply_markup: buttons
            }).catch(e => console.error(`[NotifyAdmins] Error sending to ${recipient.telegram_id}:`, e));
        }
    }
}
