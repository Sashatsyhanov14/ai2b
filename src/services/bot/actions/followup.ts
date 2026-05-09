import { sendMessage, sendPhoto } from "@/lib/telegram";
import { runClientTranslatorAgent } from "../ai/agents";

/**
 * Schedules a delayed advertising/follow-up message for the user.
 * Sent 2 minutes after a lead/order is created.
 */
export async function scheduleFollowup(chatId: string, token: string, lang: string = 'ru') {
    const delayTextRu = `Благодарим Вас за проявленный интерес и уделенное время! 🙏
Желаем Вам найти идеальный объект для жизни или инвестиций! 🏠

Ваша заявка уже успешно принята — менеджер свяжется с Вами в ближайшее время для подбора лучших вариантов. Мы на связи и уже начали работу! 🚀

Рекомендуем также установить приложение <b>eMedeo</b> — цифровую платформу для комфортной жизни и управления делами за границей 🤖

ИИ от eMedeo поможет Вам:
• Оформить ВНЖ и гражданство ⚖️
• Подобрать трансфер 🚗
• Арендовать авто или жильё на время поиска 🏡
• Купить eSIM для интернета сразу по прилёту 📱
• Совершать покупки и бронировать услуги 🛍️
• Получить юридические и консультационные услуги 📝

— Мир без посредников —

Мы всегда рядом, если возникнут вопросы — чат поддержки 24/7 💬

Наше приложение:
Android: https://play.google.com/store/apps/details?id=com.emedeo.codeware
iOS: https://apps.apple.com/app/emedeo/id6738978452`;

    console.log(`[Followup] Scheduled for ${chatId} in 2 minutes...`);

    setTimeout(async () => {
        try {
            console.log(`[Followup] Executing for ${chatId}...`);
            // Localize text
            const localizedMsg = await runClientTranslatorAgent(delayTextRu, lang, []);
            
            // Shared eMedeo promo photo
            const photoUrl = 'https://drive.google.com/uc?export=download&id=1zxDZ_QkKYu6VKFlS7nNlRktlLKLxSx47';
            
            try {
                await sendPhoto(token, chatId, photoUrl, localizedMsg, { parse_mode: 'HTML' });
                console.log(`[Followup] Photo sent to ${chatId}`);
            } catch (err) {
                console.error('[Followup] Photo send failed, sending text only:', err);
                await sendMessage(token, chatId, localizedMsg, { 
                    parse_mode: 'HTML', 
                    disable_web_page_preview: true 
                });
                console.log(`[Followup] Text sent to ${chatId}`);
            }
        } catch (e) {
            console.error('[Followup] Fatal error during execution:', e);
        }
    }, 2 * 60 * 1000); // 2 minutes
}
