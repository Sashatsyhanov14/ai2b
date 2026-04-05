'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n';
import Image from 'next/image';

export default function CatalogView() {
    const { t } = useI18n();
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'rent' | 'sale'>('all');

    useEffect(() => {
        fetchUnits();
    }, [filter]);

    const fetchUnits = async () => {
        setLoading(true);
        let allUnits: any[] = [];

        // Fetch Rentals
        if (filter === 'all' || filter === 'rent') {
            const { data: rentals } = await supabase
                .from('rental_units')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (rentals) allUnits = [...allUnits, ...rentals.map(r => ({ ...r, type: 'rent' }))];
        }

        // Fetch Sales
        if (filter === 'all' || filter === 'sale') {
            const { data: sales } = await supabase
                .from('sale_properties')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            if (sales) allUnits = [...allUnits, ...sales.map(s => ({ ...s, type: 'sale' }))];
        }

        setUnits(allUnits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(false);
    };

    return (
        <div className="p-4 space-y-6">
            <header className="flex justify-between items-center bg-[#121214]/40 p-4 rounded-2xl border border-white/5">
                <div>
                    <h1 className="text-2xl font-headline font-bold text-white uppercase tracking-tight">AI2B <span className="text-primary italic">Catalog</span></h1>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{t('catalog.subtitle') || 'Premium Real Estate'}</p>
                </div>
                <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-[24px]">search</span>
                </div>
            </header>

            {/* Filters */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                {['all', 'rent', 'sale'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${filter === f ? 'bg-primary text-black shadow-[0_0_15px_rgba(208,188,255,0.4)]' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {f === 'all' ? t('catalog.all') || 'All' : f === 'rent' ? t('catalog.rent') || 'Rent' : t('catalog.sale') || 'Sale'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {units.map((unit) => (
                        <UnitCard key={unit.id} unit={unit} t={t} />
                    ))}
                </div>
            )}
        </div>
    );
}

function UnitCard({ unit, t }: any) {
    const photo = unit.photos?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';
    const city = unit.city || 'Alanya';
    const price = unit.type === 'rent' ? unit.price_month_eur : unit.price_eur;
    const title = unit.title?.ru || unit.title || 'Property Object';

    return (
        <div className="group bg-[#121214] rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all hover:border-primary/30">
            <div className="relative h-56 w-full">
                <Image 
                    src={photo} 
                    alt={title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                        {city}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 ${unit.type === 'rent' ? 'bg-blue-500/80 text-white' : 'bg-primary text-black'}`}>
                        {unit.type === 'rent' ? 'Rent' : 'Sale'}
                    </span>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                    <p className="text-primary text-lg font-headline font-bold">€{price?.toLocaleString()}</p>
                </div>
            </div>
            
            <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 uppercase tracking-widest">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {unit.address || 'Central District'}
                    </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1 text-zinc-400">
                            <span className="material-symbols-outlined text-[18px]">bed</span>
                            <span className="text-xs font-bold">{unit.bedrooms || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400">
                            <span className="material-symbols-outlined text-[18px]">bathtub</span>
                            <span className="text-xs font-bold">{unit.bathrooms || 1}</span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400">
                            <span className="material-symbols-outlined text-[18px]">square_foot</span>
                            <span className="text-xs font-bold">85m²</span>
                        </div>
                    </div>
                    
                    <button className="bg-white/5 hover:bg-primary hover:text-black p-2 rounded-xl border border-white/10 transition-all active:scale-90">
                        <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
