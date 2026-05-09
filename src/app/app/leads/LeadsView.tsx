'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Управление Лидами',
        subtitle: 'Входящие заявки',
        all: 'Все',
        new: 'Новые',
        inWork: 'В работе',
        hot: 'Горячие',
        noLeads: 'Заявок пока нет',
        loading: 'Загрузка...',
        budget: 'Бюджет',
        source: 'Источник',
        anonymous: 'Анонимный клиент',
        writeTg: 'Написать',
        markInWork: 'В работу',
        markDone: 'Готово',
        delete: 'Удалить',
        deleteConfirm: 'Удалить этот лид?',
        clientSummary: 'Профиль клиента',
        interest: 'Интерес',
    },
    en: {
        title: 'Lead Management',
        subtitle: 'Incoming requests',
        all: 'All',
        new: 'New',
        inWork: 'In Work',
        hot: 'Hot',
        noLeads: 'No leads yet',
        loading: 'Loading...',
        budget: 'Budget',
        source: 'Source',
        anonymous: 'Anonymous client',
        writeTg: 'Message',
        markInWork: 'Start work',
        markDone: 'Done',
        delete: 'Delete',
        deleteConfirm: 'Delete this lead?',
        clientSummary: 'Client Profile',
        interest: 'Interest',
    },
    tr: {
        title: 'Müşteri Yönetimi',
        subtitle: 'Gelen talepler',
        all: 'Tümü',
        new: 'Yeni',
        inWork: 'İş Başı',
        hot: 'Sıcak',
        noLeads: 'Henüz müşteri yok',
        loading: 'Yükleniyor...',
        budget: 'Bütçe',
        source: 'Kaynak',
        anonymous: 'Anonim müşteri',
        writeTg: 'Mesaj',
        markInWork: 'İşe al',
        markDone: 'Tamam',
        delete: 'Sil',
        deleteConfirm: 'Bu müşteriyi silmek istiyor musunuz?',
        clientSummary: 'Müşteri Profili',
        interest: 'İlgi',
    },
    de: {
        title: 'Anfragenverwaltung',
        subtitle: 'Eingehende Anfragen',
        all: 'Alle',
        new: 'Neu',
        inWork: 'In Arbeit',
        hot: 'Heiß',
        noLeads: 'Noch keine Anfragen',
        loading: 'Lade...',
        budget: 'Budget',
        source: 'Quelle',
        anonymous: 'Anonymer Kunde',
        writeTg: 'Schreiben',
        markInWork: 'Starten',
        markDone: 'Fertig',
        delete: 'Löschen',
        deleteConfirm: 'Diese Anfrage löschen?',
        clientSummary: 'Kundenprofil',
        interest: 'Interesse',
    },
    es: {
        title: 'Gestión de Clientes',
        subtitle: 'Solicitudes entrantes',
        all: 'Todos',
        new: 'Nuevos',
        inWork: 'En trabajo',
        hot: 'Urgentes',
        noLeads: 'Aún no hay clientes',
        loading: 'Cargando...',
        budget: 'Presupuesto',
        source: 'Fuente',
        anonymous: 'Cliente anónimo',
        writeTg: 'Escribir',
        markInWork: 'Iniciar',
        markDone: 'Listo',
        delete: 'Eliminar',
        deleteConfirm: '¿Eliminar este cliente?',
        clientSummary: 'Perfil del Cliente',
        interest: 'Interés',
    },
    ar: {
        title: 'إدارة الطلبات',
        subtitle: 'الطلبات الواردة',
        all: 'الكل',
        new: 'جديد',
        inWork: 'قيد العمل',
        hot: 'ساخن',
        noLeads: 'لا توجد طلبات بعد',
        loading: 'جاري التحميل...',
        budget: 'الميزانية',
        source: 'المصدر',
        anonymous: 'عميل مجهول',
        writeTg: 'مراسلة',
        markInWork: 'بدء العمل',
        markDone: 'تم',
        delete: 'حذف',
        deleteConfirm: 'حذف هذا الطلب؟',
        clientSummary: 'ملف العميل',
        interest: 'الاهتمام',
    },
    fr: {
        title: 'Gestion des Prospects',
        subtitle: 'Demandes entrantes',
        all: 'Tous',
        new: 'Nouveaux',
        inWork: 'En cours',
        hot: 'Urgent',
        noLeads: 'Pas encore de prospects',
        loading: 'Chargement...',
        budget: 'Budget',
        source: 'Source',
        anonymous: 'Client anonyme',
        writeTg: 'Écrire',
        markInWork: 'Démarrer',
        markDone: 'Terminé',
        delete: 'Supprimer',
        deleteConfirm: 'Supprimer ce prospect ?',
        clientSummary: 'Profil Client',
        interest: 'Intérêt',
    },
};

export default function LeadsView({ user, lang = 'ru' }: { user?: any; lang?: string }) {
    const isAdmin = user?.role === 'founder' || user?.role === 'admin';
    const t = i18n[lang] || i18n['ru'];
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { fetchLeads(); }, [filter]);

    const fetchLeads = async () => {
        setLoading(true);
        let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(100);

        if (filter === 'new') query = query.eq('status', 'new');
        else if (filter === 'inWork') query = query.eq('status', 'in_work');
        else if (filter === 'hot') query = query.eq('status', 'hot');

        // Manager restriction: only see leads from their own referrals
        if (user?.role === 'manager' && user?.telegram_id) {
            const { data: referrals } = await supabase
                .from('users')
                .select('telegram_id')
                .eq('referrer_id', user.telegram_id);
            
            const refIds = referrals?.map(r => r.telegram_id) || [];
            if (refIds.length > 0) {
                query = query.in('user_id', refIds);
            } else {
                setLeads([]);
                setLoading(false);
                return;
            }
        }

        const { data } = await query;
        setLeads(data || []);
        setLoading(false);
    };

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('leads').update({ status }).eq('id', id);
        fetchLeads();
    };

    const deleteLead = async (id: string) => {
        if (!window.confirm(t.deleteConfirm)) return;
        await supabase.from('leads').delete().eq('id', id);
        fetchLeads();
    };

    const openTelegram = (chatId: string) => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.openTelegramLink(`https://t.me/${chatId}`);
        } else {
            window.open(`https://t.me/${chatId}`, '_blank');
        }
    };

    const statusColors: Record<string, string> = {
        new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        in_work: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        hot: 'bg-red-500/10 text-red-400 border-red-500/20',
        done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };

    const tempIcons: Record<string, string> = {
        cold: 'ac_unit',
        warm: 'local_fire_department',
        hot: 'fire_repository',
    };

    const tempColors: Record<string, string> = {
        cold: 'text-blue-400',
        warm: 'text-amber-400',
        hot: 'text-red-400',
    };

    return (
        <div className="space-y-5">
            {/* Filter Tabs - eSIM Style */}
            <div className="flex gap-2 p-1 bg-surface-container-lowest rounded-2xl border border-white/5">
                {[
                    { key: 'all', label: t.all, icon: 'list' },
                    { key: 'new', label: t.new, icon: 'fiber_new' },
                    { key: 'inWork', label: t.inWork, icon: 'sync' },
                    { key: 'hot', label: t.hot, icon: 'whatshot' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all active:scale-95 ${
                            filter === f.key
                                ? 'bg-primary text-black shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                                : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{f.label}</span>
                    </button>
                ))}
            </div>

            {/* Leads List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-white/[0.02] rounded-3xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center py-20 space-y-4 opacity-30">
                    <span className="material-symbols-outlined text-[64px] font-thin">inbox</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t.noLeads}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => {
                        const isOpen = expandedId === lead.id;
                        const name = lead.name || lead.data?.client_name || t.anonymous;
                        const temp = lead.data?.lead_temperature || 'warm';
                        const summary = lead.data?.i18n?.[lang]?.client_summary || lead.data?.[lang]?.client_summary || lead.data?.ru?.client_summary || lead.data?.client_profile || lead.notes || '';
                        const interest = lead.data?.i18n?.[lang]?.interest || lead.data?.[lang]?.interest || lead.data?.ru?.interest || lead.data?.interest || '';

                        return (
                            <div
                                key={lead.id}
                                className={`glass-card bg-[#121214] rounded-3xl border transition-all duration-300 ${isOpen ? 'border-primary/30 ring-1 ring-primary/10' : 'border-white/5'}`}
                            >
                                {/* Lead Header */}
                                <button
                                    onClick={() => setExpandedId(isOpen ? null : lead.id)}
                                    className="w-full p-4 flex items-center gap-4 text-left group"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-center text-lg font-black text-zinc-500 group-active:scale-90 transition-transform">
                                            {name[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#121214] border-2 border-[#121214] flex items-center justify-center ${tempColors[temp] || 'text-zinc-500'}`}>
                                            <span className="material-symbols-outlined text-[12px] font-black">
                                                {temp === 'hot' ? 'whatshot' : temp === 'warm' ? 'local_fire_department' : 'ac_unit'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-white truncate tracking-tight">{name}</h3>
                                            {lead.data?.budget && (
                                                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                    €{lead.data.budget.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${statusColors[lead.status] || statusColors.new}`}>
                                                {lead.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-white transition-colors">
                                        <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {isOpen && (
                                    <div className="px-4 pb-5 space-y-4 border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <DetailItem icon="call" label="Phone" value={lead.phone || '—'} color="blue" />
                                            <DetailItem icon="alternate_email" label="Email" value={lead.email || '—'} color="violet" />
                                            <DetailItem icon="explore" label={t.source} value={lead.source || 'Bot'} color="amber" />
                                            <DetailItem icon="timer" label="Time" value={new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} color="emerald" />
                                        </div>

                                        {/* AI Analysis Card */}
                                        {summary && (
                                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-2 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                                    <span className="material-symbols-outlined text-[40px]">psychology</span>
                                                </div>
                                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">{t.clientSummary}</p>
                                                <p className="text-xs text-zinc-300 leading-relaxed font-medium">{summary}</p>
                                            </div>
                                        )}

                                        {interest && (
                                            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 space-y-1">
                                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">{t.interest}</p>
                                                <p className="text-xs text-zinc-300 font-medium">{interest}</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-2">
                                            {lead.telegram_chat_id && (
                                                <button
                                                    onClick={() => openTelegram(lead.telegram_chat_id)}
                                                    className="flex-[2] bg-blue-500 text-black py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                                    {t.writeTg}
                                                </button>
                                            )}
                                            
                                            <div className="flex flex-1 gap-2">
                                                {lead.status === 'new' && (
                                                    <button
                                                        onClick={() => updateStatus(lead.id, 'in_work')}
                                                        className="flex-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                                                        title={t.markInWork}
                                                    >
                                                        <span className="material-symbols-outlined">play_arrow</span>
                                                    </button>
                                                )}
                                                {lead.status === 'in_work' && (
                                                    <button
                                                        onClick={() => updateStatus(lead.id, 'done')}
                                                        className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                                                        title={t.markDone}
                                                    >
                                                        <span className="material-symbols-outlined">check_circle</span>
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => deleteLead(lead.id)}
                                                        className="w-12 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                                                        title={t.delete}
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DetailItem({ icon, label, value, color }: { icon: string, label: string, value: string, color: string }) {
    const colors: Record<string, string> = {
        blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        violet: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
        amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    };

    return (
        <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${colors[color]}`}>
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">{label}</p>
                <p className="text-[11px] text-white font-bold truncate tracking-tight">{value}</p>
            </div>
        </div>
    );
}

