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
    de: {
        title: 'Katalog',
        subtitle: 'Premium-Immobilien',
        all: 'Alle',
        rent: 'Miete',
        sale: 'Kauf',
        invest: 'Projekte',
        noResults: 'Noch keine Objekte. Die besten Angebote folgen in Kürze!',
        perMonth: '/Mon',
        rooms: 'Zi.',
        askBot: 'Bot fragen',
        searchPlaceholder: 'Stadt oder Adresse suchen...',
    },
    es: {
        title: 'Catálogo',
        subtitle: 'Inmuebles Premium',
        all: 'Todos',
        rent: 'Alquiler',
        sale: 'Venta',
        invest: 'Nuevas obras',
        noResults: 'Aún no hay propiedades. ¡Pronto estarán aquí las mejores ofertas!',
        perMonth: '/mes',
        rooms: 'hab.',
        askBot: 'Preguntar al bot',
        searchPlaceholder: 'Buscar ciudad o dirección...',
    },
    ar: {
        title: 'الكتالوج',
        subtitle: 'عقارات فاخرة',
        all: 'الكل',
        rent: 'إيجار',
        sale: 'بيع',
        invest: 'مشاريع جديدة',
        noResults: 'لا توجد عقارات بعد. أفضل العروض ستتوفر قريباً!',
        perMonth: '/شهر',
        rooms: 'غرف',
        askBot: 'اسأل البوت',
        searchPlaceholder: 'البحث حسب المدينة أو العنوان...',
    },
    fr: {
        title: 'Catalogue',
        subtitle: 'Immobilier de Prestige',
        all: 'Tous',
        rent: 'Location',
        sale: 'Vente',
        invest: 'Neuf',
        noResults: 'Aucune propriété pour le moment. Les meilleures offres arrivent bientôt !',
        perMonth: '/mois',
        rooms: 'pces',
        askBot: 'Demander au bot',
        searchPlaceholder: 'Rechercher ville ou adresse...',
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
            .ilike('intent', `%${intentFilter}%`)
            .order('created_at', { ascending: false });
        
        if (dbUnits) {
            allUnits = dbUnits;
        }

        setUnits(allUnits);
        setLoading(false);
    };

    const [bookingUnit, setBookingUnit] = useState<any>(null);
    const [bookingAction, setBookingAction] = useState<'book_now' | 'ask_about'>('book_now');
    const [phone, setPhone] = useState('');

    const handleAskBot = (unit: any) => {
        setBookingAction('ask_about');
        setBookingUnit(unit);
    };

    const handleBookNow = (unit: any) => {
        setBookingAction('book_now');
        setBookingUnit(unit);
    };

    const submitLead = () => {
        const tg = window.Telegram?.WebApp;
        if (!phone) {
            tg?.showAlert(lang === 'ru' ? 'Пожалуйста, введите номер телефона' : 'Please enter your phone number');
            return;
        }

        const title = bookingUnit.title?.ru || bookingUnit.title || 'Property';
        if (tg) {
            tg.sendData(JSON.stringify({ 
                action: bookingAction, 
                unit_id: bookingUnit.id, 
                title,
                phone: phone
            }));
            tg.close();
        }
    };

    return (
        <div className="space-y-5">
            {/* Search Bar - MD3 Style */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px] font-black">search</span>
                </div>
                <input 
                    type="text"
                    placeholder={tr.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-12 shadow-lg"
                />
            </div>

            {/* Type Filter Chips */}
            <div className="flex gap-2 p-1 bg-surface-container-high rounded-2xl border border-white/5">
                {[
                    { id: 'apartment', label: 'Квартиры', icon: 'apartment' },
                    { id: 'land', label: 'Участки', icon: 'landscape' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all duration-300 active:scale-95 ${
                            filter === f.id
                                ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(208,188,255,0.3)]'
                                : 'text-outline hover:text-on-background'
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
                        const getTitle = (title: any) => {
                            if (typeof title === 'string') return title;
                            if (typeof title === 'object' && title !== null) {
                                return title[lang] || title.en || title.ru || '';
                            }
                            return '';
                        };
                        const titleStr = getTitle(u.i18n?.[lang]?.title || u.title);
                        const cityStr = (u.i18n?.[lang]?.city || u.city || '').toString();
                        const addrStr = (u.i18n?.[lang]?.address || u.address || '').toString();
                        
                        return cityStr.toLowerCase().includes(q) || 
                               addrStr.toLowerCase().includes(q) || 
                               titleStr.toLowerCase().includes(q);
                    }).map((unit) => (
                        <PropertyCard
                            key={unit.id}
                            unit={unit}
                            tr={tr}
                            lang={lang}
                            onAskBot={() => handleAskBot(unit)}
                            onBookNow={() => handleBookNow(unit)}
                        />
                    ))}
                </div>
            )}

            {/* Lead Generation Modal */}
            {bookingUnit && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setBookingUnit(null)} />
                    <div className="relative w-full max-w-sm glass-card border border-primary/20 p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-[32px]">contact_phone</span>
                            </div>
                            <h4 className="text-xl font-black text-on-background">{lang === 'ru' ? 'Контактные данные' : 'Contact Details'}</h4>
                            <p className="text-[10px] text-outline font-bold uppercase tracking-widest">{lang === 'ru' ? 'Введите ваш номер телефона для связи' : 'Enter your phone number for contact'}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-outline uppercase tracking-widest pl-1">{lang === 'ru' ? 'Телефон (WhatsApp)' : 'Phone (WhatsApp)'}</label>
                                <input
                                    type="tel"
                                    placeholder="+7 (___) ___-__-__"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    autoFocus
                                    className="input-field text-center text-lg tracking-wider"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setBookingUnit(null)}
                                className="btn-secondary flex-1"
                            >
                                {lang === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
                            </button>
                            <button
                                onClick={submitLead}
                                className="btn-primary flex-1 shadow-[0_10px_20px_rgba(208,188,255,0.3)]"
                            >
                                {lang === 'ru' ? 'ОТПРАВИТЬ' : 'SEND'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PropertyCard({ unit, tr, lang, onAskBot, onBookNow }: any) {
    const photo = unit.photos?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800';
    
    const getLocalized = (val: any, l: string) => {
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val !== null) {
            return val[l] || val.en || val.ru || Object.values(val)[0] || '';
        }
        return '';
    };

    const title = unit.i18n?.[lang]?.title || getLocalized(unit.title, lang) || 'Property';
    const city = unit.i18n?.[lang]?.city || getLocalized(unit.city, lang) || 'Alanya';
    const description = unit.i18n?.[lang]?.description || getLocalized(unit.description, lang);
    const price = unit.price;
    const isRent = unit.intent?.includes('rent');
    const isSale = unit.intent?.includes('sale');
    const isInvest = unit.unit_type === 'invest';

    return (
        <div className="group glass-card rounded-2xl !p-0 overflow-hidden animate-fade-in shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            {/* Image */}
            <div className="relative h-64 w-full overflow-hidden">
                <img
                    src={photo}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

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
                        {isRent && isSale ? `${tr.rent} & ${tr.sale}` : isRent ? tr.rent : tr.sale}
                    </p>
                    <p className="text-white text-3xl font-black tracking-tighter">
                        €{price?.toLocaleString()}
                        {isRent && !isSale && <span className="text-sm text-zinc-500 font-bold ml-1">{tr.perMonth}</span>}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
                <div>
                    <h3 className="text-xl font-black text-on-background leading-tight tracking-tight">{title}</h3>
                    <p className="text-xs text-outline mt-2 font-bold uppercase tracking-wider line-clamp-1">
                        {unit.i18n?.[lang]?.address || unit.address || city}
                    </p>
                </div>

                {/* Quick Stats & CTA */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-4">
                        {unit.bedrooms != null && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-outline">bed</span>
                                <span className="text-[10px] font-black text-outline-variant mt-1">{unit.bedrooms}</span>
                            </div>
                        )}
                        {(unit.bathrooms || unit.living_rooms) && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-outline">bathtub</span>
                                <span className="text-[10px] font-black text-outline-variant mt-1">{unit.bathrooms || unit.living_rooms || 1}</span>
                            </div>
                        )}
                        {unit.rooms && (
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-[20px] text-outline">meeting_room</span>
                                <span className="text-[10px] font-black text-outline-variant mt-1">{unit.rooms}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onAskBot}
                            className="btn-secondary !p-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                        </button>
                        <button
                            onClick={onBookNow}
                            className="btn-primary !py-3 !px-5"
                        >
                            <span className="material-symbols-outlined text-[16px] font-black">shopping_cart_checkout</span>
                            {lang === 'ru' ? 'КУПИТЬ' : 'BOOK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
