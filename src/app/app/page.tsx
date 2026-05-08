'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CatalogView from './catalog/CatalogView';
import ReferralView from './referral/ReferralView';
import StatsView from './dashboard/StatsView';
import FaqView from './faq/FaqView';
import ClientFaqView from './faq/ClientFaqView';
import UnitsView from './properties/UnitsView';
import LeadsView from './leads/LeadsView';

declare global {
    interface Window {
        Telegram: any;
    }
}

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || 'ai2b_app_bot';

// ==========================================
// TRANSLATIONS
// ==========================================
const translations: Record<string, any> = {
    ru: {
        loading: 'Загрузка данных...',
        loginTitle: 'Вход в панель',
        loginDesc: 'Открыто вне Telegram. Введите свой Telegram ID для доступа.',
        loginPlaceholder: 'Введите ID (например, 12345678)',
        loginBtn: 'Войти',
        // Tabs
        tabCatalog: 'Каталог',
        tabBonuses: 'Бонусы',
        tabStats: 'Статистика',
        tabLeads: 'Лиды',
        tabUnits: 'Объекты',
        tabFaq: 'FAQ',
        // Headers
        clientTitle: 'Real Estate',
        clientSubtitle: 'Ваш персональный консультант',
        adminTitle: 'Панель Управления',
        adminSubtitle: 'Глобальная статистика',
        managerTitle: 'Менеджер',
        managerSubtitle: 'Мониторинг и управление',
    },
    en: {
        loading: 'Loading data...',
        loginTitle: 'Panel Login',
        loginDesc: 'Opened outside of Telegram. Enter your Telegram ID for access.',
        loginPlaceholder: 'Enter ID (e.g., 12345678)',
        loginBtn: 'Login',
        tabCatalog: 'Catalog',
        tabBonuses: 'Bonuses',
        tabStats: 'Stats',
        tabLeads: 'Leads',
        tabUnits: 'Units',
        tabFaq: 'FAQ',
        clientTitle: 'Real Estate',
        clientSubtitle: 'Your personal assistant',
        adminTitle: 'Control Panel',
        adminSubtitle: 'Global Statistics',
        managerTitle: 'Manager',
        managerSubtitle: 'Monitoring & management',
    },
    tr: {
        loading: 'Veriler yükleniyor...',
        loginTitle: 'Panel Girişi',
        loginDesc: 'Telegram dışında açıldı. Erişim için Telegram ID girin.',
        loginPlaceholder: 'ID girin (örn. 12345678)',
        loginBtn: 'Giriş Yap',
        tabCatalog: 'Katalog',
        tabBonuses: 'Bonuslar',
        tabStats: 'İstatistik',
        tabLeads: 'Müşteriler',
        tabUnits: 'Objeler',
        tabFaq: 'SSS',
        clientTitle: 'Emlak',
        clientSubtitle: 'Kişisel danışmanınız',
        adminTitle: 'Kontrol Paneli',
        adminSubtitle: 'Küresel İstatistikler',
        managerTitle: 'Yönetici',
        managerSubtitle: 'İzleme ve yönetim',
    },
};

export default function MiniAppDispatcher() {
    const [user, setUser] = useState<any>(null);
    const [loginInputId, setLoginInputId] = useState('');
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState('ru');
    const [activeTab, setActiveTab] = useState<string>('catalog');
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const t = translations[lang] || translations['ru'];

    // ==========================================
    // AUTH FLOW (esimbot pattern)
    // ==========================================
    useEffect(() => {
        const init = async () => {
            const tg = window.Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
            }

            let tgUser: any = null;

            // 1. Try Telegram initDataUnsafe (priority in mini app)
            if (tg?.initDataUnsafe?.user?.id) {
                tgUser = tg.initDataUnsafe.user;
            }

            // 2. Retry a few times if SDK not ready
            if (!tgUser?.id && tg) {
                for (let i = 0; i < 5; i++) {
                    tgUser = tg?.initDataUnsafe?.user;
                    if (tgUser?.id) break;
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            // 3. Fallback to URL params (?uid=)
            if (!tgUser?.id) {
                const params = new URLSearchParams(window.location.search);
                const uid = params.get('uid');
                if (uid && !isNaN(parseInt(uid))) {
                    await fetchUserData(parseInt(uid));
                    return;
                }
            }

            // 4. If we have Telegram user, fetch data
            if (tgUser?.id) {
                const supportedLangs = ['ru', 'en', 'tr'];
                const userLang = tgUser.language_code?.toLowerCase();
                if (userLang && supportedLangs.includes(userLang)) {
                    setLang(userLang);
                }
                await fetchUserData(
                    tgUser.id,
                    `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
                    tgUser.username
                );
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    // ==========================================
    // FETCH / CREATE USER
    // ==========================================
    const fetchUserData = async (tgId: number, fullName?: string, username?: string) => {
        try {
            setLoading(true);
            const { data: userData, error: fetchErr } = await supabase
                .from('users')
                .select('*')
                .eq('telegram_id', tgId)
                .single();

            let currentUser = userData;

            // Self-registration: if user doesn't exist, create them
            if (!userData && (fetchErr?.code === 'PGRST116' || !fetchErr)) {
                const newUser = {
                    telegram_id: tgId,
                    username: username || fullName || `user_${tgId}`,
                    full_name: fullName || username || '',
                    role: 'client',
                    balance: 0,
                    lang_code: lang,
                };
                const { data: created, error: regError } = await supabase
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();
                if (created) {
                    currentUser = created;
                    console.log('[AUTH] Self-registration for:', tgId);
                } else {
                    console.error('[AUTH] Registration failed:', regError);
                }
            }

            if (currentUser) {
                setUser(currentUser);
                // Auto-navigate admins/managers to stats tab
                if (currentUser.role === 'founder' || currentUser.role === 'admin' || currentUser.role === 'manager') {
                    setActiveTab('stats');
                }
            }
        } catch (err) {
            console.error('[AUTH] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualLogin = async () => {
        if (!loginInputId) return;
        setLoading(true);
        await fetchUserData(parseInt(loginInputId));
    };

    // ==========================================
    // LOADING STATE
    // ==========================================
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c] gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-violet-500/20 rounded-full animate-spin border-t-violet-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 bg-violet-500/40 rounded-full animate-pulse" />
                    </div>
                </div>
                <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest animate-pulse">{t.loading}</p>
            </div>
        );
    }

    // ==========================================
    // LOGIN SCREEN (outside Telegram)
    // ==========================================
    if (!user) {
        return (
            <div className="bg-[#0a0a0c] min-h-screen flex items-center justify-center p-6">
                <div className="bg-[#121214] p-8 rounded-3xl w-full max-w-sm space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/5">
                    <div className="text-center space-y-3">
                        <div className="w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.15)]">
                            <span className="material-symbols-outlined text-violet-400 text-4xl">apartment</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.loginTitle}</h1>
                        <p className="text-sm text-zinc-500 leading-relaxed">{t.loginDesc}</p>
                    </div>
                    <div className="space-y-4">
                        <input
                            type="number"
                            value={loginInputId}
                            onChange={(e) => setLoginInputId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualLogin()}
                            placeholder={t.loginPlaceholder}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-violet-500/50 text-center font-mono text-lg placeholder:text-zinc-600"
                        />
                        <button
                            onClick={handleManualLogin}
                            className="w-full bg-violet-500/20 text-violet-400 border border-violet-500/30 py-4 rounded-2xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:bg-violet-500/30 transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
                        >
                            {t.loginBtn}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // ROLE DETECTION
    // ==========================================
    const isAdmin = user?.role === 'founder' || user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isStaff = isAdmin || isManager;
    const isStaffTab = ['stats', 'leads', 'units', 'faq'].includes(activeTab);

    // ==========================================
    // LANGUAGE SWITCHER
    // ==========================================
    const renderLangSwitcher = () => (
        <div className="relative">
            <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-extrabold text-zinc-300 flex items-center gap-1.5 transition-all border border-white/10 active:scale-95"
            >
                <span className="material-symbols-outlined text-[14px] text-violet-400">language</span>
                {lang.toUpperCase()}
            </button>
            {showLangDropdown && (
                <>
                    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" onClick={() => setShowLangDropdown(false)} />
                    <div className="fixed top-12 right-6 w-40 bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl z-[101] overflow-hidden py-1.5">
                        <div className="px-4 py-2 border-b border-white/5 mb-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language</p>
                        </div>
                        {[
                            { code: 'ru', flag: '🇷🇺', name: 'Русский' },
                            { code: 'en', flag: '🇺🇸', name: 'English' },
                            { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
                        ].map((l) => (
                            <button
                                key={l.code}
                                onClick={() => { setLang(l.code); setShowLangDropdown(false); }}
                                className={`w-full text-left px-4 py-3 text-xs font-bold transition-all flex items-center justify-between border-l-4 ${lang === l.code ? 'text-violet-400 bg-violet-500/10 border-violet-500' : 'text-zinc-300 border-transparent hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-base leading-none">{l.flag}</span>
                                    <span>{l.name}</span>
                                </div>
                                {lang === l.code && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    // ==========================================
    // HEADER
    // ==========================================
    const renderHeader = () => {
        const isStaffMode = isStaff && isStaffTab;
        const title = isStaffMode
            ? (isAdmin ? t.adminTitle : t.managerTitle)
            : t.clientTitle;
        const subtitle = isStaffMode
            ? (isAdmin ? t.adminSubtitle : t.managerSubtitle)
            : t.clientSubtitle;
        const accentColor = isStaffMode ? 'text-violet-400' : 'text-emerald-400';

        return (
            <header className="px-6 pt-10 pb-6 relative overflow-hidden">
                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/15 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-500/8 rounded-full blur-[60px] -z-10 -translate-x-1/2 translate-y-1/4 pointer-events-none" />

                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className={`text-[11px] font-extrabold ${accentColor} tracking-[0.2em] uppercase`}>{subtitle}</p>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                            {title}
                        </h1>
                    </div>
                    {renderLangSwitcher()}
                </div>
            </header>
        );
    };

    // ==========================================
    // VIEW ROUTER
    // ==========================================
    const renderView = () => {
        switch (activeTab) {
            case 'catalog':
                return <CatalogView lang={lang} />;
            case 'bonuses':
                return <ReferralView user={user} lang={lang} />;
            case 'stats':
                return isStaff ? <StatsView user={user} lang={lang} /> : <CatalogView lang={lang} />;
            case 'leads':
                return isStaff ? <LeadsView lang={lang} /> : <CatalogView lang={lang} />;
            case 'units':
                return isStaff ? <UnitsView lang={lang} /> : <CatalogView lang={lang} />;
            case 'faq':
                return isAdmin ? <FaqView lang={lang} /> : <ClientFaqView lang={lang} />;
            default:
                return <CatalogView lang={lang} />;
        }
    };

    // ==========================================
    // BOTTOM NAVIGATION
    // ==========================================
    return (
        <div className="min-h-screen pb-28 bg-[#0a0a0c]">
            {renderHeader()}
            <main className="px-4 pt-2 space-y-6 max-w-2xl mx-auto">
                {renderView()}
            </main>

            <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-3 bg-[#0a0a0c]/80 backdrop-blur-2xl rounded-t-[1.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] border-t border-white/5">
                {/* Catalog — always visible */}
                <NavTab
                    icon="home"
                    label={t.tabCatalog}
                    active={activeTab === 'catalog'}
                    onClick={() => setActiveTab('catalog')}
                    color="emerald"
                />

                {/* Bonuses — always visible */}
                <NavTab
                    icon="featured_seasonal"
                    label={t.tabBonuses}
                    active={activeTab === 'bonuses'}
                    onClick={() => setActiveTab('bonuses')}
                    color="amber"
                />

                {/* Stats — staff only */}
                {isStaff && (
                    <NavTab
                        icon="analytics"
                        label={t.tabStats}
                        active={activeTab === 'stats'}
                        onClick={() => setActiveTab('stats')}
                        color="violet"
                    />
                )}

                {/* Leads — staff only */}
                {isStaff && (
                    <NavTab
                        icon="person_search"
                        label={t.tabLeads}
                        active={activeTab === 'leads'}
                        onClick={() => setActiveTab('leads')}
                        color="violet"
                    />
                )}

                {/* Units — admin only */}
                {isAdmin && (
                    <NavTab
                        icon="apartment"
                        label={t.tabUnits}
                        active={activeTab === 'units'}
                        onClick={() => setActiveTab('units')}
                        color="violet"
                    />
                )}

                {/* FAQ — always visible */}
                <NavTab
                    icon="help"
                    label={t.tabFaq}
                    active={activeTab === 'faq'}
                    onClick={() => setActiveTab('faq')}
                    color={isStaff && activeTab === 'faq' ? 'violet' : 'emerald'}
                />
            </nav>
        </div>
    );
}

// ==========================================
// NAV TAB COMPONENT
// ==========================================
function NavTab({ icon, label, active, onClick, color = 'violet' }: any) {
    const colorMap: Record<string, string> = {
        violet: 'text-violet-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
    };
    const activeColor = colorMap[color] || colorMap.violet;
    const glowMap: Record<string, string> = {
        violet: 'shadow-[0_0_8px_rgba(139,92,246,0.6)]',
        emerald: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        amber: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    };
    const bgMap: Record<string, string> = {
        violet: 'bg-violet-400',
        emerald: 'bg-emerald-400',
        amber: 'bg-amber-400',
    };

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-full max-w-[72px] ${active ? `${activeColor} scale-110` : 'text-zinc-600 hover:text-zinc-400'}`}
        >
            <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
                {icon}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest mt-0.5">{label}</span>
            {active && <div className={`w-1 h-1 rounded-full ${bgMap[color]} ${glowMap[color]}`} />}
        </button>
    );
}
