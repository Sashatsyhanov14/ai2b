'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n';

export default function ReferralView({ user }: { user: any }) {
    const { t } = useI18n();
    const [stats, setStats] = useState({ invited: 0, leads: 0 });
    const [loading, setLoading] = useState(true);

    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'ai2b_app_bot';
    const refLink = `https://t.me/${botUsername}?start=${user?.telegram_id || ''}`;

    useEffect(() => {
        if (user?.telegram_id) {
            fetchStats();
        }
    }, [user?.telegram_id]);

    const fetchStats = async () => {
        setLoading(true);
        // 1. Count invited users
        const { count: invitedCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', user.telegram_id);

        // 2. Count leads from those users (join or subquery)
        // For simplicity, we'll just show invited for now, but in a real app 
        // we'd track conversions in a separate table or through a join
        setStats({ 
            invited: invitedCount || 0,
            leads: 0 // Will implement lead tracking later
        });
        setLoading(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(refLink);
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.showScanQrPopup) {
            tg.showAlert(t('referral.copied') || 'Link copied!');
        } else {
            alert('Copied!');
        }
    };

    const shareLink = () => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
            const text = t('referral.shareText') || 'Join me in AI2B Real Estate!';
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`);
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-md mx-auto">
            <header className="text-center space-y-2">
                <div className="inline-flex p-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(208,188,255,0.1)]">
                    <span className="material-symbols-outlined text-primary text-[48px] fill-1">celebration</span>
                </div>
                <h1 className="text-3xl font-headline font-extrabold text-white">{t('referral.title') || 'Affiliate Program'}</h1>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">{t('referral.desc') || 'Invite friends and earn rewards for every successful real estate lead.'}</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard 
                    icon="group" 
                    value={stats.invited} 
                    label={t('referral.invited') || 'Invited'} 
                    color="primary" 
                />
                <StatCard 
                    icon="leaderboard" 
                    value={user?.balance || 0} 
                    label={t('referral.balance') || 'Bonus (€)'} 
                    color="secondary" 
                />
            </div>

            {/* Referral Link Card */}
            <div className="glass-card p-6 rounded-3xl bg-[#121214] border border-white/10 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all duration-700" />
                
                <div className="space-y-4 relative">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                        </div>
                        <h3 className="font-bold text-white uppercase tracking-widest text-xs">{t('referral.yourLink') || 'Your Referral Link'}</h3>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-zinc-400 font-mono truncate">
                            {refLink}
                        </div>
                        <button 
                            onClick={copyToClipboard}
                            className="bg-primary/20 text-primary border border-primary/30 p-3 rounded-2xl transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined text-[20px]">content_copy</span>
                        </button>
                    </div>

                    <button 
                        onClick={shareLink}
                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_25px_rgba(208,188,255,0.2)] transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined">share</span>
                        {t('referral.inviteBtn') || 'INVITE FRIENDS'}
                    </button>
                </div>
            </div>

            {/* Info Section */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">{t('referral.howItWorks') || 'How it works'}</h3>
                <div className="space-y-2">
                    <StepItem number="1" text={t('referral.step1') || 'Share your link with potential investors.'} />
                    <StepItem number="2" text={t('referral.step2') || 'They browse the catalog and submit a lead.'} />
                    <StepItem number="3" text={t('referral.step3') || 'You get credited when the lead is verified.'} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, color }: any) {
    const colorClass = color === 'primary' ? 'text-primary' : 'text-secondary';
    const bgClass = color === 'primary' ? 'bg-primary/10' : 'bg-secondary/10';
    
    return (
        <div className="bg-[#121214] p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-1">
            <div className={`${bgClass} p-2 rounded-xl mb-2`}>
                <span className={`material-symbols-outlined ${colorClass} text-[20px]`}>{icon}</span>
            </div>
            <p className="text-2xl font-headline font-bold text-white">{value}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
        </div>
    );
}

function StepItem({ number, text }: any) {
    return (
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-white/5">
                {number}
            </div>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">{text}</p>
        </div>
    );
}
