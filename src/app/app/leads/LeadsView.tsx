'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Лиды',
        subtitle: 'Заявки от клиентов',
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
    },
    en: {
        title: 'Leads',
        subtitle: 'Client requests',
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
    },
    tr: {
        title: 'Müşteriler',
        subtitle: 'Müşteri talepleri',
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
    },
};

export default function LeadsView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { fetchLeads(); }, [filter]);

    const fetchLeads = async () => {
        setLoading(true);
        let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50);

        if (filter === 'new') query = query.eq('status', 'new');
        else if (filter === 'inWork') query = query.eq('status', 'in_work');
        else if (filter === 'hot') query = query.eq('status', 'hot');

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
        new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        in_work: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        hot: 'bg-red-500/15 text-red-400 border-red-500/30',
        done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };

    const tempColors: Record<string, string> = {
        cold: 'text-blue-400',
        warm: 'text-amber-400',
        hot: 'text-red-400',
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 px-1">
                <div className="bg-violet-500/10 p-2 rounded-xl border border-violet-500/20">
                    <span className="material-symbols-outlined text-violet-400 text-[20px]">person_search</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">{t.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/5">
                {[
                    { key: 'all', label: t.all },
                    { key: 'new', label: t.new },
                    { key: 'inWork', label: t.inWork },
                    { key: 'hot', label: t.hot },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex-1 py-2 text-[10px] font-extrabold uppercase tracking-widest rounded-xl transition-all ${
                            filter === f.key
                                ? 'bg-violet-500 text-black shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Leads List */}
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-white/[0.03] rounded-2xl border border-white/5" />
                    ))}
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-col items-center py-16 space-y-4">
                    <span className="material-symbols-outlined text-zinc-700 text-[48px]">inbox</span>
                    <p className="text-sm text-zinc-600 font-medium">{t.noLeads}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leads.map(lead => {
                        const isOpen = expandedId === lead.id;
                        const name = lead.name || lead.data?.client_name || t.anonymous;
                        const temp = lead.data?.lead_temperature;
                        const summary = lead.data?.ru?.client_summary || lead.data?.client_profile || lead.notes || '';
                        const interest = lead.data?.ru?.interest || lead.data?.interest || '';

                        return (
                            <div
                                key={lead.id}
                                className={`bg-[#121214] rounded-2xl border transition-all ${isOpen ? 'border-violet-500/20' : 'border-white/5'}`}
                            >
                                {/* Lead Header */}
                                <button
                                    onClick={() => setExpandedId(isOpen ? null : lead.id)}
                                    className="w-full p-4 flex items-center gap-3 text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-400 border border-white/5 flex-shrink-0">
                                        {name[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                                            {temp && (
                                                <span className={`text-[10px] font-bold uppercase ${tempColors[temp] || 'text-zinc-500'}`}>
                                                    {temp === 'hot' ? '🔥' : temp === 'warm' ? '🟡' : '❄️'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${statusColors[lead.status] || statusColors.new}`}>
                                                {lead.status}
                                            </span>
                                            <span className="text-[10px] text-zinc-600">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`material-symbols-outlined text-zinc-600 text-[18px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>

                                {/* Expanded Details */}
                                {isOpen && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                                        {/* Contact Info */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {lead.phone && (
                                                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">📞</p>
                                                    <p className="text-xs text-white font-mono mt-0.5">{lead.phone}</p>
                                                </div>
                                            )}
                                            {lead.email && (
                                                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">✉️</p>
                                                    <p className="text-xs text-white font-mono mt-0.5">{lead.email}</p>
                                                </div>
                                            )}
                                            {(lead.budget_min || lead.budget_max || lead.data?.budget) && (
                                                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{t.budget}</p>
                                                    <p className="text-xs text-emerald-400 font-bold mt-0.5">
                                                        €{lead.data?.budget?.toLocaleString() || `${lead.budget_min || '?'} - ${lead.budget_max || '?'}`}
                                                    </p>
                                                </div>
                                            )}
                                            {lead.source && (
                                                <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{t.source}</p>
                                                    <p className="text-xs text-white mt-0.5">{lead.source}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* AI Summary */}
                                        {summary && (
                                            <div className="bg-violet-500/5 p-3 rounded-xl border border-violet-500/10">
                                                <p className="text-[9px] text-violet-400 font-bold uppercase tracking-wider mb-1">AI Summary</p>
                                                <p className="text-xs text-zinc-300 leading-relaxed">{summary}</p>
                                            </div>
                                        )}

                                        {interest && (
                                            <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Интерес</p>
                                                <p className="text-xs text-zinc-300">{interest}</p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1">
                                            {lead.telegram_chat_id && (
                                                <button
                                                    onClick={() => openTelegram(lead.telegram_chat_id)}
                                                    className="flex-1 bg-blue-500/15 text-blue-400 border border-blue-500/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                                    {t.writeTg}
                                                </button>
                                            )}
                                            {lead.status === 'new' && (
                                                <button
                                                    onClick={() => updateStatus(lead.id, 'in_work')}
                                                    className="flex-1 bg-amber-500/15 text-amber-400 border border-amber-500/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                >
                                                    {t.markInWork}
                                                </button>
                                            )}
                                            {lead.status === 'in_work' && (
                                                <button
                                                    onClick={() => updateStatus(lead.id, 'done')}
                                                    className="flex-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                >
                                                    {t.markDone}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteLead(lead.id)}
                                                className="bg-red-500/10 text-red-400/70 border border-red-500/20 p-2.5 rounded-xl active:scale-95 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
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
