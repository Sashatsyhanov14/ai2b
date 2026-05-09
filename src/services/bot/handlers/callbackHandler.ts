import { sendMessage } from "@/lib/telegram";
import { getServerClient } from "@/lib/supabaseClient";

export async function handleCallbackQuery(callbackQuery: any, token: string) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id.toString();
    const messageId = callbackQuery.message.message_id;
    const supabase = getServerClient();

    console.log(`[Bot] Callback received: ${data}`);

    if (data.startsWith('deal_confirm_')) {
        const leadId = data.replace('deal_confirm_', '');
        if (leadId === 'none') return;

        // 1. Get Lead and related Unit
        const { data: lead } = await supabase
            .from('leads')
            .select('*, units(price, title)')
            .eq('id', leadId)
            .single();

        if (!lead) return;

        // 2. Update Lead status
        await supabase.from('leads').update({ status: 'closed' }).eq('id', leadId);

        // 3. Process Referral Bonus (2.5%)
        if (lead.referrer_id) {
            const price = lead.deal_amount || lead.units?.price || 0;
            const commissionRate = 0.025; // 2.5%
            const reward = Math.round((price * commissionRate) * 100) / 100;

            if (reward > 0) {
                const { data: referrer } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('telegram_id', lead.referrer_id)
                    .single();

                const newBalance = (referrer?.balance || 0) + reward;
                await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', lead.referrer_id);
                
                await supabase.from('leads').update({ 
                    commission_paid: true, 
                    bonus_paid_at: new Date().toISOString(),
                    deal_amount: price
                }).eq('id', leadId);

                // Notify Referrer
                const refMsg = `💰 <b>Бонус начислен!</b>\n\nВам начислено <b>€${reward}</b> (2.5% от сделки) за рекомендацию клиента. Спасибо за сотрудничество!`;
                sendMessage(token, String(lead.referrer_id), refMsg, { parse_mode: 'HTML' }).catch(() => {});
            }
        }

        // 4. Update Manager Message
        const updatedText = callbackQuery.message.text + `\n\n✅ <b>СДЕЛКА ПОДТВЕРЖДЕНА</b>\n💰 Комиссия начислена рефералу.`;
        // In this simple version, we just send a new message or we could use editMessageText if we had a lib for it
        // Our sendMessage lib doesn't support editMessageText yet. Let's add it or just send a notification.
        sendMessage(token, chatId, updatedText, { parse_mode: 'HTML' });
    }

    if (data.startsWith('deal_cancel_')) {
        const leadId = data.replace('deal_cancel_', '');
        if (leadId === 'none') return;

        await supabase.from('leads').update({ status: 'cancelled' }).eq('id', leadId);
        
        const updatedText = callbackQuery.message.text + `\n\n❌ <b>ОТКЛОНЕНО МЕНЕДЖЕРОМ</b>`;
        sendMessage(token, chatId, updatedText, { parse_mode: 'HTML' });
    }

    if (data.startsWith('contactuser_')) {
        const targetUserId = data.replace('contactuser_', '');
        await supabase.from('users').update({ manager_contact_id: targetUserId }).eq('telegram_id', parseInt(chatId));
        
        const msg = `💬 <b>Режим чата ВКЛЮЧЕН!</b>\n\nВаше <u>следующее</u> сообщение будет отправлено пользователю <code>${targetUserId}</code>.\n\nПосле отправки режим автоматически выключится.`;
        sendMessage(token, chatId, msg, { 
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: "❌ Отмена", callback_data: "exit_contact" }]]
            }
        });
    }

    if (data === 'exit_contact') {
        await supabase.from('users').update({ manager_contact_id: null }).eq('telegram_id', parseInt(chatId));
        sendMessage(token, chatId, "✅ Режим чата выключен.");
    }
}
