'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: {
        title: 'Управление Объектами',
        subtitle: 'База недвижимости',
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
        details: 'Детали объекта',
        location: 'Локация',
    },
    en: {
        title: 'Property Manager',
        subtitle: 'Real estate database',
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
        details: 'Property Details',
        location: 'Location',
    },
    tr: {
        title: 'Mülk Yönetimi',
        subtitle: 'Emlak veritabanı',
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
        details: 'Mülk Detayları',
        location: 'Konum',
    },
    de: {
        title: 'Objektverwaltung',
        subtitle: 'Immobiliendatenbank',
        addBtn: 'Hinzufügen',
        titleField: 'Objekttitel',
        city: 'Stadt',
        address: 'Adresse',
        price: 'Preis (€)',
        type: 'Typ',
        sale: 'Verkauf',
        rent: 'Miete',
        publish: 'VERÖFFENTLICHEN',
        empty: 'Noch keine Objekte. Fügen Sie das erste hinzu!',
        untitled: 'Unbenannt',
        details: 'Objektdetails',
        location: 'Standort',
    },
    es: {
        title: 'Gestión de Propiedades',
        subtitle: 'Base de datos inmobiliaria',
        addBtn: 'Añadir',
        titleField: 'Título de la Propiedad',
        city: 'Ciudad',
        address: 'Dirección',
        price: 'Precio (€)',
        type: 'Tipo',
        sale: 'Venta',
        rent: 'Alquiler',
        publish: 'PUBLICAR',
        empty: 'Aún no hay propiedades. ¡Añade la primera!',
        untitled: 'Sin título',
        details: 'Detalles de la Propiedad',
        location: 'Ubicación',
    },
    ar: {
        title: 'إدارة العقارات',
        subtitle: 'قاعدة بيانات العقارات',
        addBtn: 'إضافة',
        titleField: 'عنوان العقار',
        city: 'المدينة',
        address: 'العنوان',
        price: 'السعر (€)',
        type: 'النوع',
        sale: 'بيع',
        rent: 'إيجار',
        publish: 'نشر',
        empty: 'لا توجد عقارات بعد. أضف العقار الأول!',
        untitled: 'بدون عنوان',
        details: 'تفاصيل العقار',
        location: 'الموقع',
    },
    fr: {
        title: 'Gestion des Biens',
        subtitle: 'Base de données immobilière',
        addBtn: 'Ajouter',
        titleField: 'Titre du bien',
        city: 'Ville',
        address: 'Adresse',
        price: 'Prix (€)',
        type: 'Type',
        sale: 'Vente',
        rent: 'Location',
        publish: 'PUBLIER',
        empty: 'Aucun bien pour le moment. Ajoutez le premier !',
        untitled: 'Sans titre',
        details: 'Détails du bien',
        location: 'Localisation',
    },
};

export default function UnitsView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [langTab, setLangTab] = useState('ru');
    const [formData, setFormData] = useState<any>({
        title: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
        city: 'Alanya',
        address: '',
        price: '',
        unit_type: 'apartment',
        intent: 'sale',
        description: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
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
        if (!formData.title.ru || !formData.price) return;

        const payload = {
            title: formData.title,
            city: formData.city,
            address: formData.address,
            description: formData.description,
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
                title: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
                city: 'Alanya', 
                address: '', 
                price: '', 
                unit_type: 'apartment', 
                intent: 'sale', 
                description: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' } 
            });
            fetchUnits();
        }
    };

    const handleDelete = async (unit: any) => {
        if (!window.confirm('Удалить этот объект из базы?')) return;
        await supabase.from('units').delete().eq('id', unit.id);
        fetchUnits();
    };

    const toggleActive = async (unit: any) => {
        await supabase.from('units').update({ is_active: !unit.is_active }).eq('id', unit.id);
        fetchUnits();
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Add Toggle */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">{t.title}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">{t.subtitle}</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isAdding ? 'bg-zinc-800 text-white' : 'bg-primary text-black shadow-[0_0_20px_rgba(139,92,246,0.3)]'}`}
                >
                    <span className="material-symbols-outlined font-black">
                        {isAdding ? 'close' : 'add'}
                    </span>
                </button>
            </div>

            {/* Add Form - eSIM Inspired */}
            {isAdding && (
                <div className="glass-card bg-[#121214] p-5 rounded-[32px] border border-primary/20 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4">
                        {/* Lang Tabs for Form */}
                        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                            {['ru', 'en', 'tr', 'de', 'es', 'ar', 'fr'].map(l => (
                                <button
                                    key={l}
                                    onClick={() => setLangTab(l)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${langTab === l ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{t.details} ({langTab.toUpperCase()})</p>
                            <input
                                placeholder={`${t.titleField} (${langTab.toUpperCase()})`}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                value={formData.title[langTab] || ''}
                                onChange={e => {
                                    const newTitle = { ...formData.title, [langTab]: e.target.value };
                                    setFormData({ ...formData, title: newTitle });
                                }}
                            />
                            <textarea
                                placeholder={`Описание (${langTab.toUpperCase()})...`}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium min-h-[100px] resize-none"
                                value={formData.description[langTab] || ''}
                                onChange={e => {
                                    const newDesc = { ...formData.description, [langTab]: e.target.value };
                                    setFormData({ ...formData, description: newDesc });
                                }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-primary/30 appearance-none uppercase tracking-wider"
                                        value={formData.unit_type}
                                        onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                                    >
                                        <option value="apartment" className="bg-[#121214]">Квартира</option>
                                        <option value="land" className="bg-[#121214]">Участок</option>
                                        <option value="villa" className="bg-[#121214]">Вилла</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-zinc-600 pointer-events-none text-[18px]">expand_more</span>
                                </div>
                                <div className="relative">
                                    <select
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-primary/30 appearance-none uppercase tracking-wider"
                                        value={formData.intent}
                                        onChange={e => setFormData({ ...formData, intent: e.target.value })}
                                    >
                                        <option value="sale" className="bg-[#121214]">{t.sale}</option>
                                        <option value="rent" className="bg-[#121214]">{t.rent}</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-zinc-600 pointer-events-none text-[18px]">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{t.location} & {t.price}</p>
                            <div className="flex gap-2">
                                <input
                                    placeholder={t.city}
                                    className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                                <input
                                    placeholder={t.price}
                                    type="number"
                                    className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-emerald-400 font-black outline-none focus:border-primary/30 transition-all"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                            <input
                                placeholder={t.address}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.3)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
                    >
                        {t.publish}
                    </button>
                </div>
            )}

            {/* Units List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-white/[0.02] rounded-3xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            ) : units.length === 0 ? (
                <div className="flex flex-col items-center py-24 space-y-4 opacity-20">
                    <span className="material-symbols-outlined text-[64px] font-thin">holiday_village</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t.empty}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {units.map(unit => (
                        <div key={unit.id} className="glass-card bg-[#121214] p-3 rounded-3xl border border-white/5 flex items-center gap-4 group hover:border-primary/20 transition-all">
                            <div className="w-16 h-16 bg-surface-container-lowest rounded-2xl flex items-center justify-center overflow-hidden border border-outline-variant/10 flex-shrink-0 relative">
                                {unit.photos?.[0] ? (
                                    <img src={unit.photos[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                ) : (
                                    <span className="material-symbols-outlined text-zinc-700 text-[24px]">
                                        {unit.unit_type === 'apartment' ? 'apartment' : unit.unit_type === 'land' ? 'landscape' : 'villa'}
                                    </span>
                                )}
                                <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-[#121214] ${unit.is_active ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-zinc-100 truncate tracking-tight">
                                    {unit.title?.ru || unit.title || t.untitled}
                                </h3>
                                <div className="flex flex-col mt-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest truncate">{unit.city}</span>
                                        <span className="text-[9px] text-zinc-700">•</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${unit.intent === 'rent' ? 'text-amber-400' : 'text-blue-400'}`}>
                                            {unit.intent === 'rent' ? t.rent : t.sale}
                                        </span>
                                    </div>
                                    <p className="text-xs font-black text-emerald-400 mt-1">
                                        €{unit.price?.toLocaleString()}
                                        {unit.intent === 'rent' && <span className="text-[10px] text-zinc-600 font-bold ml-1 uppercase">/мес</span>}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 flex-shrink-0 pr-1">
                                <button
                                    onClick={() => toggleActive(unit)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${unit.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-zinc-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {unit.is_active ? 'visibility' : 'visibility_off'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => handleDelete(unit)}
                                    className="w-9 h-9 flex items-center justify-center bg-red-500/10 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 transition-all active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

