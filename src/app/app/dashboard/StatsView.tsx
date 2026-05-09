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
    },
    tr: {
        title: 'Küresel İstatistikler',
        totalUsers: 'Toplam Kullanıcı',
        totalLeads: 'Toplam Başvuru',
        refUsers: 'Referans Kayıtları',
        revenue: 'Ciro (Kapalı)',
        topReferrers: 'En İyi Ortaklar',
        partner: 'Ortak',
        invited: 'Davet Edildi',
        noData: 'Henüz veri yok',
        manageStaff: 'Personel Yönetimi',
        assignEmployee: 'Personel Ata',
        enterTgId: 'Telegram ID veya @kullanıcıadı girin',
        activeEmployees: 'Aktif Personel',
        addSuccess: 'Başarılı! Personel eklendi.',
        addError: 'Kullanıcı bulunamadı! Botta /start tuшuna basmalı.',
        removeSuccess: 'Personel kaldırıldı.',
        ownerBadge: 'Sahibi',
        adminBadge: 'Admin',
        managerBadge: 'Menajer',
        selectAdmin: 'Admin',
        selectManager: 'Menajer',
        roleLabel: 'Rol:',
        recentActivity: 'Son Etkinlik',
        analyzing: 'Analiz ediliyor...',
        tabLeads: 'Başvurular',
        tabUsers: 'Ortaklar',
        noLeads: 'Henüz başvuru yok',
        unknownUser: 'Anonim',
        deletedUnit: 'Silinmiş Mülk',
        showAll: 'Hepsini göster ({count})',
        hideAll: 'Gizle',
        invitedLabelStats: 'DAVET:',
        refDealsLabel: 'REF BAŞVURU:',
        ownPurchasesLabel: 'KİŞİSEL:',
        refVolumeLabel: 'REF HACİM',
        commissionLabelAdmin: 'KOMİSYON',
        viewRefDealsBtn: 'Referans başvurularını gör',
        refDealsTitle: 'Referans Başvuruları',
        loading: 'Yükleniyor...',
        statuses: {
            new: 'Yeni',
            contacted: 'İşlemde',
            closed: 'Kapandı',
            cancelled: 'İptal'
        },
        balance: 'Bakiye',
        payoutBtn: 'Ödeme Yap',
        confirmPayout: 'Kullanıcıya ${amount} ödensin mi?',
        notePlaceholder: 'Not veya isim...',
    },
    de: {
        title: 'Globale Statistiken',
        totalUsers: 'Gesamtbenutzer',
        totalLeads: 'Gesamtanfragen',
        refUsers: 'Empfehlungen',
        revenue: 'Umsatz (Abgeschlossen)',
        topReferrers: 'Top-Partner',
        partner: 'Partner',
        invited: 'Eingeladen',
        noData: 'Noch keine Daten',
        manageStaff: 'Personalverwaltung',
        assignEmployee: 'Mitarbeiter zuweisen',
        enterTgId: 'Telegram ID oder @username eingeben',
        activeEmployees: 'Aktive Mitarbeiter',
        addSuccess: 'Erfolg! Mitarbeiter hinzugefügt.',
        addError: 'Benutzer nicht gefunden! Er muss /start im Bot drücken.',
        removeSuccess: 'Mitarbeiter entfernt.',
        ownerBadge: 'Besitzer',
        adminBadge: 'Admin',
        managerBadge: 'Manager',
        selectAdmin: 'Admin',
        selectManager: 'Manager',
        roleLabel: 'Rolle:',
        recentActivity: 'Letzte Aktivitäten',
        analyzing: 'Analysiere...',
        tabLeads: 'Anfragen',
        tabUsers: 'Partner',
        noLeads: 'Noch keine Anfragen',
        unknownUser: 'Anonym',
        deletedUnit: 'Gelöschtes Objekt',
        showAll: 'Alle anzeigen ({count})',
        hideAll: 'Ausblenden',
        invitedLabelStats: 'EINGELADEN:',
        refDealsLabel: 'REF ANFRAGEN:',
        ownPurchasesLabel: 'EIGENE ANFRAGEN:',
        refVolumeLabel: 'REF VOLUMEN',
        commissionLabelAdmin: 'PROVISION',
        viewRefDealsBtn: 'Empfehlungsanfragen ansehen',
        refDealsTitle: 'Empfehlungsanfragen',
        loading: 'Lade...',
        statuses: {
            new: 'Neu',
            contacted: 'In Bearbeitung',
            closed: 'Abgeschlossen',
            cancelled: 'Storniert'
        },
        balance: 'Guthaben',
        payoutBtn: 'Auszahlen',
        confirmPayout: 'Soll ${amount} an den Benutzer ausgezahlt werden?',
        notePlaceholder: 'Notiz oder Name...',
    },
    es: {
        title: 'Estadísticas Globales',
        totalUsers: 'Total Usuarios',
        totalLeads: 'Total Clientes',
        refUsers: 'Registros por Referido',
        revenue: 'Ingresos (Cerrados)',
        topReferrers: 'Top Referidores',
        partner: 'Socio',
        invited: 'Invitados',
        noData: 'Sin datos aún',
        manageStaff: 'Gestión de Personal',
        assignEmployee: 'Asignar Empleado',
        enterTgId: 'Ingrese ID de Telegram o @username',
        activeEmployees: 'Empleados Activos',
        addSuccess: '¡Éxito! Empleado añadido.',
        addError: '¡Usuario no encontrado! Debe presionar /start en el bot.',
        removeSuccess: 'Empleado eliminado.',
        ownerBadge: 'Propietario',
        adminBadge: 'Admin',
        managerBadge: 'Manager',
        selectAdmin: 'Admin',
        selectManager: 'Manager',
        roleLabel: 'Rol:',
        recentActivity: 'Actividad Reciente',
        analyzing: 'Analizando...',
        tabLeads: 'Clientes',
        tabUsers: 'Socios',
        noLeads: 'Aún no hay clientes',
        unknownUser: 'Anónimo',
        deletedUnit: 'Unidad Eliminada',
        showAll: 'Mostrar todos ({count})',
        hideAll: 'Ocultar',
        invitedLabelStats: 'INVITADOS:',
        refDealsLabel: 'CLIENTES REF:',
        ownPurchasesLabel: 'CLIENTES PROPIOS:',
        refVolumeLabel: 'VOLUMEN REF',
        commissionLabelAdmin: 'COMISIÓN',
        viewRefDealsBtn: 'Ver clientes referidos',
        refDealsTitle: 'Clientes Referidos',
        loading: 'Cargando...',
        statuses: {
            new: 'Nuevo',
            contacted: 'En Proceso',
            closed: 'Cerrado',
            cancelled: 'Cancelado'
        },
        balance: 'Saldo',
        payoutBtn: 'Pagar',
        confirmPayout: '¿Pagar ${amount} al usuario?',
        notePlaceholder: 'Nota o nombre...',
    },
    ar: {
        title: 'الإحصائيات العامة',
        totalUsers: 'إجمالي المستخدمين',
        totalLeads: 'إجمالي الطلبات',
        refUsers: 'تسجيلات الإحالة',
        revenue: 'الإيرادات (المغلقة)',
        topReferrers: 'أفضل المحيلين',
        partner: 'شريك',
        invited: 'تمت دعوتهم',
        noData: 'لا توجد بيانات بعد',
        manageStaff: 'إدارة الموظفين',
        assignEmployee: 'تعيين موظف',
        enterTgId: 'أدخل ID التيليجرام أو @username',
        activeEmployees: 'الموظفون النشطون',
        addSuccess: 'نجاح! تم إضافة الموظف.',
        addError: 'المستخدم غير موجود! يجب أن يضغط على /start في البوت.',
        removeSuccess: 'تمت إزالة الموظف.',
        ownerBadge: 'المالك',
        adminBadge: 'مسؤول',
        managerBadge: 'مدير',
        selectAdmin: 'مسؤول',
        selectManager: 'مدير',
        roleLabel: 'الدور:',
        recentActivity: 'النشاط الأخير',
        analyzing: 'جاري التحليل...',
        tabLeads: 'الطلبات',
        tabUsers: 'الشركاء',
        noLeads: 'لا توجد طلبات بعد',
        unknownUser: 'مجهول',
        deletedUnit: 'وحدة محذوفة',
        showAll: 'إظهار الكل ({count})',
        hideAll: 'إخفاء',
        invitedLabelStats: 'تمت دعوتهم:',
        refDealsLabel: 'طلبات الإحالة:',
        ownPurchasesLabel: 'طلباتي:',
        refVolumeLabel: 'حجم الإحالة',
        commissionLabelAdmin: 'العمولة',
        viewRefDealsBtn: 'عرض طلبات الإحالة',
        refDealsTitle: 'طلبات الإحالة',
        loading: 'جاري التحميل...',
        statuses: {
            new: 'جديد',
            contacted: 'جاري التواصل',
            closed: 'مغلق',
            cancelled: 'ملغي'
        },
        balance: 'الرصيد',
        payoutBtn: 'صرف الرصيد',
        confirmPayout: 'صرف ${amount} للمستخدم؟',
        notePlaceholder: 'ملاحظة أو اسم...',
    },
    fr: {
        title: 'Statistiques Globales',
        totalUsers: 'Total Utilisateurs',
        totalLeads: 'Total Prospects',
        refUsers: 'Inscriptions par Parrainage',
        revenue: 'Chiffre d\'affaires (Clos)',
        topReferrers: 'Top Parrains',
        partner: 'Partenaire',
        invited: 'Invités',
        noData: 'Pas encore de données',
        manageStaff: 'Gestion du Personnel',
        assignEmployee: 'Assigner un Employé',
        enterTgId: 'Entrez ID Telegram ou @username',
        activeEmployees: 'Employés Actifs',
        addSuccess: 'Succès ! Employé ajouté.',
        addError: 'Utilisateur non trouvé ! Il doit appuyer sur /start dans le bot.',
        removeSuccess: 'Employé supprimé.',
        ownerBadge: 'Propriétaire',
        adminBadge: 'Admin',
        managerBadge: 'Manager',
        selectAdmin: 'Admin',
        selectManager: 'Manager',
        roleLabel: 'Rôle :',
        recentActivity: 'Activité Récente',
        analyzing: 'Analyse...',
        tabLeads: 'Prospects',
        tabUsers: 'Partenaires',
        noLeads: 'Pas encore de prospects',
        unknownUser: 'Anonyme',
        deletedUnit: 'Unité supprimée',
        showAll: 'Tout afficher ({count})',
        hideAll: 'Masquer',
        invitedLabelStats: 'INVITÉS :',
        refDealsLabel: 'PROSPECTS REF :',
        ownPurchasesLabel: 'PROSPECTS PROPRES :',
        refVolumeLabel: 'VOLUME REF',
        commissionLabelAdmin: 'COMMISSION',
        viewRefDealsBtn: 'Voir les prospects parrainés',
        refDealsTitle: 'Prospects parrainés',
        loading: 'Chargement...',
        statuses: {
            new: 'Nouveau',
            contacted: 'En cours',
            closed: 'Clos',
            cancelled: 'Annulé'
        },
        balance: 'Solde',
        payoutBtn: 'Payer',
        confirmPayout: 'Payer ${amount} à l\'utilisateur ?',
        notePlaceholder: 'Note ou nom...',
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
            const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: refCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('referrer_id', 'is', null);

            const { data: leadsData } = await supabase
                .from('leads')
                .select('*, units(*)')
                .order('created_at', { ascending: false });

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

                allUsers.forEach((u: any) => {
                    if (u.referrer_id && uMap[String(u.referrer_id)]) {
                        uMap[String(u.referrer_id)].invitedCount++;
                        uMap[String(u.referrer_id)].invitedUserIds.push(String(u.telegram_id));
                    }
                });

                let totalRevenue = 0;
                leadsData.forEach((l: any) => {
                    const uId = String(l.user_id);
                    const unitPrice = Number(l.units?.price) || 0;

                    if (uId && uMap[uId]) {
                        uMap[uId].leadsCount++;
                        
                        if (l.status === 'closed') {
                            totalRevenue += unitPrice;
                        }

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
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <MetricCard icon="group" label={t.totalUsers} value={stats.totalUsers} color="primary" />
                <MetricCard icon="leaderboard" label={t.totalLeads} value={stats.totalLeads} color="secondary" />
                <MetricCard icon="person_add" label={t.refUsers} value={stats.refUsers} color="tertiary" />
                {isAdmin && <MetricCard icon="payments" label={t.revenue} value={`€${stats.revenue.toLocaleString()}`} color="primary" />}
            </div>

            {loading ? (
                <div className="text-center p-12 animate-pulse text-outline font-black uppercase tracking-widest text-[10px]">
                    {t.analyzing}
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                            <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">{t.tabUsers}</h3>
                        </div>

                        {usersInfo.slice(0, isUsersExpanded ? undefined : 6).map((u: any) => (
                            <div key={u.telegram_id} className="card-premium space-y-4 neon-glow animate-fade-in">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-bold text-outline border border-white/5">
                                            {(u.username || u.full_name || '?')[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-black text-on-background">@{u.username || u.full_name || u.telegram_id}</p>
                                                {u.custom_note && <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black border border-primary/20 uppercase tracking-widest">{u.custom_note}</span>}
                                            </div>
                                            <p className="text-[10px] text-outline-variant font-bold font-mono">ID: {u.telegram_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-outline font-bold uppercase tracking-widest">{t.commissionLabelAdmin}</p>
                                        <p className="text-sm font-black text-primary">€{(u.earnedBonuses || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-widest text-outline bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                                    <div>{t.invitedLabelStats} <span className="text-on-background">{u.invitedCount}</span></div>
                                    <div>{t.refDealsLabel} <span className="text-on-background">{u.refLeadsCount}</span></div>
                                </div>

                                <div className="flex gap-2">
                                    {u.invitedCount > 0 && (
                                        <button 
                                            onClick={() => openRefDrilldown(u)}
                                            className="btn-secondary flex-1 !py-2.5 !px-4"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                                            {t.viewRefDealsBtn}
                                        </button>
                                    )}
                                    {u.balance > 0 && isAdmin && (
                                        <button 
                                            onClick={() => handlePayout(u.telegram_id, u.balance)}
                                            className="btn-primary flex-1 !py-2.5 !px-4"
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
                                        className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-outline transition-all active:scale-90"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                    </button>
                                </div>

                                {editingNoteId === u.telegram_id && (
                                    <div className="flex gap-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                                        <input 
                                            type="text" 
                                            value={noteValue} 
                                            onChange={(e) => setNoteValue(e.target.value)}
                                            className="input-field !p-3 !text-xs"
                                            placeholder={t.notePlaceholder}
                                        />
                                        <button onClick={() => handleSaveNote(u.telegram_id)} className="btn-primary !p-3">OK</button>
                                        <button onClick={() => setEditingNoteId(null)} className="btn-secondary !p-3">X</button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {usersInfo.length > 6 && (
                            <button 
                                onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                                className="btn-secondary w-full"
                            >
                                {isUsersExpanded ? t.hideAll : t.showAll.replace('{count}', usersInfo.length)}
                            </button>
                        )}
                    </div>

                    {isAdmin && (
                        <section className="space-y-4 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 px-1">
                                <span className="material-symbols-outlined text-primary text-[18px]">engineering</span>
                                <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">{t.manageStaff}</h3>
                            </div>

                            <div className="card-premium space-y-5 neon-glow">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                            <span className="material-symbols-outlined text-primary">person_add</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-on-background uppercase tracking-wider">{t.assignEmployee}</p>
                                            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{t.enterTgId}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newStaffId}
                                            onChange={(e) => setNewStaffId(e.target.value)}
                                            placeholder="ID / @username"
                                            className="input-field flex-1 font-mono"
                                        />
                                        <select
                                            value={newStaffRole}
                                            onChange={(e) => setNewStaffRole(e.target.value)}
                                            className="input-field appearance-none min-w-[120px] text-center uppercase tracking-widest font-black"
                                        >
                                            <option value="manager" className="bg-surface-container-high">{t.selectManager}</option>
                                            <option value="admin" className="bg-surface-container-high">{t.selectAdmin}</option>
                                        </select>
                                        <button
                                            onClick={handleAddStaff}
                                            className="btn-primary w-14 !p-0"
                                        >
                                            <span className="material-symbols-outlined font-black">add</span>
                                        </button>
                                    </div>
                                    {statusMsg && (
                                        <p className={`text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-xl bg-white/[0.02] ${statusMsg.includes('Ошибка') || statusMsg.includes('Error') || statusMsg.includes('не найден') || statusMsg.includes('not found') ? 'text-error' : 'text-primary'}`}>
                                            {statusMsg}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3 pt-2">
                                    <p className="text-[9px] font-black text-outline uppercase tracking-[0.2em] px-1">{t.activeEmployees}</p>
                                    <div className="space-y-2">
                                        {staff.map((s) => (
                                            <div key={s.telegram_id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-outline">
                                                        {(s.username || s.full_name || '?')[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-on-background">@{s.username || s.full_name || s.telegram_id}</p>
                                                        <p className="text-[10px] text-outline-variant font-bold font-mono tracking-tighter">ID: {s.telegram_id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <RoleBadge role={s.role} t={t} />
                                                    {s.role !== 'founder' && s.telegram_id !== user?.telegram_id && (
                                                        <button
                                                            onClick={() => handleRemoveStaff(s.telegram_id)}
                                                            className="w-8 h-8 flex items-center justify-center bg-error/10 rounded-lg border border-error/20 text-error hover:bg-error/20 transition-all active:scale-90"
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
                    <div className="bg-surface-container-high w-full max-w-lg h-[80vh] rounded-[2.5rem] p-6 overflow-hidden flex flex-col gap-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <div>
                                <h3 className="text-lg font-black text-on-background uppercase tracking-tight">🔗 {t.refDealsTitle}</h3>
                                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-1">@{selectedUser.username || selectedUser.telegram_id}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-outline hover:text-on-background transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto clean-scrollbar space-y-3 pr-1">
                            {refLeadsLoading ? (
                                <div className="text-center py-20 animate-pulse text-outline font-black uppercase tracking-widest text-[10px]">{t.loading}</div>
                            ) : refLeads.length === 0 ? (
                                <div className="text-center py-20 text-outline-variant font-black uppercase tracking-widest text-[10px]">{t.noLeads}</div>
                            ) : refLeads.map((l: any) => (
                                <div key={l.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-bold text-on-background">@{l.users?.username || l.users?.full_name || t.unknownUser}</p>
                                        <b className="text-primary text-xs">€{(l.units?.price || 0).toLocaleString()}</b>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-outline font-bold uppercase">{l.units?.title?.ru || l.units?.title || t.deletedUnit}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${l.status === 'closed' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-outline border-white/5'}`}>
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
        founder: { label: t.ownerBadge, color: 'bg-primary/10 text-primary border-primary/20', icon: 'shield_person' },
        admin: { label: t.adminBadge, color: 'bg-secondary/10 text-secondary border-secondary/20', icon: 'manage_accounts' },
        manager: { label: t.managerBadge, color: 'bg-tertiary/10 text-tertiary border-tertiary/20', icon: 'badge' },
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
        primary: 'text-primary bg-primary/10 border-primary/20',
        secondary: 'text-secondary bg-secondary/10 border-secondary/20',
        tertiary: 'text-tertiary bg-tertiary/10 border-tertiary/20',
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <div className={`card-premium !p-5 flex flex-col items-center text-center space-y-1 relative overflow-hidden group neon-glow`}>
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-20 ${c.split(' ')[0]}`} />
            <div className={`p-2 rounded-xl mb-1 ${c}`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <p className="text-xl font-black text-on-background tracking-tight">{value}</p>
            <p className="text-[8px] text-outline font-black uppercase tracking-[0.2em]">{label}</p>
        </div>
    );
}
