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
    const [isAdding, setIsAdding] = useState(false);
    const [langTab, setLangTab] = useState('ru');
    const [formData, setFormData] = useState<any>({
        title: '',
        city: 'Alanya',
        district: '',
        address: '',
        price_sale: '',
        price_month: '',
        price_day: '',
        unit_type: 'apartment',
        is_sale: true,
        is_rent: false,
        bedrooms: '',
        living_rooms: '',
        bathrooms: '',
        area: '',
        photos: [],
        description: '',
    });

    const [translating, setTranslating] = useState(false);

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

    const handleAutoTranslate = async () => {
        if (!formData.title.ru) return;
        setTranslating(true);
        try {
            // Translate Title
            const resTitle = await fetch('/api/translate', {
                method: 'POST',
                body: JSON.stringify({ text: formData.title.ru })
            });
            const translatedTitles = await resTitle.json();

            // Translate Description
            let translatedDescs = formData.description;
            if (formData.description.ru) {
                const resDesc = await fetch('/api/translate', {
                    method: 'POST',
                    body: JSON.stringify({ text: formData.description.ru })
                });
                translatedDescs = await resDesc.json();
            }

            setFormData({
                ...formData,
                title: { ...formData.title, ...translatedTitles },
                description: { ...formData.description, ...translatedDescs }
            });
        } catch (err) {
            console.error('Auto-translate failed:', err);
            alert('AI Translation failed. Please try again.');
        } finally {
            setTranslating(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.title || !formData.price) return;
        
        setTranslating(true);
        try {
            // Auto-translate title and description in parallel
            const [transTitle, transDesc] = await Promise.all([
                fetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: formData.title }) }).then(r => r.json()),
                formData.description 
                    ? fetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: formData.description }) }).then(r => r.json())
                    : Promise.resolve({})
            ]);

            const payload = {
                title: transTitle.ru || formData.title,
                city: formData.city,
                address: formData.address,
                description: transDesc.ru || formData.description,
                unit_type: formData.unit_type,
                intent: [formData.is_sale && 'sale', formData.is_rent && 'rent'].filter(Boolean).join(','),
                price: parseFloat(formData.price_sale || formData.price_month || formData.price_day || '0'),
                price_sale: formData.is_sale ? parseFloat(formData.price_sale || '0') : null,
                price_month: formData.is_rent ? parseFloat(formData.price_month || '0') : null,
                price_day: formData.is_rent ? parseFloat(formData.price_day || '0') : null,
                price_period: formData.is_rent && !formData.is_sale ? 'month' : 'total',
                bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
                living_rooms: formData.living_rooms ? parseInt(formData.living_rooms) : null,
                bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
                area: formData.area ? parseFloat(formData.area) : null,
                photos: formData.photos,
                is_active: true,
                i18n: Object.keys(transTitle).reduce((acc: any, l) => {
                    acc[l] = { 
                        title: transTitle[l], 
                        description: transDesc[l] || '' 
                    };
                    return acc;
                }, {})
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
                    district: '',
                    address: '', 
                    price_sale: '',
                    price_month: '',
                    price_day: '',
                    unit_type: 'apartment', 
                    is_sale: true, 
                    is_rent: false, 
                    bedrooms: '',
                    living_rooms: '',
                    bathrooms: '',
                    area: '',
                    photos: [],
                    description: '' 
                });
                fetchUnits();
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed');
        } finally {
            setTranslating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setTranslating(true); // Reuse translating as loading state for simplicity
        const newPhotos = [...formData.photos];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `units/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            newPhotos.push(publicUrl);
        }

        setFormData({ ...formData, photos: newPhotos });
        setTranslating(false);
    };

    const removePhoto = (url: string) => {
        setFormData({ ...formData, photos: formData.photos.filter((p: string) => p !== url) });
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
                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{t.details}</p>
                            <input
                                placeholder={t.titleField}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                            <textarea
                                placeholder="Описание объекта..."
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium min-h-[100px] resize-none"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-zinc-600 pointer-events-none text-[18px]">expand_more</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_sale: !formData.is_sale })}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${formData.is_sale ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-zinc-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{formData.is_sale ? 'check_circle' : 'circle'}</span>
                                        {t.sale}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_rent: !formData.is_rent })}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${formData.is_rent ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/5 text-zinc-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{formData.is_rent ? 'check_circle' : 'circle'}</span>
                                        {t.rent}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{t.location}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    placeholder={t.city}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                                <input
                                    placeholder="Район / Махалле"
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                />
                                <input
                                    placeholder={t.address}
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium col-span-2"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Features / Tags */}
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Характеристики</p>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black pl-1">Спальни</label>
                                    <input type="number" placeholder="0" className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black pl-1">Гостиные</label>
                                    <input type="number" placeholder="0" className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" value={formData.living_rooms} onChange={e => setFormData({...formData, living_rooms: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black pl-1">Ванные</label>
                                    <input type="number" placeholder="0" className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-black pl-1">Площадь (м²)</label>
                                    <input type="number" placeholder="0" className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-bold text-primary" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Стоимость (€)</p>
                            <div className="space-y-2">
                                {formData.is_sale && (
                                    <div className="relative">
                                        <input
                                            placeholder="Цена продажи"
                                            type="number"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-emerald-400 font-black outline-none focus:border-primary/30 transition-all pl-12"
                                            value={formData.price_sale}
                                            onChange={e => setFormData({ ...formData, price_sale: e.target.value })}
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-3 text-zinc-600 text-[18px]">sell</span>
                                    </div>
                                )}
                                {formData.is_rent && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <input
                                                placeholder="Цена / мес"
                                                type="number"
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-amber-400 font-black outline-none focus:border-primary/30 transition-all pl-12"
                                                value={formData.price_month}
                                                onChange={e => setFormData({ ...formData, price_month: e.target.value })}
                                            />
                                            <span className="material-symbols-outlined absolute left-4 top-3 text-zinc-600 text-[18px]">calendar_month</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                placeholder="Цена / сут"
                                                type="number"
                                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-amber-400 font-black outline-none focus:border-primary/30 transition-all pl-12"
                                                value={formData.price_day}
                                                onChange={e => setFormData({ ...formData, price_day: e.target.value })}
                                            />
                                            <span className="material-symbols-outlined absolute left-4 top-3 text-zinc-600 text-[18px]">today</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Photo Upload Section */}
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Фотографии объекта</p>
                            <div className="grid grid-cols-4 gap-2">
                                {formData.photos.map((p: string) => (
                                    <div key={p} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                                        <img src={p} className="w-full h-full object-cover" alt="" />
                                        <button 
                                            onClick={() => removePhoto(p)}
                                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    <span className="material-symbols-outlined text-zinc-500 text-[20px]">add_a_photo</span>
                                    <span className="text-[8px] text-zinc-600 font-bold uppercase mt-1">Добавить</span>
                                </label>
                            </div>
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
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${unit.intent?.includes('rent') ? 'text-amber-400' : 'text-blue-400'}`}>
                                            {unit.intent?.includes('rent') && unit.intent?.includes('sale') ? `${t.rent} & ${t.sale}` : unit.intent?.includes('rent') ? t.rent : t.sale}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                        {unit.price_sale && (
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] text-emerald-500">sell</span>
                                                <span className="text-[11px] font-black text-emerald-400">€{unit.price_sale.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {unit.price_month && (
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] text-amber-500">calendar_month</span>
                                                <span className="text-[11px] font-black text-amber-400">€{unit.price_month.toLocaleString()}</span>
                                                <span className="text-[8px] text-zinc-600 font-bold uppercase">/мес</span>
                                            </div>
                                        )}
                                        {unit.price_day && (
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] text-amber-500">today</span>
                                                <span className="text-[11px] font-black text-amber-400">€{unit.price_day.toLocaleString()}</span>
                                                <span className="text-[8px] text-zinc-600 font-bold uppercase">/сут</span>
                                            </div>
                                        )}
                                    </div>
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

