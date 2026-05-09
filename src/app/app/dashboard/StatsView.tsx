'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, any>> = {
    ru: {
        title: 'Глобальная Статистика',
        totalUsers: 'Всего юзеров',
        totalLeads: 'Всего заявок',
        refUsers: 'Реферальные',
        revenue: 'Оборот (закрыто)',
        topReferrers: 'Топ партнёры',
        partner: 'Партнёр',
        invited: 'Приглашено',
        noData: 'Пока нет данных',
        manageStaff: 'Управление сотрудниками',
        assignEmployee: 'Назначить сотрудника',
        enterTgId: 'Введите Telegram ID или @username',
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
        tabLeads: 'Заявки',
        tabUsers: 'Партнёры',
        noLeads: 'Заявок пока нет',
        unknownUser: 'Аноним',
        deletedUnit: 'Удаленный объект',
        showAll: 'Показать все ({count})',
        hideAll: 'Скрыть',
        invitedLabelStats: 'ПРИГЛАШЕНО:',
        refDealsLabel: 'СДЕЛОК РЕФ:',
        ownPurchasesLabel: 'ЛИЧНЫХ ЗАЯВОК:',
        refVolumeLabel: 'ОБЪЁМ РЕФ',
        commissionLabelAdmin: 'КОМИССИЯ',
        viewRefDealsBtn: 'Посмотреть сделки рефералов',
        refDealsTitle: 'Сделки рефералов',
        loading: 'Загрузка...',
        statuses: {
            new: 'Новая',
            contacted: 'В работе',
            closed: 'Закрыта',
            cancelled: 'Отмена'
        },
        balance: 'Баланс',
        payoutBtn: 'Выплатить',
        confirmPayout: 'Выплатить ${amount} пользователю?',
        notePlaceholder: 'Заметка или имя...',
    },
    en: {
        title: 'Global Statistics',
        totalUsers: 'Total Users',
        totalLeads: 'Total Leads',
        refUsers: 'Referral Signups',
        revenue: 'Revenue (Closed)',
        topReferrers: 'Top Referrers',
        partner: 'Partner',
        invited: 'Invited',
        noData: 'No data yet',
        manageStaff: 'Staff Management',
        assignEmployee: 'Assign Employee',
        enterTgId: 'Enter Telegram ID or @username',
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
        tabLeads: 'Leads',
        tabUsers: 'Partners',
        noLeads: 'No leads yet',
        unknownUser: 'Unknown',
        deletedUnit: 'Deleted Unit',
        showAll: 'Show all ({count})',
        hideAll: 'Hide',
        invitedLabelStats: 'INVITED:',
        refDealsLabel: 'REF LEADS:',
        ownPurchasesLabel: 'OWN LEADS:',
        refVolumeLabel: 'REF VOLUME',
        commissionLabelAdmin: 'COMMISSION',
        viewRefDealsBtn: 'View referral leads',
        refDealsTitle: 'Referral Leads',
        loading: 'Loading...',
        statuses: {
            new: 'New',
            contacted: 'In Progress',
            closed: 'Closed',
            cancelled: 'Cancelled'
        },
        balance: 'Balance',
        payoutBtn: 'Payout',
        confirmPayout: 'Payout ${amount} to user?',
        notePlaceholder: 'Note or name...',
    }
};

export default function StatsView({ user, lang = 'ru' }: { user?: any; lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [isUsersExpanded, setIsUsersExpanded] = useState(false);
    
    const [stats, setStats] = useState({ totalUsers: 0, totalLeads: 0, refUsers: 0, revenue: 0 });
    const [leads, setLeads] = useState<any[]>([]);
    const [usersInfo, setUsersInfo] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [topReferrers, setTopReferrers] = useState<any[]>([]);
    
    const [newStaffId, setNewStaffId] = useState('');
    const [newStaffRole, setNewStaffRole] = useState('manager');
    const [statusMsg, setStatusMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [refLeads, setRefLeads] = useState<any[]>([]);
    const [refLeadsLoading, setRefLeadsLoading] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | number | null>(null);
    const [noteValue, setNoteValue] = useState('');

    const isAdmin = user?.role === 'founder' || user?.role === 'admin';

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch basic stats
            const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('referrer_id', 'is', null);

            // Fetch leads for revenue calculation
            const { data: leadsData } = await supabase
                .from('leads')
                .select('*, units(*)')
                .order('created_at', { ascending: false });

            // Fetch all users for partner stats
            const { data: allUsers } = await supabase.from('users').select('*');

            if (allUsers && leadsData) {
                const uMap: Record<string, any> = {};
                allUsers.forEach((u: any) => {
                    uMap[String(u.telegram_id)] = { 
                        ...u, 
                        invitedCount: 0, 
                        invitedUserIds: [], 
                        leadsCount: 0, 
                        refLeadsCount: 0, 
                        refTotalVolume: 0, 
                        earnedBonuses: 0 
                    };
                });

                // Calculate invited counts
                allUsers.forEach((u: any) => {
                    if (u.referrer_id && uMap[String(u.referrer_id)]) {
                        uMap[String(u.referrer_id)].invitedCount++;
                        uMap[String(u.referrer_id)].invitedUserIds.push(String(u.telegram_id));
                    }
                });

                // Calculate lead stats per user
                let totalRevenue = 0;
                leadsData.forEach((l: any) => {
                    const uId = String(l.user_id);
                    const unitPrice = Number(l.units?.price) || 0;

                    if (uId && uMap[uId]) {
                        uMap[uId].leadsCount++;
                        
                        if (l.status === 'closed') {
                            totalRevenue += unitPrice;
                        }

                        // Referral bonus logic (if user has a referrer)
                        const refId = String(uMap[uId].referrer_id);
                        if (uMap[uId].referrer_id && uMap[refId]) {
                            uMap[refId].refLeadsCount++;
                            if (l.status === 'closed') {
                                uMap[refId].refTotalVolume += unitPrice;
                                uMap[refId].earnedBonuses += (unitPrice * 0.025);
                            }
                        }
                    }
                });

                setStats({
                    totalUsers: userCount || 0,
                    totalLeads: leadCount || 0,
                    refUsers: refCount || 0,
                    revenue: totalRevenue
                });

                setLeads(leadsData);
                
                const sortedUsers = Object.values(uMap)
                    .filter((u: any) => u.invitedCount > 0 || u.leadsCount > 0 || (u.balance && u.balance > 0))
                    .sort((a: any, b: any) => b.invitedCount - a.invitedCount);
                
                setUsersInfo(sortedUsers);

                setTopReferrers(sortedUsers.slice(0, 5).map(u => ({
                    id: u.telegram_id,
                    name: u.username || u.full_name || `#${u.telegram_id}`,
                    count: u.invitedCount
                })));
            }

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
        const input = newStaffId.trim();
        let query = supabase.from('users').select('*');
        
        if (/^\d+$/.test(input)) {
            query = query.eq('telegram_id', parseInt(input));
        } else {
            const username = input.startsWith('@') ? input.substring(1) : input;
            query = query.eq('username', username);
        }

        const { data: existing } = await query.single();
        if (!existing) {
            setStatusMsg(t.addError);
            setTimeout(() => setStatusMsg(''), 3000);
            return;
        }

        await supabase.from('users').update({ role: newStaffRole }).eq('telegram_id', existing.telegram_id);
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

    const handleSaveNote = async (tgId: number) => {
        const { error } = await supabase.from('users').update({ custom_note: noteValue }).eq('telegram_id', tgId);
        if (!error) {
            setUsersInfo(prev => prev.map(u => u.telegram_id === tgId ? { ...u, custom_note: noteValue } : u));
            setEditingNoteId(null);
        }
    };

    const handlePayout = async (tgId: number, amount: number) => {
        if (!window.confirm(t.confirmPayout.replace('${amount}', amount.toFixed(2)))) return;
        const { error } = await supabase.from('users').update({ balance: 0 }).eq('telegram_id', tgId);
        if (!error) {
            fetchAll();
        }
    };

    const openRefDrilldown = async (user: any) => {
        setSelectedUser(user);
        if (!user.invitedUserIds || user.invitedUserIds.length === 0) {
            setRefLeads([]);
            return;
        }
        setRefLeadsLoading(true);
        const { data } = await supabase
            .from('leads')
            .select('*, units(*), users(telegram_id, username, full_name)')
            .in('user_id', user.invitedUserIds)
            .order('created_at', { ascending: false });
        setRefLeads(data || []);
        setRefLeadsLoading(false);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
                <MetricCard icon="group" label={t.totalUsers} value={stats.totalUsers} color="violet" />
                <MetricCard icon="leaderboard" label={t.totalLeads} value={stats.totalLeads} color="emerald" />
                <MetricCard icon="person_add" label={t.refUsers} value={stats.refUsers} color="amber" />
                <MetricCard icon="payments" label={t.revenue} value={`€${stats.revenue.toLocaleString()}`} color="blue" />
            </div>

            {loading ? (
                <div className="text-center p-12 animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                    {t.analyzing}
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-violet-400 text-[18px]">group</span>
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t.tabUsers}</h3>
                        </div>

                        {usersInfo.slice(0, isUsersExpanded ? undefined : 6).map((u: any) => (
                            <div key={u.telegram_id} className="glass-card bg-[#121214] border border-white/5 rounded-3xl p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-500 border border-white/5">
                                            {(u.username || u.full_name || '?')[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white">@{u.username || u.full_name || u.telegram_id}</p>
                                                {u.custom_note && <span className="text-[8px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold border border-violet-500/20 uppercase tracking-widest">{u.custom_note}</span>}
                                            </div>
                                            <p className="text-[10px] text-zinc-600 font-bold font-mono">ID: {u.telegram_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{t.commissionLabelAdmin}</p>
                                        <p className="text-sm font-black text-emerald-400">€{(u.earnedBonuses || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                                    <div>{t.invitedLabelStats} <span className="text-white">{u.invitedCount}</span></div>
                                    <div>{t.refDealsLabel} <span className="text-white">{u.refLeadsCount}</span></div>
                                </div>

                                <div className="flex gap-2">
                                    {u.invitedCount > 0 && (
                                        <button 
                                            onClick={() => openRefDrilldown(u)}
                                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-2 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                                            {t.viewRefDealsBtn}
                                        </button>
                                    )}
                                    {u.balance > 0 && (
                                        <button 
                                            onClick={() => handlePayout(u.telegram_id, u.balance)}
                                            className="flex-1 py-2.5 bg-emerald-500 text-black rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">payments</span>
                                            {t.payoutBtn} (€{u.balance})
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            setEditingNoteId(u.telegram_id);
                                            setNoteValue(u.custom_note || '');
                                        }}
                                        className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-zinc-500 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    </button>
                                </div>

                                {editingNoteId === u.telegram_id && (
                                    <div className="flex gap-2 pt-2">
                                        <input 
                                            type="text" 
                                            value={noteValue} 
                                            onChange={(e) => setNoteValue(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-violet-500/30"
                                            placeholder={t.notePlaceholder}
                                        />
                                        <button onClick={() => handleSaveNote(u.telegram_id)} className="bg-violet-500 text-black px-4 rounded-xl text-[10px] font-bold uppercase">OK</button>
                                        <button onClick={() => setEditingNoteId(null)} className="bg-white/10 text-white px-4 rounded-xl text-[10px] font-bold uppercase">X</button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {usersInfo.length > 6 && (
                            <button 
                                onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-all"
                            >
                                {isUsersExpanded ? t.hideAll : t.showAll.replace('{count}', usersInfo.length)}
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <section className="space-y-4 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 px-1">
                                <span className="material-symbols-outlined text-violet-400 text-[18px]">engineering</span>
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t.manageStaff}</h3>
                            </div>

                            <div className="glass-card bg-[#121214] border border-violet-500/10 rounded-3xl p-5 space-y-5">
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
                                            type="text"
                                            value={newStaffId}
                                            onChange={(e) => setNewStaffId(e.target.value)}
                                            placeholder="ID / @username"
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

                                <div className="space-y-3 pt-2">
                                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">{t.activeEmployees}</p>
                                    <div className="space-y-2">
                                        {staff.map((s) => (
                                            <div key={s.telegram_id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-500">
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

            {/* Referral Drilldown Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setSelectedUser(null)}>
                    <div className="bg-[#0f0f11] w-full max-w-lg h-[80vh] rounded-[2.5rem] p-6 overflow-hidden flex flex-col gap-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">🔗 {t.refDealsTitle}</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">@{selectedUser.username || selectedUser.telegram_id}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto clean-scrollbar space-y-3 pr-1">
                            {refLeadsLoading ? (
                                <div className="text-center py-20 animate-pulse text-zinc-500 font-bold uppercase tracking-widest text-[10px]">{t.loading}</div>
                            ) : refLeads.length === 0 ? (
                                <div className="text-center py-20 text-zinc-600 font-bold uppercase tracking-widest text-[10px]">{t.noLeads}</div>
                            ) : refLeads.map((l: any) => (
                                <div key={l.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-white">@{l.users?.username || l.users?.full_name || t.unknownUser}</p>
                                        <b className="text-emerald-400 text-xs">€{(l.units?.price || 0).toLocaleString()}</b>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">{l.units?.title?.ru || l.units?.title || t.deletedUnit}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${l.status === 'closed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-500 border-white/5'}`}>
                                            {t.statuses[l.status] || l.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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


