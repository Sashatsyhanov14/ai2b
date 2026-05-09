'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
        searchPlaceholder: 'Поиск по городу или адресу...',
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
        searchPlaceholder: 'Search city or address...',
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
        searchPlaceholder: 'Şehir veya adres ara...',
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
            {/* Search Bar - MD3 Style */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px] font-black">search</span>
                </div>
                <input 
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-white/5 rounded-3xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-lg"
                />
            </div>

            {/* Type Filter Chips */}
            <div className="flex gap-2 p-1 bg-surface-container-lowest rounded-2xl border border-white/5">
                {[
                    { id: 'apartment', label: 'Квартиры', icon: 'apartment' },
                    { id: 'land', label: 'Участки', icon: 'landscape' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all duration-300 active:scale-95 ${
                            filter === f.id
                                ? 'bg-primary text-black shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                                : 'text-zinc-600 hover:text-white'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{f.label}</span>
                    </button>
                ))}
            </div>

            {/* Intent Filter (Sale/Rent) */}
            <div className="flex justify-center">
                <div className="inline-flex p-1 bg-white/[0.01] rounded-xl border border-white/5">
                    {[
                        { id: 'sale', label: tr.sale },
                        { id: 'rent', label: tr.rent }
                    ].map((i) => (
                        <button
                            key={i.id}
                            onClick={() => setIntentFilter(i.id as any)}
                            className={`px-8 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${
                                intentFilter === i.id 
                                    ? 'bg-white/5 text-primary' 
                                    : 'text-zinc-700 hover:text-zinc-500'
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
                        <div key={i} className="h-72 bg-white/[0.02] rounded-[32px] animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 opacity-30">
                    <span className="material-symbols-outlined text-[64px] font-thin">domain_disabled</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center max-w-[200px] leading-loose">{tr.noResults}</p>
                </div>
            ) : (
                /* Property Cards */
                <div className="space-y-6">
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
        <div className="group bg-[#121214] rounded-[40px] overflow-hidden border border-white/[0.04] shadow-2xl transition-all duration-500 hover:border-primary/20">
            {/* Image */}
            <div className="relative h-64 w-full overflow-hidden">
                <img
                    src={photo}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent opacity-80" />

                {/* Tags */}
                <div className="absolute top-5 left-5 flex gap-2">
                    <div className="bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/10">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{city}</span>
                    </div>
                </div>

                {/* Price Badge */}
                <div className="absolute bottom-6 left-6 flex flex-col">
                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">
                        {isRent ? 'Monthy Rent' : 'Selling Price'}
                    </p>
                    <p className="text-white text-3xl font-black tracking-tighter">
                        €{price?.toLocaleString()}
                        {isRent && <span className="text-sm text-zinc-500 font-bold ml-1">{tr.perMonth}</span>}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
                <div>
                    <h3 className="text-xl font-black text-white leading-tight tracking-tight">{title}</h3>
                    <p className="text-xs text-zinc-600 mt-2 font-bold uppercase tracking-wider line-clamp-1">
                        {unit.i18n?.[lang]?.address || unit.address || city}
                    </p>
                </div>

                {/* Quick Stats & CTA */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-4">
                        {unit.bedrooms != null && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-zinc-500">bed</span>
                                <span className="text-[10px] font-black text-zinc-600 mt-1">{unit.bedrooms}</span>
                            </div>
                        )}
                        {(unit.bathrooms || unit.living_rooms) && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-zinc-500">bathtub</span>
                                <span className="text-[10px] font-black text-zinc-600 mt-1">{unit.bathrooms || unit.living_rooms || 1}</span>
                            </div>
                        )}
                        {unit.rooms && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-zinc-500">meeting_room</span>
                                <span className="text-[10px] font-black text-zinc-600 mt-1">{unit.rooms}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onAskBot}
                        className="bg-primary text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    >
                        <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                        {tr.askBot}
                    </button>
                </div>
            </div>
        </div>
    );
}
t-[10px] font-bold uppercase tracking-wider hidden sm:inline">{tr.askBot}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
