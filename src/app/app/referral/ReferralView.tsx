'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Партнёрская Программа',
        desc: 'Приглашайте друзей и получайте вознаграждение за каждую успешную сделку.',
        invited: 'Приглашено',
        balance: 'Бонусы (€)',
        copied: 'Ссылка скопирована!',
        shareText: 'Посмотри каталог Emedeo — отличные варианты для аренды и покупки!',
        yourLink: 'Ваша реферальная ссылка',
        promoLabel: 'ПРОМОКОД',
        inviteBtn: 'ПРИГЛАСИТЬ ДРУЗЕЙ',
        howItWorks: 'Как это работает',
        step1: 'Поделитесь своей ссылкой с потенциальными инвесторами.',
        step2: 'Они смотрят каталог и оставляют заявку через бота.',
        step3: 'Вы получаете вознаграждение, когда сделка подтверждается.',
        getQrChat: 'Получить QR в чат',
    },
    en: {
        title: 'Affiliate Program',
        desc: 'Invite friends and earn rewards for every successful Emedeo deal.',
        invited: 'Invited',
        balance: 'Bonus (€)',
        copied: 'Link copied!',
        shareText: 'Check out Emedeo catalog — great deals for rent and purchase!',
        yourLink: 'Your Referral Link',
        promoLabel: 'PROMO',
        inviteBtn: 'INVITE FRIENDS',
        howItWorks: 'How it works',
        step1: 'Share your link with potential investors.',
        step2: 'They browse the catalog and submit a lead via the bot.',
        step3: 'You get credited when the deal is confirmed.',
        getQrChat: 'Get QR in Chat',
    },
    tr: {
        title: 'Ortaklık Programı',
        desc: 'Arkadaşlarınızı davet edin ve her başarılı işlem için ödül kazanın.',
        invited: 'Davet Edildi',
        balance: 'Bonus (€)',
        copied: 'Link kopyalandı!',
        shareText: 'Bu Emedeo kataloğuna göz at — harika kiralık ve satılık fırsatlar!',
        yourLink: 'Referans Linkiniz',
        promoLabel: 'PROMO',
        inviteBtn: 'ARKADAŞ DAVET ET',
        howItWorks: 'Nasıl çalışır',
        step1: 'Linkinizi potansiyel yatırımcılarla paylaşın.',
        step2: 'Kataloğu incelesinler ve bot üzerinden başvuru yapsınlar.',
        step3: 'İşlem onaylandığında ödülünüzü alın.',
        getQrChat: 'QR\'ı Sohbete Al',
    },
    de: {
        title: 'Partnerprogramm',
        desc: 'Laden Sie Freunde ein und erhalten Sie Belohnungen für jeden erfolgreichen Immobiliendeal.',
        invited: 'Eingeladen',
        balance: 'Bonus (€)',
        copied: 'Link kopiert!',
        shareText: 'Schau dir diesen Emedeo-Katalog an — tolle Angebote zur Miete und zum Kauf!',
        yourLink: 'Ihr Empfehlungslink',
        promoLabel: 'PROMO',
        inviteBtn: 'FREUNDE EINLADEN',
        howItWorks: 'Wie es funktioniert',
        step1: 'Teilen Sie Ihren Link mit potenziellen Investoren.',
        step2: 'Diese durchsuchen den Katalog und senden eine Anfrage über den Bot.',
        step3: 'Sie erhalten eine Gutschrift, wenn der Deal bestätigt wird.',
        getQrChat: 'QR im Chat erhalten',
    },
    es: {
        title: 'Programa de Afiliados',
        desc: 'Invita a tus amigos и gana recompensas por cada trato inmobiliario exitoso.',
        invited: 'Invitados',
        balance: 'Bono (€)',
        copied: '¡Enlace copiado!',
        shareText: '¡Mira este catálogo de Emedeo: excelentes ofertas de alquiler y compra!',
        yourLink: 'Tu enlace de referido',
        promoLabel: 'PROMO',
        inviteBtn: 'INVITAR AMIGOS',
        howItWorks: 'Cómo funciona',
        step1: 'Comparte tu enlace con inversores potenciales.',
        step2: 'Ellos exploran el catálogo y envían una solicitud a través del bot.',
        step3: 'Recibes el crédito cuando se confirma el trato.',
        getQrChat: 'Obtener QR en el chat',
    },
    ar: {
        title: 'برنامج الشركاء',
        desc: 'ادعُ أصدقاءك واحصل على مكافآت مقابل كل صفقة عقارية ناجحة.',
        invited: 'تمت دعوتهم',
        balance: 'المكافأة (€)',
        copied: 'تم نسخ الرابط!',
        shareText: 'تحقق من كتالوج Emedeo هذا - عروض رائعة للإيجار والشراء!',
        yourLink: 'رابط الإحالة الخاص بك',
        promoLabel: 'الرمز الترويجي',
        inviteBtn: 'دعوة الأصدقاء',
        howItWorks: 'كيف يعمل',
        step1: 'شارك رابطك مع المستثمرين المحتملين.',
        step2: 'يتصفحون الكتالوج ويقدمون طلباً عبر البوت.',
        step3: 'تحصل على المكافأة عند تأكيد الصفقة.',
        getQrChat: 'احصل على QR في الدردشة',
    },
    fr: {
        title: 'Programme d\'Affiliation',
        desc: 'Invitez des amis et gagnez des récompenses pour chaque transaction immobilière réussie.',
        invited: 'Invités',
        balance: 'Bonus (€)',
        copied: 'Lien copié !',
        shareText: 'Consultez ce catalogue Emedeo — d\'excellentes offres pour la location et l\'achat !',
        yourLink: 'Votre lien de parrainage',
        promoLabel: 'PROMO',
        inviteBtn: 'INVITER DES AMIS',
        howItWorks: 'Comment ça marche',
        step1: 'Partagez votre lien avec des investisseurs potentiels.',
        step2: 'Ils parcourent le catalogue et soumettent une demande via le bot.',
        step3: 'Vous recevez un crédit lorsque la transaction est confirmée.',
        getQrChat: 'Obtenir QR dans le chat',
    },
};

export default function ReferralView({ user, lang = 'ru' }: { user: any; lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [stats, setStats] = useState({ invited: 0 });
    const [loading, setLoading] = useState(true);

    const botUsername = 'emedeoestate_bot';
    const refLink = `https://t.me/${botUsername}?start=${user?.telegram_id || ''}`;
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

    useEffect(() => {
        if (user?.telegram_id) fetchStats();
    }, [user?.telegram_id]);

    const fetchStats = async () => {
        setLoading(true);
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', user.telegram_id);
        setStats({ invited: count || 0 });
        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => tg?.showAlert(t.copied)).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text: string) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); tg?.showAlert(t.copied); } catch {}
        document.body.removeChild(ta);
    };

    const shareLink = () => {
        if (tg) {
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(t.shareText)}`);
        }
    };

    const handleSendQr = async () => {
        if (!user?.telegram_id) return;
        try {
            tg?.showAlert('Отправляем QR в чат...');
            await fetch('/api/send-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_id: user.telegram_id }),
            });
            tg?.close();
        } catch {
            tg?.showAlert('Ошибка отправки QR');
        }
    };

    return (
        <div className="space-y-6 max-w-md mx-auto">
            {/* Hero */}
            <div className="text-center space-y-3 py-4 animate-fade-in">
                <div className="inline-flex p-4 bg-primary/10 rounded-3xl border border-primary/20 neon-glow">
                    <span className="material-symbols-outlined text-primary text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                </div>
                <h1 className="text-2xl font-black text-on-background tracking-tight">{t.title}</h1>
                <p className="text-outline text-sm font-medium leading-relaxed max-w-[300px] mx-auto">{t.desc}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="card-premium flex flex-col items-center text-center space-y-1">
                    <div className="bg-primary/10 p-2 rounded-xl mb-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">group_add</span>
                    </div>
                    <p className="text-2xl font-black text-on-background">{stats.invited}</p>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{t.invited}</p>
                </div>
                <div className="card-premium flex flex-col items-center text-center space-y-1">
                    <div className="bg-secondary-container/10 p-2 rounded-xl mb-2">
                        <span className="material-symbols-outlined text-secondary-container text-[20px]">account_balance_wallet</span>
                    </div>
                    <p className="text-2xl font-black text-on-background">€{user?.balance?.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{t.balance}</p>
                </div>
            </div>

            {/* Referral Link Card */}
            <div className="card-premium space-y-5 relative overflow-hidden group neon-glow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all duration-700" />

                <div className="space-y-4 relative">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/15 p-2 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                        </div>
                        <h3 className="font-bold text-on-background uppercase tracking-widest text-xs">{t.yourLink}</h3>
                    </div>

                    {/* Link */}
                    <div
                        onClick={() => copyToClipboard(refLink)}
                        className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/5 transition-all group/link"
                    >
                        <span className="flex-1 text-sm text-outline font-mono truncate">{refLink}</span>
                        <span className="material-symbols-outlined text-primary text-[18px] group-hover/link:scale-110 transition-transform">content_copy</span>
                    </div>

                    {/* Promo */}
                    <div
                        onClick={() => copyToClipboard(String(user?.telegram_id))}
                        className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/5 transition-all group/promo"
                    >
                        <span className="text-[10px] font-bold text-outline-variant uppercase tracking-wider pr-3 border-r border-white/5">{t.promoLabel}</span>
                        <span className="flex-1 font-bold text-primary font-mono text-[15px]">{user?.telegram_id || ''}</span>
                        <span className="material-symbols-outlined text-outline-variant text-[18px] group-hover/promo:scale-110 transition-transform">content_copy</span>
                    </div>

                    {/* QR Code */}
                    <div className="pt-4 border-t border-white/5 flex flex-col items-center">
                        <div className="bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.05)] mb-4">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(refLink)}`}
                                alt="QR Code"
                                width={160}
                                height={160}
                                className="rounded-xl block"
                            />
                        </div>
                        <button
                            onClick={handleSendQr}
                            className="btn-secondary w-full"
                        >
                            <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
                            {t.getQrChat}
                        </button>
                    </div>

                    {/* Share Button */}
                    <button
                        onClick={shareLink}
                        className="btn-primary w-full"
                    >
                        <span className="material-symbols-outlined">share</span>
                        {t.inviteBtn}
                    </button>
                </div>
            </div>

            {/* How It Works */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] px-1">{t.howItWorks}</h3>
                {[t.step1, t.step2, t.step3].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.05]">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20 flex-shrink-0">
                            {i + 1}
                        </div>
                        <p className="text-xs text-outline font-medium leading-relaxed">{text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
