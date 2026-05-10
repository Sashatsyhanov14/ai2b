'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, any>> = {
    ru: {
        title: 'Панель Управления',
        totalUsers: 'Всего юзеров',
        totalSales: 'Выручка',
        manageManagers: 'Управление Менеджерами',
        assignEmployee: 'Назначить сотрудника',
        enterTgId: 'Введите Telegram ID',
        activeEmployees: 'Действующие сотрудники',
        managerAddError: 'ОШИБКА: Этот пользователь еще ни разу не запускал бота! Пусть нажмет /start в боте.',
        managerAddSuccess: 'Успех! ID {id} теперь {role}.',
        managerRemoveSuccess: 'Сотрудник {id} удален.',
        ownerBadge: 'Владелец',
        adminBadge: 'Админ',
        managerBadge: 'Менеджер',
        selectAdmin: 'Админ',
        selectManager: 'Менеджер',
        roleLabel: 'Роль:',
        balance: 'Баланс',
        tabReferral: 'Бонусы',
        tabCatalog: 'Каталог',
        tabStats: 'Статистика',
        tabLeads: 'Заявки',
        tabUsers: 'Юзеры',
        analyzing: 'Анализ базы...',
        noOrders: 'Нет заявок',
        invitedLabelStats: 'ПРИГЛАШИЛ:',
        purchasesLabel: 'ЗАЯВОК:',
        spentLabel: 'Потратил',
        hideAll: 'Скрыть ⬆',
        showAll: 'Показать все ({count}) ⬇',
        deletedUnit: 'Удаленный объект',
        unknownUser: 'Неизвестный',
        statuses: {
            all: 'ВСЕ',
            new: 'НОВАЯ',
            contacted: 'В РАБОТЕ',
            closed: 'ЗАКРЫТА',
            cancelled: 'ОТМЕНЕНА'
        },
        commissionLabel: 'комиссия',
        notePlaceholder: 'Имя или заметка...',
        refDealsLabel: 'СДЕЛОК ПО РЕФКЕ:',
        ownPurchasesLabel: 'СВОИ ЗАЯВКИ:',
        refVolumeLabel: 'ОБЪ. РЕФЕРАЛОВ',
        commissionLabelAdmin: 'КОМИССИЯ',
        viewRefDealsBtn: 'Смотреть сделки рефералов',
        payoutBtn: 'Выплатить',
        payoutHistoryLabel: 'История выплат:',
        refDealsTitle: 'Сделки рефералов',
        confirmPayout: 'Выплатить {amount}€ пользователю?\nБаланс будет обнулен.',
        loading: 'Загрузка...',
    },
    en: {
        title: 'Admin Panel',
        totalUsers: 'Total Users',
        totalSales: 'Revenue',
        manageManagers: 'Manager Management',
        assignEmployee: 'Assign Employee',
        enterTgId: 'Enter Telegram ID',
        activeEmployees: 'Active Employees',
        managerAddError: 'ERROR: User not found! Tell them to press /start.',
        managerAddSuccess: 'Success! ID {id} is now {role}.',
        managerRemoveSuccess: 'Employee {id} removed.',
        ownerBadge: 'Owner',
        adminBadge: 'Admin',
        managerBadge: 'Manager',
        selectAdmin: 'Admin',
        selectManager: 'Manager',
        roleLabel: 'Role:',
        balance: 'Balance',
        tabLeads: 'Leads',
        tabUsers: 'Users',
        analyzing: 'Analyzing...',
        noOrders: 'No leads',
        invitedLabelStats: 'INVITED:',
        purchasesLabel: 'LEADS:',
        spentLabel: 'Spent',
        hideAll: 'Hide ⬆',
        showAll: 'Show All ({count}) ⬇',
        deletedUnit: 'Deleted Unit',
        unknownUser: 'Unknown',
        statuses: {
            all: 'ALL',
            new: 'NEW',
            contacted: 'IN PROGRESS',
            closed: 'CLOSED',
            cancelled: 'CANCELLED'
        },
        commissionLabel: 'commission',
        notePlaceholder: 'Name or note...',
        refDealsLabel: 'REF DEALS:',
        ownPurchasesLabel: 'OWN LEADS:',
        refVolumeLabel: 'REF VOLUME',
        commissionLabelAdmin: 'COMMISSION',
        viewRefDealsBtn: 'View referral deals',
        payoutBtn: 'Payout',
        payoutHistoryLabel: 'Payout history:',
        refDealsTitle: 'Referral deals',
        confirmPayout: 'Payout {amount}€ to user?\nBalance will be reset.',
        loading: 'Loading...',
    }
};

export default function StatsView({ user, lang = 'ru' }: { user?: any; lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [activeTab, setActiveTab] = useState<'leads' | 'users'>('leads');
    const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);
    const [isUsersExpanded, setIsUsersExpanded] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [usersInfo, setUsersInfo] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [refLeads, setRefLeads] = useState<any[]>([]);
    const [refLeadsLoading, setRefLeadsLoading] = useState(false);

    const [newManagerId, setNewManagerId] = useState('');
    const [newManagerRole, setNewManagerRole] = useState<'manager' | 'admin'>('manager');
    const [managersList, setManagersList] = useState<any[]>([]);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [noteValue, setNoteValue] = useState('');
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

    const [globalStats, setGlobalStats] = useState({ totalUsers: 0, totalSales: 0 });

    const isAdmin = user?.role === 'founder' || user?.role === 'admin';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchManagers = async () => {
        const { data: mUsers } = await supabase.from('users').select('*').in('role', ['manager', 'admin', 'founder']);
        if (mUsers) setManagersList(mUsers);
    };

    const fetchData = async () => {
        setLoading(true);

        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        let { data: leadsData } = await supabase
            .from('leads')
            .select(`*, units(*)`)
            .order('created_at', { ascending: false });

        const { data: allUsers } = await supabase.from('users').select('*');
        const { data: allPayouts } = await supabase.from('chat_history').select('user_id, content, created_at').eq('role', 'assistant').like('content', 'PAYOUT_RECORD:%').order('created_at', { ascending: false });

        if (allUsers && leadsData) {
            const uMap: Record<string, any> = {};
            allUsers.forEach((u: any) => {
                uMap[String(u.telegram_id)] = { ...u, invitedCount: 0, invitedUserIds: [], leadsCount: 0, totalSpend: 0, refLeadsCount: 0, refTotalVolume: 0, earnedBonuses: 0, payouts: [] };
            });

            if (allPayouts) {
                allPayouts.forEach((p: any) => {
                    const pkId = String(p.user_id);
                    if (uMap[pkId]) uMap[pkId].payouts.push(p);
                });
            }

            allUsers.forEach((u: any) => {
                const refId = String(u.referrer_id);
                if (u.referrer_id && uMap[refId]) {
                    uMap[refId].invitedCount++;
                    uMap[refId].invitedUserIds.push(String(u.telegram_id));
                }
            });

            let totalSales = 0;
            leadsData.forEach((l: any) => {
                const uId = String(l.user_id);
                const price = Number(l.units?.price) || 0;

                if (uId && uMap[uId]) {
                    uMap[uId].leadsCount++;
                    
                    if (l.status === 'closed') {
                        totalSales += price;
                        uMap[uId].totalSpend += price;
                    }

                    const refId = String(uMap[uId].referrer_id);
                    if (uMap[uId].referrer_id && uMap[refId]) {
                        uMap[refId].refLeadsCount++;
                        if (l.status === 'closed') {
                            uMap[refId].refTotalVolume += price;
                            uMap[refId].earnedBonuses += (price * 0.025); // 2.5% commission
                        }
                    }
                }
            });

            let sortedUsers = Object.values(uMap)
                .filter((u: any) => u.invitedCount > 0 || u.leadsCount > 0 || (u.balance && u.balance > 0))
                .sort((a: any, b: any) => b.earnedBonuses - a.earnedBonuses);

            const isOnlyManager = user?.role === 'manager';
            const managerId = String(user?.telegram_id);

            if (isOnlyManager) {
                sortedUsers = sortedUsers.filter((u: any) => 
                    String(u.telegram_id) === managerId || 
                    String(u.referrer_id) === managerId
                );
                
                const myUserIds = sortedUsers.map(u => String(u.telegram_id));
                leadsData = leadsData.filter((l: any) => myUserIds.includes(String(l.user_id)));
            }
            
            setGlobalStats({ totalUsers: userCount || 0, totalSales });
            setLeads(leadsData);
            setUsersInfo(sortedUsers);
        }

        await fetchManagers();
        setLoading(false);
    };

    const [isAddingManager, setIsAddingManager] = useState(false);

    const handleAddManager = async () => {
        if (!newManagerId) return alert(lang === 'ru' ? 'Введите ID или @username' : 'Enter ID or @username');
        if (!isAdmin) return;
        
        setIsAddingManager(true);
        try {
            let query = supabase.from('users').select('*');
            const input = newManagerId.trim();
            
            if (/^\d+$/.test(input)) {
                query = query.eq('telegram_id', parseInt(input));
            } else {
                const username = input.startsWith('@') ? input.substring(1) : input;
                query = query.eq('username', username);
            }

            const { data: existingUser, error: findErr } = await query.maybeSingle();
            
            if (findErr) throw findErr;
            if (!existingUser) {
                if (tg?.showAlert) tg.showAlert(t.managerAddError);
                else alert(t.managerAddError);
                return;
            }

            const { error: upErr } = await supabase.from('users').update({ role: newManagerRole }).eq('telegram_id', existingUser.telegram_id);
            
            if (upErr) throw upErr;

            if (tg?.showAlert) tg.showAlert(t.managerAddSuccess.replace('{id}', input).replace('{role}', newManagerRole));
            else alert(t.managerAddSuccess.replace('{id}', input).replace('{role}', newManagerRole));
            
            fetchManagers();
            setNewManagerId('');
        } catch (err: any) {
            console.error('Add Manager Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsAddingManager(false);
        }
    };

    const handleRemoveManager = async (tgId: number) => {
        if (!window.confirm("Удалить сотрудника?")) return;
        const { error } = await supabase.from('users').update({ role: 'client' }).eq('telegram_id', tgId);
        if (!error) {
            fetchManagers();
        }
    };

    const handleUpdateRole = async (tgId: number, newRole: 'manager' | 'admin') => {
        const { error } = await supabase.from('users').update({ role: newRole }).eq('telegram_id', tgId);
        if (!error) fetchManagers();
    };

    const handleMarkPaid = async (tgId: number, currentBalance: number) => {
        if (!window.confirm(t.confirmPayout.replace('{amount}', currentBalance.toFixed(2)))) return;
        
        await supabase.from('chat_history').insert({
            user_id: tgId,
            role: 'assistant',
            content: `PAYOUT_RECORD:${currentBalance.toFixed(2)}`,
            created_at: new Date().toISOString()
        });

        const { error: upErr } = await supabase.from('users').update({ balance: 0 }).eq('telegram_id', tgId);
        
        if (upErr) {
            if (tg?.showAlert) tg.showAlert("Error: " + upErr.message);
            else alert("Error: " + upErr.message);
        } else {
            if (tg?.showAlert) tg.showAlert('Success!');
            else alert('Success!');
            fetchData();
        }
    };

    const handleSaveNote = async (tgId: number) => {
        const { error } = await supabase.from('users').update({ custom_note: noteValue }).eq('telegram_id', tgId);
        if (!error) {
            setUsersInfo(prev => prev.map(u => u.telegram_id === tgId ? { ...u, custom_note: noteValue } : u));
            fetchManagers();
            setEditingNoteId(null);
        }
    };

    const filteredLeads = leads.filter((l: any) => statusFilter === 'all' || l.status === statusFilter);

    const openRefDrilldown = async (user: any) => {
        setSelectedUser(user);
        if (!user.invitedUserIds || user.invitedUserIds.length === 0) {
            setRefLeads([]);
            return;
        }
        setRefLeadsLoading(true);
        const { data } = await supabase
            .from('leads')
            .select(`*, units(*)`)
            .in('user_id', user.invitedUserIds)
            .order('created_at', { ascending: false });
        setRefLeads(data || []);
        setRefLeadsLoading(false);
    };

    const closeRefDrilldown = () => {
        setSelectedUser(null);
        setRefLeads([]);
    };

    return (
        <div className="space-y-6 pb-24">
            {isAdmin && (
            <section className="space-y-4 mb-2 border-b border-white/5 pb-6">
                <h3 className="text-lg font-headline font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">engineering</span>
                    {t.manageManagers}
                </h3>
                <div className="glass-card p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/10">
                            <span className="material-symbols-outlined text-tertiary">person_add</span>
                        </div>
                        <div>
                            <p className="font-headline font-semibold text-on-surface text-sm">{t.assignEmployee}</p>
                            <p className="text-xs text-on-surface-variant">{t.enterTgId}</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newManagerId}
                                onChange={(e) => setNewManagerId(e.target.value)}
                                className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 min-h-[42px] text-sm text-on-surface focus:outline-none focus:border-primary/50"
                                placeholder="12345678"
                            />
                            <button 
                                onClick={handleAddManager} 
                                disabled={isAddingManager || !newManagerId}
                                className="whitespace-nowrap bg-primary/20 text-primary border border-primary/30 w-[42px] h-[42px] min-w-[42px] flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(208,188,255,0.1)] hover:bg-primary/30 transition-all active:scale-95 disabled:opacity-30"
                            >
                                {isAddingManager ? (
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined font-bold text-xl">add</span>
                                )}
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-surface-container-lowest/50 p-2 px-3 rounded-lg border border-outline-variant/10">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{t.roleLabel}</span>
                            <div className="flex gap-2 flex-1">
                                <button 
                                    onClick={() => setNewManagerRole('manager')}
                                    className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${newManagerRole === 'manager' ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-surface-container-high text-on-surface-variant'}`}
                                >
                                    {t.selectManager}
                                </button>
                                <button 
                                    onClick={() => setNewManagerRole('admin')}
                                    className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${newManagerRole === 'admin' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-on-surface-variant'}`}
                                >
                                    {t.selectAdmin}
                                </button>
                            </div>
                        </div>
                    </div>

                    {managersList.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-outline-variant/10 space-y-2">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t.activeEmployees}</p>
                            {managersList.map((m) => (
                                <div key={m.telegram_id} className="flex flex-col bg-surface-container-lowest p-2 px-3 rounded-lg border border-outline-variant/10 gap-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-tertiary">
                                                {m.role === 'founder' ? 'shield_person' : (m.role === 'admin' ? 'manage_accounts' : 'badge')}
                                            </span>
                                            <span className="text-sm text-on-surface font-medium truncate max-w-[120px]">@{m.username || String(m.telegram_id)}</span>
                                            {m.role === 'founder' ? (
                                                <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm font-bold bg-primary/20 text-primary">
                                                    {t.ownerBadge}
                                                </span>
                                            ) : (
                                                <div className="flex bg-surface-container-high p-0.5 rounded border border-outline-variant/10">
                                                    <button 
                                                        onClick={() => handleUpdateRole(m.telegram_id, 'manager')}
                                                        className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase transition-all ${m.role === 'manager' ? 'bg-tertiary/20 text-tertiary' : 'text-on-surface-variant hover:text-on-surface'}`}
                                                    >
                                                        M
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateRole(m.telegram_id, 'admin')}
                                                        className={`px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase transition-all ${m.role === 'admin' ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                                                    >
                                                        A
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {m.role !== 'founder' && (
                                            <button onClick={() => handleRemoveManager(m.telegram_id)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-md transition-colors active:scale-95 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                            </button>
                                        )}
                                    </div>

                                    {editingNoteId === m.telegram_id ? (
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={noteValue}
                                                onChange={(e) => setNoteValue(e.target.value)}
                                                className="flex-1 bg-surface-container-high border border-outline-variant/20 rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
                                                placeholder="Имя менеджера..."
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveNote(m.telegram_id)} className="bg-primary/20 text-primary p-1 rounded">
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                            </button>
                                            <button onClick={() => setEditingNoteId(null)} className="bg-red-400/20 text-red-400 p-1 rounded">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        m.custom_note && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                                    {m.custom_note}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        setEditingNoteId(m.telegram_id);
                                                        setNoteValue(m.custom_note || '');
                                                    }}
                                                    className="text-on-surface-variant hover:text-primary transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                                </button>
                                            </div>
                                        ) || (
                                            <button 
                                                onClick={() => {
                                                    setEditingNoteId(m.telegram_id);
                                                    setNoteValue('');
                                                }}
                                                className="text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">add_notes</span>
                                                Добавить заметку
                                            </button>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            )}

            <section className="grid grid-cols-2 gap-3">
                <div className="bg-[#201f22] p-4 rounded-xl flex flex-col justify-between min-h-[100px] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary/10 p-1.5 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                        </div>
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">{t.totalUsers}</p>
                    </div>
                    <span className="text-3xl font-headline font-extrabold text-on-surface">{globalStats.totalUsers}</span>
                </div>

                <div className="bg-[#201f22] p-4 rounded-xl flex flex-col justify-between min-h-[100px] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-secondary/10 p-1.5 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
                        </div>
                        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">{t.totalSales}</p>
                    </div>
                    <span className="text-2xl font-headline font-extrabold text-on-surface">€{globalStats.totalSales.toLocaleString()}</span>
                </div>
            </section>

            <div className="flex gap-2 p-1 bg-surface-container-lowest rounded-xl">
                <button onClick={() => setActiveTab('leads')} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'leads' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.tabLeads}</button>
                <button onClick={() => setActiveTab('users')} className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}>{t.tabUsers}</button>
            </div>

            {loading ? (
                <div className="text-center p-4 animate-pulse text-on-surface-variant">{t.analyzing}</div>
            ) : activeTab === 'leads' ? (
                <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 clean-scrollbar">
                        {['all', 'new', 'contacted', 'closed', 'cancelled'].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap transition-all ${statusFilter === st ? 'bg-secondary text-on-secondary shadow-md' : 'bg-surface-container-low text-on-surface-variant border border-white/5'}`}
                            >
                                {t.statuses ? (t.statuses[st] || st.toUpperCase()) : st.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        {filteredLeads.length === 0 ? <div className="text-sm text-center text-on-surface-variant mt-4">{t.noOrders}</div> : null}
                        {filteredLeads.slice(0, isOrdersExpanded ? undefined : 6).map((l: any) => {
                            return (
                                <div key={l.id} className="glass-card p-4 rounded-xl relative border-l-4 border-l-primary/30 text-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-on-surface flex items-center gap-2">
                                            {l.name} {l.phone && <span className="text-[10px] text-primary">| {l.phone}</span>}
                                        </div>
                                        <b className="text-green-400">€{(Number(l.units?.price) || 0).toLocaleString()}</b>
                                    </div>

                                    <div className="text-on-surface-variant text-xs space-y-1.5 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">home</span>
                                            <span>
                                                {l.units ? (l.units.title?.ru || l.units.title) : t.deletedUnit}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                            <span>{new Date(l.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-outline-variant/10">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                            l.status === 'closed' ? 'bg-green-500/20 text-green-400' : 
                                            l.status === 'new' ? 'bg-blue-500/20 text-blue-400' : 
                                            l.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 
                                            'bg-orange-500/20 text-orange-400'
                                        }`}>
                                            {t.statuses ? (t.statuses[l.status] || l.status) : l.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredLeads.length > 6 && (
                            <button
                                onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                                className="w-full py-3 mt-1 bg-surface-container-high hover:bg-surface-container-highest rounded-xl text-primary text-sm font-bold active:scale-95 transition-all text-center border border-white/5"
                            >
                                {isOrdersExpanded ? t.hideAll : t.showAll.replace('{count}', filteredLeads.length)}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                {usersInfo.slice(0, isUsersExpanded ? undefined : 6).map(u => (
                        <div key={u.telegram_id} className="glass-card p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-headline font-semibold text-on-surface text-sm">@{u.username || u.telegram_id}</p>
                                        {u.custom_note && (
                                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                                {u.custom_note}
                                            </span>
                                        )}
                                        {editingNoteId !== u.telegram_id && (
                                            <button 
                                                onClick={() => {
                                                    setEditingNoteId(u.telegram_id);
                                                    setNoteValue(u.custom_note || '');
                                                }}
                                                className="text-on-surface-variant hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                            </button>
                                        )}
                                    </div>
                                    {editingNoteId === u.telegram_id && (
                                        <div className="flex gap-2 mt-2">
                                            <input 
                                                type="text"
                                                value={noteValue}
                                                onChange={(e) => setNoteValue(e.target.value)}
                                                className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
                                                placeholder={t.notePlaceholder}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveNote(u.telegram_id)} className="bg-primary/20 text-primary p-1 rounded">
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                            </button>
                                            <button onClick={() => setEditingNoteId(null)} className="bg-red-400/20 text-red-400 p-1 rounded">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                    <div className="text-[10px] text-on-surface-variant uppercase mt-1 flex flex-col gap-1">
                                        <div className="flex gap-3">
                                            <span>{t.invitedLabelStats} <b className="text-primary">{u.invitedCount}</b></span>
                                            <span>{t.refDealsLabel} <b className="text-secondary">{u.refLeadsCount}</b></span>
                                        </div>
                                        <div className="flex gap-3 mt-1 pt-1 border-t border-white/5">
                                            <span>{t.ownPurchasesLabel} <b className="text-on-surface">{u.leadsCount}</b></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end pl-2 gap-2">
                                    <div>
                                        <p className="text-[10px] text-on-surface-variant uppercase">{t.refVolumeLabel}</p>
                                        <p className="font-headline font-bold text-blue-400 mt-[-2px]">€{(u.refTotalVolume || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-on-surface-variant uppercase">{t.commissionLabelAdmin}</p>
                                        <p className="font-headline font-bold text-green-400 mt-[-2px]">€{u.earnedBonuses.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {u.invitedCount > 0 && (
                                <button
                                    onClick={() => openRefDrilldown(u)}
                                    className="w-full py-2 text-[11px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 rounded-lg flex items-center justify-center gap-1.5 hover:bg-secondary/20 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    {t.viewRefDealsBtn}
                                </button>
                            )}

                            {/* Payouts Section */}
                            <div className="bg-surface-container-low rounded-lg p-3 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px] text-tertiary">account_balance_wallet</span>
                                        <span className="text-xs font-bold text-on-surface uppercase tracking-widest">{t.balance}: <span className="text-tertiary">€{(u.balance || 0).toLocaleString()}</span></span>
                                    </div>
                                    {(u.balance || 0) > 0 && isAdmin && (
                                        <button onClick={() => handleMarkPaid(u.telegram_id, u.balance)} className="bg-tertiary/20 text-tertiary border border-tertiary/30 px-3 py-1 text-[10px] rounded-md font-bold uppercase tracking-wider hover:bg-tertiary/30 active:scale-95 transition-all">
                                            {t.payoutBtn}
                                        </button>
                                    )}
                                </div>
                                
                                {u.payouts && u.payouts.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-outline-variant/10">
                                        <p className="text-[9px] text-on-surface-variant font-bold uppercase mb-1">{t.payoutHistoryLabel}</p>
                                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto clean-scrollbar pr-1">
                                            {u.payouts.map((p: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-[10px] items-center bg-surface-container-lowest px-2 py-1 rounded">
                                                    <span className="text-on-surface-variant">{new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span className="font-bold text-red-400">-€{Number(p.content.split(':')[1]).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {usersInfo.length > 6 && (
                        <button
                            onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                            className="w-full py-3 mt-1 bg-surface-container-high hover:bg-surface-container-highest rounded-xl text-primary text-sm font-bold active:scale-95 transition-all text-center border border-white/5"
                        >
                            {isUsersExpanded ? t.hideAll : t.showAll.replace('{count}', usersInfo.length)}
                        </button>
                    )}
                </div>
            )}

        {/* Referral Drilldown Modal */}
        {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeRefDrilldown}>
                <div className="bg-[#1a1a1f] w-full max-w-lg h-[96vh] rounded-2xl p-4 overflow-y-auto flex flex-col gap-3 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <div>
                            <p className="font-headline font-bold text-on-surface text-base">
                                🔗 {t.refDealsTitle} @{selectedUser.username || selectedUser.telegram_id}
                            </p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                                Приглашено: <b className="text-primary">{selectedUser.invitedCount}</b>
                                &nbsp;·&nbsp; Сделок: <b className="text-secondary">{selectedUser.refLeadsCount}</b>
                                &nbsp;·&nbsp; Объём: <b className="text-green-400">€{(selectedUser.refTotalVolume || 0).toLocaleString()}</b>
                            </p>
                        </div>
                        <button onClick={closeRefDrilldown} className="text-on-surface-variant hover:text-on-surface p-1">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {refLeadsLoading ? (
                        <div className="text-center text-on-surface-variant text-sm py-4 animate-pulse">{t.loading}</div>
                    ) : refLeads.length === 0 ? (
                        <div className="text-center text-on-surface-variant text-sm py-4">{t.noOrders}</div>
                    ) : refLeads.map((l: any) => {
                        return (
                            <div key={l.id} className="glass-card p-3 rounded-xl border-l-4 border-l-secondary/30 text-sm">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-on-surface">{l.name}</span>
                                    <div className="text-right">
                                        <b className="text-green-400">€{(l.units?.price || 0).toLocaleString()}</b>
                                        <p className="text-[10px] text-yellow-400 font-bold">+€{(Number(l.units?.price) * 0.025).toLocaleString()} {t.commissionLabel}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-on-surface-variant space-y-0.5">
                                    <div>{l.units?.title?.ru || l.units?.title || '—'}</div>
                                    <div className="flex justify-between items-center">
                                        <span>{new Date(l.created_at).toLocaleString()}</span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                            l.status === 'closed' ? 'bg-green-500/20 text-green-400' :
                                            l.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>{t.statuses ? (t.statuses[l.status] || l.status) : l.status}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
        </div>
    );
}
