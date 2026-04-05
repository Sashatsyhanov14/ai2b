'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n';

export default function UnitsView() {
    const { t } = useI18n();
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        city: 'Alanya',
        address: '',
        price: '',
        type: 'sale', // rent or sale
        description: ''
    });

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        setLoading(true);
        const { data: rentals } = await supabase.from('rental_units').select('*');
        const { data: sales } = await supabase.from('sale_properties').select('*');
        
        let all: any[] = [];
        if (rentals) all = [...all, ...rentals.map(r => ({ ...r, category: 'rent' }))];
        if (sales) all = [...all, ...sales.map(s => ({ ...s, category: 'sale' }))];
        
        setUnits(all.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!formData.title || !formData.price) return;
        
        const payload = {
            title: { ru: formData.title },
            city: formData.city,
            address: formData.address,
            description: formData.description,
            is_active: true
        };

        if (formData.type === 'rent') {
            await supabase.from('rental_units').insert({ 
                ...payload, 
                price_month_eur: parseFloat(formData.price) 
            });
        } else {
            await supabase.from('sale_properties').insert({ 
                ...payload, 
                price_eur: parseFloat(formData.price),
                slug: `unit-${Date.now()}` 
            });
        }

        setIsAdding(false);
        setFormData({ title: '', city: 'Alanya', address: '', price: '', type: 'sale', description: '' });
        fetchUnits();
    };

    return (
        <div className="p-4 space-y-6 pb-32">
            <header className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <h1 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">apartment</span>
                    Units Editor
                </h1>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-primary text-black p-2 rounded-xl transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined">{isAdding ? 'close' : 'add'}</span>
                </button>
            </header>

            {isAdding && (
                <div className="glass-card p-6 rounded-3xl bg-[#121214] border border-primary/20 space-y-4 animate-in slide-in-from-top duration-300">
                    <div className="space-y-4">
                        <input 
                            placeholder="Object Title (e.g. Luxury Villa 3+1)"
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white w-full outline-none focus:border-primary/50 transition-all"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                        <div className="flex gap-2">
                            <select 
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/50 transition-all appearance-none"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                            >
                                <option value="sale" className="bg-[#121214]">For Sale</option>
                                <option value="rent" className="bg-[#121214]">For Rent</option>
                            </select>
                            <input 
                                placeholder="Price (€)"
                                type="number"
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/50 transition-all"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: e.target.value})}
                            />
                        </div>
                        <input 
                            placeholder="Address"
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white w-full outline-none focus:border-primary/50 transition-all"
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                        <button 
                            onClick={handleAdd}
                            className="w-full bg-primary text-black font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all mt-2"
                        >
                            PUBLISH OBJECT
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {units.map(unit => (
                    <div key={unit.id} className="bg-[#121214] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/5">
                            {unit.photos?.[0] ? (
                                <img src={unit.photos[0]} className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-zinc-700">image</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-zinc-100 truncate">{unit.title?.ru || unit.title || 'Untitled'}</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{unit.city} • {unit.category === 'rent' ? 'Rent' : 'Sale'}</p>
                            <p className="text-xs font-bold text-primary mt-1">€{(unit.price_eur || unit.price_month_eur)?.toLocaleString()}</p>
                        </div>
                        <button className="text-zinc-600 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
