'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { listProjects } from '@/lib/devProjectsMock';

const t: Record<string, Record<string, string>> = {
    ru: {
        title: 'Каталог',
        subtitle: 'Премиальная Недвижимость',
        all: 'Все',
        rent: 'Аренда',
        sale: 'Продажа',
        invest: 'Новостройки',
        noResults: 'Объектов пока нет. Скоро здесь появятся лучшие предложения!',
        perMonth: '/мес',
        rooms: 'комн.',
        askBot: 'Спросить бота',
    },
    en: {
        title: 'Catalog',
        subtitle: 'Premium Real Estate',
        all: 'All',
        rent: 'Rent',
        sale: 'Sale',
        invest: 'Off-plan',
        noResults: 'No properties yet. Best offers are coming soon!',
        perMonth: '/mo',
        rooms: 'rooms',
        askBot: 'Ask bot',
    },
    tr: {
        title: 'Katalog',
        subtitle: 'Premium Emlak',
        all: 'Tümü',
        rent: 'Kiralık',
        sale: 'Satılık',
        invest: 'Projeler',
        noResults: 'Henüz mülk yok. En iyi teklifler yakında burada!',
        perMonth: '/ay',
        rooms: 'oda',
        askBot: 'Bota sor',
    },
};

export default function CatalogView({ lang = 'ru' }: { lang?: string }) {
    const tr = t[lang] || t['ru'];
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'apartment' | 'land'>('apartment');
    const [intentFilter, setIntentFilter] = useState<'sale' | 'rent'>('sale');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUnits();
    }, [filter, intentFilter]);

    const fetchUnits = async () => {
        setLoading(true);
        let allUnits: any[] = [];

        // Fetch from consolidated 'units' table
        const { data: dbUnits, error } = await supabase
            .from('units')
            .select('*')
            .eq('is_active', true)
            .eq('unit_type', filter)
            .eq('intent', intentFilter)
            .order('created_at', { ascending: false });
        
        if (dbUnits) {
            allUnits = dbUnits;
        }

        setUnits(allUnits);
        setLoading(false);
    };

    const handleAskBot = (unit: any) => {
        const tg = window.Telegram?.WebApp;
        const title = unit.title?.ru || unit.title || 'Property';
        if (tg) {
            tg.sendData(JSON.stringify({ action: 'ask_about', unit_id: unit.id, title }));
            tg.close();
        }
    };

    return (
        <div className="space-y-5">
            {/* Header Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#121214] to-[#0d0d0f] p-5 rounded-3xl border border-white/5">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3" />
                <div className="relative flex items-center gap-4 w-full">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[20px]">search</span>
                        <input 
                            type="text"
                            placeholder="Поиск по городу или адресу..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Type Filter Chips */}
            <div className="flex gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/5">
                {[
                    { id: 'apartment', label: 'Квартиры' },
                    { id: 'land', label: 'Участки' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`flex-1 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
                            filter === f.id
                                ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Intent Filter (Sale/Rent) */}
            <div className="flex justify-center">
                <div className="inline-flex p-1 bg-white/[0.02] rounded-xl border border-white/5">
                    {[
                        { id: 'sale', label: tr.sale },
                        { id: 'rent', label: tr.rent }
                    ].map((i) => (
                        <button
                            key={i.id}
                            onClick={() => setIntentFilter(i.id as any)}
                            className={`px-6 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                                intentFilter === i.id 
                                    ? 'bg-white/10 text-emerald-400' 
                                    : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                        >
                            {i.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading Skeletons */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                        <span className="material-symbols-outlined text-zinc-700 text-[48px]">real_estate_agent</span>
                    </div>
                    <p className="text-sm text-zinc-600 text-center font-medium max-w-[260px]">{tr.noResults}</p>
                </div>
            ) : (
                /* Property Cards */
                <div className="space-y-5">
                    {units.filter(u => {
                        const q = searchQuery.toLowerCase();
                        return (u.city || '').toLowerCase().includes(q) || (u.address || '').toLowerCase().includes(q) || (u.title?.ru || u.title || '').toLowerCase().includes(q);
                    }).map((unit) => (
                        <PropertyCard
                            key={unit.id}
                            unit={unit}
                            tr={tr}
                            lang={lang}
                            onAskBot={() => handleAskBot(unit)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function PropertyCard({ unit, tr, lang, onAskBot }: any) {
    const photo = unit.photos?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';
    const city = unit.i18n?.[lang]?.city || unit.city || 'Alanya';
    const price = unit.price;
    const title = unit.i18n?.[lang]?.title || unit.title?.ru || unit.title || 'Property';
    const isRent = unit.intent === 'rent';
    const isInvest = unit.unit_type === 'invest';

    return (
        <div className="group bg-[#121214] rounded-3xl overflow-hidden border border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 hover:border-emerald-500/20 hover:shadow-[0_8px_40px_rgba(16,185,129,0.1)]">
            {/* Image */}
            <div className="relative h-52 w-full overflow-hidden">
                <img
                    src={photo}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent opacity-60" />

                {/* Tags */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                        📍 {city}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        isRent
                            ? 'bg-blue-500/70 text-white border-blue-400/30'
                            : isInvest 
                                ? 'bg-amber-500/80 text-black border-amber-400/30' 
                                : 'bg-emerald-500/80 text-black border-emerald-400/30'
                    }`}>
                        {isRent ? tr.rent : isInvest ? tr.invest : tr.sale}
                    </span>
                </div>

                {/* Price Badge */}
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <p className="text-emerald-400 text-lg font-extrabold">
                        €{price?.toLocaleString()}
                        {isRent && <span className="text-xs text-zinc-400 font-medium">{tr.perMonth}</span>}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 uppercase tracking-widest">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {unit.i18n?.[lang]?.address || unit.address || city}
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <div className="flex gap-5">
                        {unit.bedrooms != null && (
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <span className="material-symbols-outlined text-[18px]">bed</span>
                                <span className="text-xs font-bold">{unit.bedrooms}</span>
                            </div>
                        )}
                        {(unit.bathrooms || unit.living_rooms) && (
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <span className="material-symbols-outlined text-[18px]">bathtub</span>
                                <span className="text-xs font-bold">{unit.bathrooms || unit.living_rooms || 1}</span>
                            </div>
                        )}
                        {unit.rooms && (
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <span className="material-symbols-outlined text-[18px]">meeting_room</span>
                                <span className="text-xs font-bold">{unit.rooms} {tr.rooms}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onAskBot}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20 transition-all active:scale-90 flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{tr.askBot}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
