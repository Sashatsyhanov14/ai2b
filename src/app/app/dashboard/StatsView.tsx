'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Глобальная Статистика',
        totalUsers: 'Всего юзеров',
        totalLeads: 'Активные лиды',
        refUsers: 'Реферальные',
        revenue: 'Выручка',
        topReferrers: 'Топ партнёры',
        partner: 'Партнёр',
        invited: 'Приглашено',
        noData: 'Пока нет данных',
        manageStaff: 'Управление сотрудниками',
        assignEmployee: 'Назначить сотрудника',
        enterTgId: 'Введите Telegram ID',
        activeEmployees: 'Действующие сотрудники',
        addSuccess: 'Успех! Сотрудник добавлен.',
        addError: 'Пользователь не найден в базе! Пусть нажмет /start в боте.',
        removeSuccess: 'Сотрудник удалён.',
        ownerBadge: 'Владелец',
        adminBadge: 'Админ',
        managerBadge: 'Менеджер',
        selectAdmin: 'Админ',
        selectManager: 'Менеджер',
        roleLabel: 'Роль:',
        recentActivity: 'Недавняя активность',
        analyzing: 'Анализ базы...',
    },
    en: {
        title: 'Global Statistics',
        totalUsers: 'Total Users',
        totalLeads: 'Active Leads',
        refUsers: 'Referral Signups',
        revenue: 'Revenue',
        topReferrers: 'Top Referrers',
        partner: 'Partner',
        invited: 'Invited',
        noData: 'No data yet',
        manageStaff: 'Staff Management',
        assignEmployee: 'Assign Employee',
        enterTgId: 'Enter Telegram ID',
        activeEmployees: 'Active Employees',
        addSuccess: 'Success! Employee added.',
        addError: 'User not found! They must press /start in the bot.',
        removeSuccess: 'Employee removed.',
        ownerBadge: 'Owner',
        adminBadge: 'Admin',
        managerBadge: 'Manager',
        selectAdmin: 'Admin',
        selectManager: 'Manager',
        roleLabel: 'Role:',
        recentActivity: 'Recent Activity',
        analyzing: 'Analyzing...',
    },
    tr: {
        title: 'Küresel İstatistikler',
        totalUsers: 'Toplam Kullanıcı',
        totalLeads: 'Aktif Müşteriler',
        refUsers: 'Referans Kayıtları',
        revenue: 'Gelir',
        topReferrers: 'En İyi Referanslar',
        partner: 'Partner',
        invited: 'Davet Edildi',
        noData: 'Henüz veri yok',
        manageStaff: 'Personel Yönetimi',
        assignEmployee: 'Çalışan Ata',
        enterTgId: 'Telegram ID girin',
        activeEmployees: 'Aktif Çalışanlar',
        addSuccess: 'Başarı! Çalışan eklendi.',
        addError: 'Kullanıcı bulunamadı! Botta /start\'a bassın.',
        removeSuccess: 'Çalışan kaldırıldı.',
        ownerBadge: 'Sahip',
        adminBadge: 'Admin',
        managerBadge: 'Yönetici',
        selectAdmin: 'Admin',
        selectManager: 'Yönetici',
        roleLabel: 'Rol:',
        recentActivity: 'Son Aktivite',
        analyzing: 'Analiz ediliyor...',
    },
};

export default function StatsView({ user, lang = 'ru' }: { user?: any; lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [stats, setStats] = useState({ totalUsers: 0, totalLeads: 0, refUsers: 0 });
    const [topReferrers, setTopReferrers] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [newStaffId, setNewStaffId] = useState('');
    const [newStaffRole, setNewStaffRole] = useState('manager');
    const [statusMsg, setStatusMsg] = useState('');
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'founder' || user?.role === 'admin';

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('referrer_id', 'is', null);

            setStats({
                totalUsers: userCount || 0,
                totalLeads: leadCount || 0,
                refUsers: refCount || 0,
            });

            // Top referrers count using a more efficient join-like approach if possible, but here we'll manually aggregate
            const { data: usersWithRef } = await supabase.from('users').select('referrer_id').not('referrer_id', 'is', null);
            if (usersWithRef) {
                const refMap: Record<number, number> = {};
                usersWithRef.forEach(u => {
                    if (u.referrer_id) refMap[u.referrer_id] = (refMap[u.referrer_id] || 0) + 1;
                });

                const sortedIds = Object.entries(refMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const ids = sortedIds.map(s => Number(s[0]));

                if (ids.length > 0) {
                    const { data: referrers } = await supabase.from('users').select('telegram_id, username, full_name').in('telegram_id', ids);
                    if (referrers) {
                        const top = sortedIds.map(([id, count]) => {
                            const r = referrers.find(x => x.telegram_id === Number(id));
                            return {
                                id,
                                count,
                                name: r?.username || r?.full_name || `#${id}`
                            };
                        });
                        setTopReferrers(top);
                    }
                }
            }

            // Staff list
            if (isAdmin) {
                const { data: staffData } = await supabase.from('users').select('*').in('role', ['founder', 'admin', 'manager']).order('created_at', { ascending: true });
                setStaff(staffData || []);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleAddStaff = async () => {
        if (!newStaffId) return;
        const tgId = parseInt(newStaffId);
        const { data: existing } = await supabase.from('users').select('*').eq('telegram_id', tgId).single();
        if (!existing) {
            setStatusMsg(t.addError);
            setTimeout(() => setStatusMsg(''), 3000);
            return;
        }
        await supabase.from('users').update({ role: newStaffRole }).eq('telegram_id', tgId);
        setStatusMsg(t.addSuccess);
        setNewStaffId('');
        fetchAll();
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const handleRemoveStaff = async (tgId: number) => {
        if (!window.confirm("Удалить этого сотрудника из системы?")) return;
        await supabase.from('users').update({ role: 'client' }).eq('telegram_id', tgId);
        setStatusMsg(t.removeSuccess);
        fetchAll();
        setTimeout(() => setStatusMsg(''), 3000);
    };

    return (
        <div className="space-y-6">
            {/* Metric Cards - eSIM Style */}
            <div className="grid grid-cols-2 gap-3">
                <MetricCard icon="group" label={t.totalUsers} value={stats.totalUsers} color="violet" />
                <MetricCard icon="leaderboard" label={t.totalLeads} value={stats.totalLeads} color="emerald" />
                <MetricCard icon="person_add" label={t.refUsers} value={stats.refUsers} color="amber" />
                <MetricCard icon="payments" label={t.revenue} value={'€0.00'} color="blue" />
            </div>

            {loading ? (
                <div className="text-center p-12 animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                    {t.analyzing}
                </div>
            ) : (
                <>
                    {/* Top Referrers */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-amber-400 text-[18px]">workspace_premium</span>
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t.topReferrers}</h3>
                        </div>
                        
                        <div className="glass-card bg-[#121214] border border-white/5 rounded-3xl overflow-hidden">
                            {topReferrers.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 font-bold text-center py-8 uppercase tracking-widest">{t.noData}</p>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {topReferrers.map((ref, i) => (
                                        <div key={ref.id} className="flex justify-between items-center p-4 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-white/5">
                                                    {i + 1}
                                                </div>
                                                <span className="text-sm font-bold text-white">@{ref.name}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-amber-400">{ref.count}</span>
                                                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{t.invited}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Staff Management (Admin Only) */}
                    {isAdmin && (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 px-1 pt-2">
                                <span className="material-symbols-outlined text-violet-400 text-[18px]">engineering</span>
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t.manageStaff}</h3>
                            </div>

                            <div className="glass-card bg-[#121214] border border-violet-500/10 rounded-3xl p-5 space-y-5">
                                {/* Add Staff Form */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                                        <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                                            <span className="material-symbols-outlined text-violet-400">person_add</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">{t.assignEmployee}</p>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.enterTgId}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={newStaffId}
                                            onChange={(e) => setNewStaffId(e.target.value)}
                                            placeholder="Telegram ID"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-violet-500/30 transition-all font-mono"
                                        />
                                        <select
                                            value={newStaffRole}
                                            onChange={(e) => setNewStaffRole(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white font-bold uppercase tracking-wider outline-none focus:border-violet-500/30 appearance-none min-w-[120px] text-center"
                                        >
                                            <option value="manager" className="bg-[#121214]">{t.selectManager}</option>
                                            <option value="admin" className="bg-[#121214]">{t.selectAdmin}</option>
                                        </select>
                                        <button
                                            onClick={handleAddStaff}
                                            className="bg-violet-500 text-black w-14 rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                        >
                                            <span className="material-symbols-outlined font-bold">add</span>
                                        </button>
                                    </div>
                                    {statusMsg && (
                                        <p className={`text-[10px] font-bold uppercase tracking-widest text-center py-2 rounded-xl bg-white/[0.02] ${statusMsg.includes('Ошибка') || statusMsg.includes('Error') || statusMsg.includes('не найден') || statusMsg.includes('not found') ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {statusMsg}
                                        </p>
                                    )}
                                </div>

                                {/* Staff List */}
                                <div className="space-y-3 pt-2">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">{t.activeEmployees}</p>
                                    <div className="space-y-2">
                                        {staff.map((s) => (
                                            <div key={s.telegram_id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                        {(s.username || s.full_name || '?')[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">@{s.username || s.full_name || s.telegram_id}</p>
                                                        <p className="text-[10px] text-zinc-600 font-bold font-mono tracking-tighter">ID: {s.telegram_id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <RoleBadge role={s.role} t={t} />
                                                    {s.role !== 'founder' && s.telegram_id !== user?.telegram_id && (
                                                        <button
                                                            onClick={() => handleRemoveStaff(s.telegram_id)}
                                                            className="w-8 h-8 flex items-center justify-center bg-red-500/10 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all active:scale-90"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

function RoleBadge({ role, t }: { role: string; t: any }) {
    const map: Record<string, { label: string; color: string; icon: string }> = {
        founder: { label: t.ownerBadge, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'shield_person' },
        admin: { label: t.adminBadge, color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: 'manage_accounts' },
        manager: { label: t.managerBadge, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'badge' },
    };
    const b = map[role] || map.manager;
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${b.color} shadow-sm`}>
            <span className="material-symbols-outlined text-[12px]">{b.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{b.label}</span>
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) {
    const colorMap: Record<string, string> = {
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
    const c = colorMap[color] || colorMap.violet;

    return (
        <div className="relative overflow-hidden bg-[#121214] border border-white/5 rounded-3xl p-5 group transition-all hover:border-white/10 shadow-lg active:scale-[0.98]">
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-[40px] opacity-20 ${c.split(' ')[1]}`} />
            <div className="space-y-4 relative">
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-xl border ${c}`}>
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{value}</h2>
            </div>
        </div>
    );
}
<span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
                </div>
                <h2 className="text-4xl font-extrabold text-white">{value}</h2>
            </div>
        </div>
    );
}
