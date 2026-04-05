'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { supabase } from '@/lib/supabaseClient';
import CatalogView from './catalog/CatalogView';
import ReferralView from './referral/ReferralView';
import StatsView from './dashboard/StatsView'; // Move stats logic here later
import FaqView from './faq/FaqView';
import UnitsView from './properties/UnitsView'; // Mobile optimized properties

export default function MiniAppDispatcher() {
    const { t } = useI18n();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('catalog');

    useEffect(() => {
        const init = async () => {
            const tg = (window as any).Telegram?.WebApp;
            if (tg) {
                tg.ready();
                tg.expand();
            }

            const tgUser = tg?.initDataUnsafe?.user;
            if (tgUser?.id) {
                // Fetch our internal user data
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('telegram_id', tgUser.id)
                    .single();

                if (data) {
                    setUser(data);
                } else {
                    // Create if not exists (minimal)
                    const { data: newUser } = await supabase
                        .from('users')
                        .upsert({
                            telegram_id: tgUser.id,
                            username: tgUser.username,
                            full_name: `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim(),
                            role: 'client'
                        }, { onConflict: 'telegram_id' })
                        .select()
                        .single();
                    setUser(newUser);
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const isManager = user?.role === 'manager' || user?.role === 'admin';

    const renderView = () => {
        switch (activeTab) {
            case 'catalog': return <CatalogView />;
            case 'bonuses': return <ReferralView user={user} />;
            case 'stats': return isManager ? <StatsView /> : <CatalogView />;
            case 'faq': return isManager ? <FaqView /> : <CatalogView />;
            case 'units': return isManager ? <UnitsView /> : <CatalogView />;
            default: return <CatalogView />;
        }
    };

    return (
        <div className="min-h-screen pb-24 bg-[#0a0a0c]">
            {renderView()}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-6 left-4 right-4 z-50">
                <div className="bg-[#121214]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex justify-around shadow-2xl">
                    <TabItem 
                        icon="home" 
                        label={t('nav.catalog')} 
                        active={activeTab === 'catalog'} 
                        onClick={() => setActiveTab('catalog')} 
                    />
                    <TabItem 
                        icon="featured_seasonal" 
                        label={t('nav.bonuses')} 
                        active={activeTab === 'bonuses'} 
                        onClick={() => setActiveTab('bonuses')} 
                    />
                    {isManager && (
                        <>
                            <TabItem 
                                icon="analytics" 
                                label={t('nav.stats')} 
                                active={activeTab === 'stats'} 
                                onClick={() => setActiveTab('stats')} 
                            />
                            <TabItem 
                                icon="help" 
                                label="FAQ" 
                                active={activeTab === 'faq'} 
                                onClick={() => setActiveTab('faq')} 
                            />
                            <TabItem 
                                icon="apartment" 
                                label="Units" 
                                active={activeTab === 'units'} 
                                onClick={() => setActiveTab('units')} 
                            />
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}

function TabItem({ icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
            <span className={`material-symbols-outlined text-[24px] ${active ? 'fill-1' : ''}`}>
                {icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
            {active && <div className="w-1 h-1 rounded-full bg-primary mt-1 shadow-[0_0_8px_var(--primary)]" />}
        </button>
    );
}
