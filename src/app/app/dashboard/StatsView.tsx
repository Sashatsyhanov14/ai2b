'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n';

export default function StatsView() {
    const { t } = useI18n();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalLeads: 0,
        refUsers: 0,
        refLeads: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    const fetchGlobalStats = async () => {
        setLoading(true);
        
        // 1. Total Users
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        // 2. Total Leads
        const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });

        // 3. Referral Users (users with referrer_id)
        const { count: refUserCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('referrer_id', 'is', null);

        setStats({
            totalUsers: userCount || 0,
            totalLeads: leadCount || 0,
            refUsers: refUserCount || 0,
            refLeads: 0 // Need join or extra meta to track leads from referred users
        });
        
        setLoading(false);
    };

    return (
        <div className="p-4 space-y-6">
            <header className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                </div>
                <h1 className="text-xl font-bold text-white uppercase tracking-widest">Global Stats</h1>
            </header>

            <div className="grid grid-cols-1 gap-4">
                <MetricCard 
                    label="Total Community" 
                    value={stats.totalUsers} 
                    icon="group" 
                    trend="+12% this week"
                    color="primary"
                />
                <MetricCard 
                    label="Active Leads" 
                    value={stats.totalLeads} 
                    icon="leaderboard" 
                    trend="+5 today"
                    color="secondary"
                />
                <MetricCard 
                    label="Referral Signups" 
                    value={stats.refUsers} 
                    icon="person_add" 
                    trend="24% of total"
                    color="tertiary"
                />
            </div>

            {/* Referral Performance Table (Placeholder/Simple) */}
            <div className="glass-card p-6 rounded-3xl bg-[#121214] border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Top Referrers</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-xs text-zinc-500 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                        <span>Partner</span>
                        <span>Invited</span>
                    </div>
                    {/* Mock data for now, would be a real query */}
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-white font-medium">@alex_realty</span>
                        <span className="text-sm font-bold text-primary">42</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm text-white font-medium">@dubai_invest</span>
                        <span className="text-sm font-bold text-primary">28</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon, trend, color }: any) {
    const colorClasses: any = {
        primary: 'text-primary bg-primary/10 border-primary/20',
        secondary: 'text-secondary bg-secondary/10 border-secondary/20',
        tertiary: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    };

    return (
        <div className="relative overflow-hidden bg-[#121214] border border-white/5 rounded-3xl p-6 group transition-all hover:border-white/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[64px]">{icon}</span>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${colorClasses[color]}`}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
                </div>
                
                <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-headline font-extrabold text-white">{value}</h2>
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight">{trend}</span>
                </div>
            </div>
        </div>
    );
}
