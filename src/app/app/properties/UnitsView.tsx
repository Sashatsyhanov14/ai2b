'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Управление Объектами',
        addBtn: 'Добавить',
        titleField: 'Название объекта',
        city: 'Город',
        address: 'Адрес',
        price: 'Цена (€)',
        type: 'Тип',
        sale: 'Продажа',
        rent: 'Аренда',
        publish: 'ОПУБЛИКОВАТЬ',
        empty: 'Объектов пока нет. Добавьте первый!',
        untitled: 'Без названия',
    },
    en: {
        title: 'Property Manager',
        addBtn: 'Add',
        titleField: 'Property Title',
        city: 'City',
        address: 'Address',
        price: 'Price (€)',
        type: 'Type',
        sale: 'For Sale',
        rent: 'For Rent',
        publish: 'PUBLISH',
        empty: 'No properties yet. Add the first one!',
        untitled: 'Untitled',
    },
    tr: {
        title: 'Mülk Yönetimi',
        addBtn: 'Ekle',
        titleField: 'Mülk Başlığı',
        city: 'Şehir',
        address: 'Adres',
        price: 'Fiyat (€)',
        type: 'Tür',
        sale: 'Satılık',
        rent: 'Kiralık',
        publish: 'YAYINLA',
        empty: 'Henüz mülk yok. İlkini ekleyin!',
        untitled: 'İsimsiz',
    },
};

export default function UnitsView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        city: 'Alanya',
        address: '',
        price: '',
        unit_type: 'apartment',
        intent: 'sale',
        description: '',
    });

    useEffect(() => { fetchUnits(); }, []);

    const fetchUnits = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setUnits(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!formData.title || !formData.price) return;

        const payload = {
            title: { ru: formData.title },
            city: formData.city,
            address: formData.address,
            description: { ru: formData.description },
            unit_type: formData.unit_type,
            intent: formData.intent,
            price: parseFloat(formData.price),
            price_period: formData.intent === 'rent' ? 'month' : 'total',
            is_active: true,
        };

        const { error } = await supabase.from('units').insert(payload);
        
        if (error) {
            console.error('Add failed:', error);
            alert('Error: ' + error.message);
        } else {
            setIsAdding(false);
            setFormData({ 
                title: '', 
                city: 'Alanya', 
                address: '', 
                price: '', 
                unit_type: 'apartment', 
                intent: 'sale', 
                description: '' 
            });
            fetchUnits();
        }
    };

    const handleDelete = async (unit: any) => {
        if (!window.confirm('Delete object?')) return;
        await supabase.from('units').delete().eq('id', unit.id);
        fetchUnits();
    };

    const toggleActive = async (unit: any) => {
        await supabase.from('units').update({ is_active: !unit.is_active }).eq('id', unit.id);
        fetchUnits();
    };

    return (
        <div className="space-y-5 pb-8">
            {/* Header */}
            <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400">apartment</span>
                    {t.title}
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-violet-500 text-black p-2.5 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                >
                    <span className="material-symbols-outlined text-[20px]">{isAdding ? 'close' : 'add'}</span>
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-[#121214] p-5 rounded-3xl border border-violet-500/20 space-y-4">
                    <input
                        placeholder={t.titleField}
                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white w-full outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/50 appearance-none"
                            value={formData.unit_type}
                            onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                        >
                            <option value="apartment" className="bg-[#121214]">Квартира</option>
                            <option value="land" className="bg-[#121214]">Участок</option>
                            <option value="invest" className="bg-[#121214]">Проект</option>
                            <option value="villa" className="bg-[#121214]">Вилла</option>
                        </select>
                        <select
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/50 appearance-none"
                            value={formData.intent}
                            onChange={e => setFormData({ ...formData, intent: e.target.value })}
                        >
                            <option value="sale" className="bg-[#121214]">{t.sale}</option>
                            <option value="rent" className="bg-[#121214]">{t.rent}</option>
                        </select>
                    </div>
                    <input
                        placeholder={t.price}
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <input
                            placeholder={t.city}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                        />
                        <input
                            placeholder={t.address}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="w-full bg-violet-500 text-black font-bold py-4 rounded-2xl shadow-[0_5px_20px_rgba(139,92,246,0.2)] active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
                    >
                        {t.publish}
                    </button>
                </div>
            )}

            {/* Units List */}
            {units.length === 0 && !loading ? (
                <div className="flex flex-col items-center py-16 space-y-4">
                    <span className="material-symbols-outlined text-zinc-700 text-[48px]">domain_add</span>
                    <p className="text-sm text-zinc-600 font-medium">{t.empty}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {units.map(unit => (
                        <div key={unit.id} className="bg-[#121214] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0">
                                {unit.photos?.[0] ? (
                                    <img src={unit.photos[0]} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <span className="material-symbols-outlined text-zinc-700">image</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-zinc-100 truncate">
                                    {unit.title?.ru || unit.title || t.untitled}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                        {unit.city} • {unit.unit_type === 'apartment' ? 'Квартира' : unit.unit_type === 'land' ? 'Участок' : unit.unit_type === 'invest' ? 'Проект' : 'Вилла'} ({unit.intent === 'rent' ? t.rent : t.sale})
                                    </span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${unit.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                </div>
                                <p className="text-xs font-bold text-emerald-400 mt-1">
                                    €{unit.price?.toLocaleString()}
                                    {unit.category === 'rent' && <span className="text-zinc-500 font-normal">/мес</span>}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => toggleActive(unit)}
                                    className={`p-1.5 rounded-lg border transition-all ${unit.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-600'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {unit.is_active ? 'visibility' : 'visibility_off'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleDelete(unit)}
                                    className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
