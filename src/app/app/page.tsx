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

const translations: Record<string, any> = {
    ru: {
        loading: 'Загрузка системы...',
        loginTitle: 'Auth Terminal',
        loginDesc: 'Авторизация в системе управления',
        loginPlaceholder: 'Telegram ID',
        loginBtn: 'Войти',
        tabCatalog: 'Каталог',
        tabBonuses: 'Бонусы',
        tabStats: 'Статистика',
        tabLeads: 'Лиды',
        tabUnits: 'Объекты',
        tabFaq: 'FAQ',
        adminMode: 'Admin Mode',
        managerMode: 'Manager Mode',
        clientMode: 'Client Access',
    },
    en: {
        loading: 'Initializing...',
        loginTitle: 'Auth Terminal',
        loginDesc: 'Management system authorization',
        loginPlaceholder: 'Telegram ID',
        loginBtn: 'Login',
        tabCatalog: 'Catalog',
        tabBonuses: 'Bonuses',
        tabStats: 'Stats',
        tabLeads: 'Leads',
        tabUnits: 'Units',
        tabFaq: 'FAQ',
        adminMode: 'Admin Mode',
        managerMode: 'Manager Mode',
        clientMode: 'Client Access',
    },
    tr: {
        loading: 'Başlatılıyor...',
        loginTitle: 'Auth Terminal',
        loginDesc: 'Yönetim sistemi yetkilendirmesi',
        loginPlaceholder: 'Telegram ID',
        loginBtn: 'Giriş',
        tabCatalog: 'Katalog',
        tabBonuses: 'Bonuslar',
        tabStats: 'İstatistik',
        tabLeads: 'Müşteriler',
        tabUnits: 'Objeler',
        tabFaq: 'SSS',
        adminMode: 'Admin Mode',
        managerMode: 'Manager Mode',
        clientMode: 'Client Access',
    },
};

export default function MiniAppDispatcher() {
    const [user, setUser] = useState<any>(null);
    const [loginInputId, setLoginInputId] = useState('');
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState('ru');
    const [activeTab, setActiveTab] = useState<string>('catalog');
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    const t = translations[lang] || translations['ru'];

    useEffect(() => {
        const init = async () => {
            setDebugInfo('Checking SDK...');
            
            // Force inject if missing
            if (!window.Telegram) {
                console.log('[AUTH] Script missing, injecting local...');
                const s = document.createElement('script');
                s.src = '/telegram-web-app.js';
                s.async = false;
                document.head.appendChild(s);
            }

            // Connection test
            let dbStatus = 'Wait';
            try {
                const { error } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(1);
                dbStatus = error ? `Err: ${error.message}` : 'OK';
            } catch (e) {
                dbStatus = 'Fail';
            }

            let tg: any = window.Telegram?.WebApp || (window as any).parent?.Telegram?.WebApp;
            
            // 1. Wait for SDK
            if (!tg) {
                for (let i = 0; i < 60; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    tg = window.Telegram?.WebApp || (window as any).parent?.Telegram?.WebApp;
                    if (tg) break;
                }
            }

            if (tg) {
                setDebugInfo(`SDK OK | DB: ${dbStatus}`);
                try {
                    tg.ready();
                    tg.expand();
                    tg.backgroundColor = '#0a0a0c';
                    tg.headerColor = '#0a0a0c';
                } catch (e) {}
            } else {
                setDebugInfo(`SDK Missing | DB: ${dbStatus} | W:${!!window.Telegram} P:${!!(window as any).parent?.Telegram}`);
            }

            let tgUser: any = null;
            const unsafeKeys = tg?.initDataUnsafe ? Object.keys(tg.initDataUnsafe).join(',') : 'none';
            const hasUserInUnsafe = !!tg?.initDataUnsafe?.user;
            
            // 2. Try initDataUnsafe.user
            for (let i = 0; i < 15; i++) {
                if (tg?.initDataUnsafe?.user?.id) {
                    tgUser = tg.initDataUnsafe.user;
                    break;
                }
                await new Promise(r => setTimeout(r, 200));
            }

            // 3. Fallback: Parse from raw initData string
            if (!tgUser?.id && tg?.initData) {
                try {
                    const searchParams = new URLSearchParams(tg.initData);
                    const userStr = searchParams.get('user');
                    if (userStr) {
                        tgUser = JSON.parse(decodeURIComponent(userStr));
                    }
                } catch (e) {
                    console.error('Failed to parse initData user', e);
                }
            }

            // 4. Fallback: check localStorage
            if (!tgUser?.id) {
                const storedUser = localStorage.getItem('tgUser');
                if (storedUser) tgUser = JSON.parse(storedUser);
            }

            // 5. Final Debug Info
            const debugMsg = `SDK:OK | DB:${dbStatus} | UserInUnsafe:${hasUserInUnsafe} | Keys:${unsafeKeys} | DataLen:${tg?.initData?.length || 0}`;
            setDebugInfo(debugMsg);

            let referrerId: number | null = null;
            if (tg?.initDataUnsafe?.start_param) {
                const ref = parseInt(tg.initDataUnsafe.start_param);
                if (!isNaN(ref)) referrerId = ref;
            }

            if (tgUser?.id) {
                // Persist for next time
                localStorage.setItem('tgUser', JSON.stringify(tgUser));
                
                const supportedLangs = ['ru', 'en', 'tr'];
                const userLang = tgUser.language_code?.toLowerCase();
                if (userLang && supportedLangs.includes(userLang)) {
                    setLang(userLang);
                }
                await fetchUserData(tgUser.id, `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(), tgUser.username, referrerId);
            } else {
                const params = new URLSearchParams(window.location.search);
                const uid = params.get('uid');
                const ref = params.get('ref');
                if (ref && !isNaN(parseInt(ref))) referrerId = parseInt(ref);

                if (uid && !isNaN(parseInt(uid))) {
                    await fetchUserData(parseInt(uid), undefined, undefined, referrerId);
                } else {
                    setLoading(false);
                }
            }
        };
        init();
    }, []);

    const fetchUserData = async (tgId: number, fullName?: string, username?: string, referrerId?: number | null) => {
        try {
            console.log('[AUTH] Fetching/Syncing user:', tgId);
            setLoading(true);
            
            // 1. Check if user exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('role, referrer_id')
                .eq('telegram_id', tgId)
                .maybeSingle();

            if (fetchError) console.error('[AUTH] Fetch error:', fetchError);

            const roleToSet = existingUser?.role || 'client';
            let finalReferrer = existingUser ? existingUser.referrer_id : (referrerId || null);

            // 2. Validate Referrer exists (FK constraint)
            if (finalReferrer && !existingUser) {
                const { data: refExists } = await supabase
                    .from('users')
                    .select('telegram_id')
                    .eq('telegram_id', finalReferrer)
                    .maybeSingle();
                
                if (!refExists) {
                    console.warn('[AUTH] Referrer ID not found in DB, setting to null:', finalReferrer);
                    finalReferrer = null;
                }
            }

            const userData: any = {
                telegram_id: tgId,
                username: username || fullName || `user_${tgId}`,
                full_name: fullName || username || '',
                role: roleToSet,
                lang_code: lang,
                referrer_id: finalReferrer,
            };

            console.log('[AUTH] Upserting user data:', userData);
            const { data: currentUser, error: upsertError } = await supabase
                .from('users')
                .upsert(userData, { onConflict: 'telegram_id' })
                .select()
                .maybeSingle();

            if (upsertError) {
                console.error('[AUTH] Upsert failed:', upsertError);
                // Fallback: if upsert fails (e.g. database error), at least set basic user state to allow entry
                setUser({
                    telegram_id: tgId,
                    role: roleToSet,
                    full_name: fullName || username || 'User',
                    username: username || 'user'
                });
            } else if (currentUser) {
                console.log('[AUTH] Current user state:', currentUser);
                setUser(currentUser);
                if (currentUser.role !== 'client') {
                    setActiveTab('stats');
                }
            } else {
                console.warn('[AUTH] No user returned from upsert, using fallback state');
                setUser({ telegram_id: tgId, role: roleToSet });
            }
        } catch (err) {
            console.error('[AUTH] Critical Error in fetchUserData:', err);
            // Emergency fallback
            setUser({ telegram_id: tgId, role: 'client' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0c]">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                </div>
                <p className="mt-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] animate-pulse">{t.loading}</p>
                <p className="mt-2 text-[8px] text-zinc-700 uppercase font-mono">{debugInfo}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="bg-[#0a0a0c] min-h-screen flex items-center justify-center p-6">
                <div className="glass-card bg-[#121214] p-10 rounded-[40px] w-full max-w-sm space-y-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px]" />
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20">
                            <span className="material-symbols-outlined text-primary text-[40px] font-thin">lock_open</span>
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">{t.loginTitle}</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.loginDesc}</p>
                    </div>
                    <div className="space-y-4">
                        <input
                            type="number"
                            value={loginInputId}
                            onChange={(e) => setLoginInputId(e.target.value)}
                            placeholder={t.loginPlaceholder}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-primary/50 text-center font-black tracking-widest text-xl placeholder:text-zinc-800"
                        />
                        <button
                            onClick={() => fetchUserData(parseInt(loginInputId))}
                            className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(139,92,246,0.3)] active:scale-95 transition-all text-xs"
                        >
                            {t.loginBtn}
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="text-[8px] text-zinc-800 font-mono uppercase tracking-widest">{debugInfo}</p>
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin = user?.role === 'founder' || user?.role === 'admin';
    const isStaff = isAdmin || user?.role === 'manager';

    return (
        <div className="min-h-screen pb-32 bg-[#0a0a0c]">
            {/* MD3 Header */}
            <header className="px-6 pt-10 pb-4 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10" />
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isStaff ? 'bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]' : 'bg-emerald-400'}`} />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                            {isAdmin ? t.adminMode : isStaff ? t.managerMode : t.clientMode}
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                        {isStaff ? 'Terminal' : 'Real Estate'}
                    </h1>
                </div>
                
                {/* Lang Switcher */}
                <button
                    onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px] text-zinc-400 font-black">translate</span>
                </button>

                {showLangDropdown && (
                    <div className="absolute top-24 right-6 w-48 bg-[#1a1a1f] border border-white/10 rounded-3xl shadow-2xl z-[100] overflow-hidden py-2 animate-in fade-in zoom-in duration-200">
                        {['ru', 'en', 'tr'].map((l) => (
                            <button
                                key={l}
                                onClick={() => { setLang(l); setShowLangDropdown(false); }}
                                className={`w-full text-left px-5 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-between ${lang === l ? 'text-primary bg-primary/5' : 'text-zinc-500 hover:bg-white/5'}`}
                            >
                                {l === 'ru' ? 'Русский' : l === 'en' ? 'English' : 'Türkçe'}
                                {lang === l && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="px-5 pt-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'catalog' && <CatalogView lang={lang} />}
                {activeTab === 'bonuses' && <ReferralView user={user} lang={lang} />}
                {activeTab === 'stats' && <StatsView user={user} lang={lang} />}
                {activeTab === 'leads' && <LeadsView lang={lang} />}
                {activeTab === 'units' && <UnitsView lang={lang} />}
                {activeTab === 'faq' && (isAdmin ? <FaqView lang={lang} /> : <ClientFaqView lang={lang} />)}
            </main>

            {/* Premium Nav Bar */}
            <nav className="fixed bottom-0 inset-x-0 z-[100] px-4 pb-8 pt-4">
                <div className="max-w-md mx-auto glass-card bg-[#121214]/80 backdrop-blur-3xl border border-white/5 rounded-[32px] p-2 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <NavTab icon="explore" label={t.tabCatalog} active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} color={isStaff ? 'zinc' : 'primary'} />
                    <NavTab icon="redeem" label={t.tabBonuses} active={activeTab === 'bonuses'} onClick={() => setActiveTab('bonuses')} color={isStaff ? 'zinc' : 'primary'} />
                    
                    {isStaff && (
                        <div className="w-[1px] h-8 bg-white/5 mx-1" />
                    )}

                    {isStaff && (
                        <NavTab icon="analytics" label={t.tabStats} active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} color="primary" />
                    )}
                    {isStaff && (
                        <NavTab icon="person_search" label={t.tabLeads} active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} color="primary" />
                    )}
                    {isAdmin && (
                        <NavTab icon="apartment" label={t.tabUnits} active={activeTab === 'units'} onClick={() => setActiveTab('units')} color="primary" />
                    )}
                    
                    <NavTab icon="help" label={t.tabFaq} active={activeTab === 'faq'} onClick={() => setActiveTab('faq')} color={isStaff ? 'primary' : 'zinc'} />
                </div>
            </nav>
        </div>
    );
}

function NavTab({ icon, label, active, onClick, color = 'primary' }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 flex-1 ${active ? 'scale-110' : 'opacity-40 hover:opacity-100'}`}
        >
            <div className={`w-12 h-8 rounded-2xl flex items-center justify-center transition-all ${active ? (color === 'primary' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white') : 'text-zinc-500'}`}>
                <span className="material-symbols-outlined text-[24px] font-black" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                    {icon}
                </span>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-zinc-600'}`}>{label}</span>
        </button>
    );
}

