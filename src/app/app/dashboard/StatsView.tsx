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

        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
        const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('referrer_id', 'is', null);

        setStats({
            totalUsers: userCount || 0,
            totalLeads: leadCount || 0,
            refUsers: refCount || 0,
        });

        // Top referrers
        const { data: allUsers } = await supabase.from('users').select('telegram_id, username, full_name').not('referrer_id', 'is', null);
        if (allUsers) {
            const refCounts: Record<string, { count: number; name: string }> = {};
            // Count referrer_ids from users that have referrer_id set
            const { data: usersWithRef } = await supabase.from('users').select('referrer_id');
            if (usersWithRef) {
                for (const u of usersWithRef) {
                    if (u.referrer_id) {
                        if (!refCounts[u.referrer_id]) refCounts[u.referrer_id] = { count: 0, name: '' };
                        refCounts[u.referrer_id].count++;
                    }
                }
            }
            // Get names for referrers
            const referrerIds = Object.keys(refCounts).map(Number);
            if (referrerIds.length > 0) {
                const { data: referrers } = await supabase.from('users').select('telegram_id, username, full_name').in('telegram_id', referrerIds);
                if (referrers) {
                    for (const r of referrers) {
                        if (refCounts[r.telegram_id]) {
                            refCounts[r.telegram_id].name = r.username || r.full_name || `#${r.telegram_id}`;
                        }
                    }
                }
            }
            const sorted = Object.entries(refCounts)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            setTopReferrers(sorted);
        }

        // Staff list
        if (isAdmin) {
            const { data: staffData } = await supabase.from('users').select('*').in('role', ['founder', 'admin', 'manager']).order('created_at', { ascending: true });
            setStaff(staffData || []);
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
        await supabase.from('users').update({ role: 'client' }).eq('telegram_id', tgId);
        setStatusMsg(t.removeSuccess);
        fetchAll();
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const roleBadge = (role: string) => {
        const map: Record<string, { label: string; color: string }> = {
            founder: { label: t.ownerBadge, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
            admin: { label: t.adminBadge, color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
            manager: { label: t.managerBadge, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
        };
        const b = map[role] || map.manager;
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${b.color}`}>{b.label}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-4">
                <MetricCard icon="group" label={t.totalUsers} value={stats.totalUsers} color="violet" />
                <MetricCard icon="leaderboard" label={t.totalLeads} value={stats.totalLeads} color="emerald" />
                <MetricCard icon="person_add" label={t.refUsers} value={stats.refUsers} color="blue" />
            </div>

            {/* Top Referrers */}
            <div className="bg-[#121214] p-5 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">{t.topReferrers}</h3>
                {topReferrers.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-4">{t.noData}</p>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-b border-white/5 pb-2 px-1">
                            <span>{t.partner}</span>
                            <span>{t.invited}</span>
                        </div>
                        {topReferrers.map((ref, i) => (
                            <div key={ref.id} className="flex justify-between items-center py-2 px-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-zinc-600 w-4">{i + 1}</span>
                                    <span className="text-sm font-medium text-white">@{ref.name}</span>
                                </div>
                                <span className="text-sm font-bold text-violet-400">{ref.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Staff Management (Admin Only) */}
            {isAdmin && (
                <div className="bg-[#121214] p-5 rounded-3xl border border-violet-500/10 space-y-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-violet-400 text-[20px]">manage_accounts</span>
                        {t.manageStaff}
                    </h3>

                    {/* Add Staff Form */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.assignEmployee}</p>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={newStaffId}
                                onChange={(e) => setNewStaffId(e.target.value)}
                                placeholder={t.enterTgId}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                            />
                            <select
                                value={newStaffRole}
                                onChange={(e) => setNewStaffRole(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50 appearance-none"
                            >
                                <option value="manager">{t.selectManager}</option>
                                <option value="admin">{t.selectAdmin}</option>
                            </select>
                            <button
                                onClick={handleAddStaff}
                                className="bg-violet-500/20 text-violet-400 border border-violet-500/30 px-4 rounded-xl font-bold active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                            </button>
                        </div>
                        {statusMsg && (
                            <p className={`text-xs font-bold px-1 ${statusMsg.includes('Ошибка') || statusMsg.includes('Error') || statusMsg.includes('не найден') || statusMsg.includes('not found') ? 'text-red-400' : 'text-emerald-400'}`}>
                                {statusMsg}
                            </p>
                        )}
                    </div>

                    {/* Staff List */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.activeEmployees}</p>
                        {staff.map((s) => (
                            <div key={s.telegram_id} className="flex items-center justify-between bg-white/[0.03] p-3 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                        {(s.username || s.full_name || '?')[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{s.username || s.full_name || `#${s.telegram_id}`}</p>
                                        <p className="text-[10px] text-zinc-600 font-mono">ID: {s.telegram_id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {roleBadge(s.role)}
                                    {s.role !== 'founder' && s.telegram_id !== user?.telegram_id && (
                                        <button
                                            onClick={() => handleRemoveStaff(s.telegram_id)}
                                            className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400/80 hover:text-red-400 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
    const c = colorMap[color] || colorMap.violet;

    return (
        <div className="relative overflow-hidden bg-[#121214] border border-white/5 rounded-3xl p-6 group transition-all hover:border-white/10">
            <div className="absolute top-0 right-0 p-4 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
                <span className="material-symbols-outlined text-[64px]">{icon}</span>
            </div>
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${c}`}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
                </div>
                <h2 className="text-4xl font-extrabold text-white">{value}</h2>
            </div>
        </div>
    );
}
