'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const t: Record<string, Record<string, string>> = {
    ru: {
        title: 'Каталог',
        subtitle: 'Emedeo',
        all: 'Все',
        rent: 'Аренда',
        sale: 'Продажа',
        invest: 'Новостройки',
        noResults: 'Объектов пока нет. Скоро здесь появятся лучшие предложения!',
        perMonth: '/мес',
        rooms: 'комн.',
        askBot: 'Спросить бота',
        searchPlaceholder: 'Поиск по городу или адресу...',
        apartments: 'Квартиры',
        land: 'Участки',
    },
    en: {
        title: 'Catalog',
        subtitle: 'Emedeo',
        all: 'All',
        rent: 'Rent',
        sale: 'Sale',
        invest: 'Off-plan',
        noResults: 'No properties yet. Best offers are coming soon!',
        perMonth: '/mo',
        rooms: 'rooms',
        askBot: 'Ask bot',
        searchPlaceholder: 'Search city or address...',
        apartments: 'Apartments',
        land: 'Land',
    },
    tr: {
        title: 'Katalog',
        subtitle: 'Emedeo',
        all: 'Tümü',
        rent: 'Kiralık',
        sale: 'Satılık',
        invest: 'Projeler',
        noResults: 'Henüz mülk yok. En iyi teklifler yakında burada!',
        perMonth: '/ay',
        rooms: 'oda',
        askBot: 'Bota sor',
        searchPlaceholder: 'Şehir veya adres ara...',
        apartments: 'Daireler',
        land: 'Arsalar',
    },
    de: {
        title: 'Katalog',
        subtitle: 'Emedeo',
        all: 'Alle',
        rent: 'Miete',
        sale: 'Kauf',
        invest: 'Projekte',
        noResults: 'Noch keine Objekte. Die besten Angebote folgen in Kürze!',
        perMonth: '/Mon',
        rooms: 'Zi.',
        askBot: 'Bot fragen',
        searchPlaceholder: 'Stadt oder Adresse suchen...',
        apartments: 'Wohnungen',
        land: 'Grundstücke',
    },
    es: {
        title: 'Catálogo',
        subtitle: 'Emedeo',
        all: 'Todos',
        rent: 'Alquiler',
        sale: 'Venta',
        invest: 'Nuevas obras',
        noResults: 'Aún no hay propiedades. ¡Pronto estarán aquí las mejores ofertas!',
        perMonth: '/mes',
        rooms: 'hab.',
        askBot: 'Preguntar al bot',
        searchPlaceholder: 'Buscar ciudad o dirección...',
        apartments: 'Apartamentos',
        land: 'Terrenos',
    },
    ar: {
        title: 'الكتالوج',
        subtitle: 'Emedeo',
        all: 'الكل',
        rent: 'إيجار',
        sale: 'بيع',
        invest: 'مشاريع جديدة',
        noResults: 'لا توجد عقارات بعد. أفضل العروض ستتوفر قريباً!',
        perMonth: '/شهر',
        rooms: 'غرف',
        askBot: 'اسأل البوت',
        searchPlaceholder: 'البحث حسب المدينة أو العنوان...',
        apartments: 'شقق',
        land: 'أراضي',
    },
    fr: {
        title: 'Catalogue',
        subtitle: 'Emedeo',
        all: 'Tous',
        rent: 'Location',
        sale: 'Vente',
        invest: 'Neuf',
        noResults: 'Aucune propriété pour le moment. Les meilleures offres arrivent bientôt !',
        perMonth: '/mois',
        rooms: 'pces',
        askBot: 'Demander au bot',
        searchPlaceholder: 'Rechercher ville ou adresse...',
        apartments: 'Appartements',
        land: 'Terrains',
    },
};

const AMENITIES = [
    { id: 'pool', icon: 'pool', labels: { ru: 'Бассейн', en: 'Pool', tr: 'Havuz', de: 'Pool', es: 'Piscina', ar: 'مسبح', fr: 'Piscine' } },
    { id: 'gym', icon: 'fitness_center', labels: { ru: 'Спортзал', en: 'Gym', tr: 'Spor Salonu', de: 'Fitness', es: 'Gimnasio', ar: 'نادي رياضي', fr: 'Salle de sport' } },
    { id: 'parking', icon: 'local_parking', labels: { ru: 'Парковка', en: 'Parking', tr: 'Otopark', de: 'Parkplatz', es: 'Parking', ar: 'موقف سيارات', fr: 'Parking' } },
    { id: 'sea_view', icon: 'waves', labels: { ru: 'Вид на море', en: 'Sea View', tr: 'Deniz Manzarası', de: 'Meerblick', es: 'Vista al mar', ar: 'إطلالة على البحر', fr: 'Vue sur mer' } },
    { id: 'garden', icon: 'yard', labels: { ru: 'Сад', en: 'Garden', tr: 'Bahçe', de: 'Garten', es: 'Jardín', ar: 'حديقة', fr: 'Jardin' } },
    { id: 'security', icon: 'security', labels: { ru: 'Охрана', en: 'Security', tr: 'Güvenlik', de: 'Sicherheit', es: 'Seguridad', ar: 'أمن', fr: 'Sécurité' } },
    { id: 'furniture', icon: 'chair', labels: { ru: 'Мебель', en: 'Furniture', tr: 'Mobilya', de: 'Möbel', es: 'Muebles', ar: 'أثاث', fr: 'Meubles' } },
    { id: 'ac', icon: 'ac_unit', labels: { ru: 'Кондиционер', en: 'AC', tr: 'Klima', de: 'Klimaanlage', es: 'Aire acondicionado', ar: 'تكييف', fr: 'Climatisation' } },
    { id: 'wifi', icon: 'wifi', labels: { ru: 'Wi-Fi', en: 'Wi-Fi', tr: 'Wi-Fi', de: 'WLAN', es: 'Wi-Fi', ar: 'واي فاي', fr: 'Wi-Fi' } },
    { id: 'balcony', icon: 'balcony', labels: { ru: 'Балкон', en: 'Balcony', tr: 'Balkon', de: 'Balkon', es: 'Balcón', ar: 'شرفة', fr: 'Balcon' } },
    { id: 'sauna', icon: 'hot_tub', labels: { ru: 'Сауна', en: 'Sauna', tr: 'Sauna', de: 'Sauna', es: 'Sauna', ar: 'سونا', fr: 'Sauna' } },
    { id: 'hamam', icon: 'bathtub', labels: { ru: 'Хамам', en: 'Hamam', tr: 'Hamam', de: 'Hamam', es: 'Hamam', ar: 'حمام تركي', fr: 'Hamman' } },
    { id: 'playground', icon: 'child_care', labels: { ru: 'Детская площадка', en: 'Playground', tr: 'Çocuk Parkı', de: 'Spielplatz', es: 'Parque infantil', ar: 'ملعب أطفال', fr: 'Aire de jeux' } },
    { id: 'bbq', icon: 'outdoor_grill', labels: { ru: 'Барбекю', en: 'BBQ', tr: 'Mangal', de: 'Grillplatz', es: 'Barbacoa', ar: 'шواء', fr: 'Barbecue' } },
    { id: 'elevator', icon: 'elevator', labels: { ru: 'Лифт', en: 'Elevator', tr: 'Asansör', de: 'Aufzug', es: 'Ascensor', ar: 'مصعد', fr: 'Ascenseur' } },
    { id: 'heating', icon: 'thermostat', labels: { ru: 'Отопление', en: 'Heating', tr: 'Isıtma', de: 'Heizung', es: 'Calefacción', ar: 'تدفئة', fr: 'Chauffage' } },
    { id: 'dishwasher', icon: 'dishwasher_gen', labels: { ru: 'Посудомойка', en: 'Dishwasher', tr: 'Bulaşık Makinesi', de: 'Spülmaschine', es: 'Lavavajillas', ar: 'غسالة أطباق', fr: 'Lave-vaisselle' } },
    { id: 'washing_machine', icon: 'local_laundry_service', labels: { ru: 'Стиральная машина', en: 'Washing Machine', tr: 'Çamaшыр Makinesi', de: 'Waschmaschine', es: 'Lavadora', ar: 'غسالة ملابس', fr: 'Lave-linge' } },
    { id: 'smart_home', icon: 'smart_toy', labels: { ru: 'Умный дом', en: 'Smart Home', tr: 'Akıllı Ev', de: 'Smart Home', es: 'Casa intelligente', ar: 'منزل ذكي', fr: 'Maison intelligente' } },
    { id: 'terrace', icon: 'deck', labels: { ru: 'Терраса', en: 'Terrace', tr: 'Teras', de: 'Terrasse', es: 'Terraza', ar: 'تراس', fr: 'Terrasse' } },
];

const LAND_AMENITIES = [
    { id: 'electricity', icon: 'bolt', labels: { ru: 'Электричество', en: 'Electricity', tr: 'Elektrik', de: 'Strom', es: 'Electricidad', ar: 'كهرباء', fr: 'Électricité' } },
    { id: 'water', icon: 'water_drop', labels: { ru: 'Вода', en: 'Water', tr: 'Su', de: 'Wasser', es: 'Agua', ar: 'ماء', fr: 'Eau' } },
    { id: 'gas', icon: 'mode_fan', labels: { ru: 'Газ', en: 'Gas', tr: 'Gaz', de: 'Gas', es: 'Gas', ar: 'غاز', fr: 'Gaz' } },
    { id: 'road', icon: 'add_road', labels: { ru: 'Дорога', en: 'Road', tr: 'Yol', de: 'Straße', es: 'Camino', ar: 'طريق', fr: 'Route' } },
    { id: 'sea_view', icon: 'waves', labels: { ru: 'Вид на море', en: 'Sea View', tr: 'Deniz Manzarası', de: 'Meerblick', es: 'Vista al mar', ar: 'إطلالة на البحر', fr: 'Vue sur mer' } },
    { id: 'mountain_view', icon: 'terrain', labels: { ru: 'Вид на горы', en: 'Mountain View', tr: 'Dağ Manzarası', de: 'Bergblick', es: 'Vista a la montaña', ar: 'إطلالة на الجبال', fr: 'Vue sur montagne' } },
    { id: 'forest', icon: 'park', labels: { ru: 'Рядом лес', en: 'Near Forest', tr: 'Orman Yakını', de: 'Waldnähe', es: 'Cerca del bosque', ar: 'قرب الغابة', fr: 'Près de la forêt' } },
    { id: 'fence', icon: 'fence', labels: { ru: 'Забор', en: 'Fence', tr: 'Çit', de: 'Zaun', es: 'Valla', ar: 'سياج', fr: 'Clôture' } },
    { id: 'permit', icon: 'description', labels: { ru: 'Разрешение', en: 'Permit', tr: 'İmar İzni', de: 'Baugenehmigung', es: 'Permiso', ar: 'تصريح بناء', fr: 'Permis' } },
    { id: 'fruit_trees', icon: 'nature', labels: { ru: 'Сад/Деревья', en: 'Fruit Trees', tr: 'Meyve Ağaçları', de: 'Obstbäume', es: 'Frutales', ar: 'أشجار فاكهة', fr: 'Verger' } },
];

const ALL_AMENITIES = [...AMENITIES, ...LAND_AMENITIES];

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
        const tg = (window as any).Telegram?.WebApp;
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
            {/* Search Bar */}
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
                    { id: 'apartment', label: tr.apartments, icon: 'apartment' },
                    { id: 'land', label: tr.land, icon: 'landscape' }
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

            {/* Intent Filter */}
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
                        const keywords = q.split(' ').filter(k => k.length > 0);
                        if (keywords.length === 0) return true;

                        const titleStr = getTitle(u.i18n?.[lang]?.title || u.title).toLowerCase();
                        const cityStr = (u.i18n?.[lang]?.city || u.city || '').toString().toLowerCase();
                        const addrStr = (u.i18n?.[lang]?.address || u.address || '').toString().toLowerCase();
                        
                        const unitTags = (u.tags || []).map((tagId: string) => {
                            const amenity = ALL_AMENITIES.find(a => a.id === tagId);
                            return amenity ? (amenity.labels[lang as keyof typeof amenity.labels] || amenity.labels.ru).toLowerCase() : '';
                        });

                        return keywords.every(kw => 
                            titleStr.includes(kw) || 
                            cityStr.includes(kw) || 
                            addrStr.includes(kw) ||
                            unitTags.some((t: string) => t.includes(kw))
                        );
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

            {/* Lead Modal */}
            {bookingUnit && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setBookingUnit(null)} />
                    <div className="relative w-full max-w-sm glass-card border border-primary/20 p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-[32px]">contact_phone</span>
                            </div>
                            <h4 className="text-xl font-black text-on-background">{lang === 'ru' ? 'Контактные данные' : 'Contact Details'}</h4>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="tel"
                                placeholder="+7 (___) ___-__-__"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="input-field text-center text-lg tracking-wider"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setBookingUnit(null)} className="btn-secondary flex-1">
                                {lang === 'ru' ? 'ОТМЕНА' : 'CANCEL'}
                            </button>
                            <button onClick={submitLead} className="btn-primary flex-1">
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
    
    return (
        <div className="group glass-card rounded-2xl !p-0 overflow-hidden animate-fade-in shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
            <div className="relative h-64 w-full overflow-hidden">
                <img src={photo} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                <div className="absolute top-5 left-5">
                    <div className="bg-black/60 backdrop-blur-xl px-4 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/10">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{unit.district ? `${city}, ${unit.district}` : city}</span>
                    </div>
                </div>
                <div className="absolute bottom-6 left-6 flex flex-col gap-1">
                    {unit.price_sale && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-white text-3xl font-black tracking-tighter">€{unit.price_sale.toLocaleString()}</span>
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">{tr.sale}</span>
                        </div>
                    )}
                    <div className="flex gap-4">
                        {unit.price_month && (
                            <div className="flex flex-col">
                                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">{tr.rent} ({lang === 'ru' ? 'мес' : 'mo'})</span>
                                <span className="text-white text-xl font-black tracking-tighter">€{unit.price_month.toLocaleString()}</span>
                            </div>
                        )}
                        {unit.price_day && (
                            <div className="flex flex-col">
                                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">{tr.rent} ({lang === 'ru' ? 'сут' : 'day'})</span>
                                <span className="text-white text-xl font-black tracking-tighter">€{unit.price_day.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                <div>
                    <h3 className="text-xl font-black text-on-background leading-tight tracking-tight">{title}</h3>
                    <p className="text-xs text-outline mt-2 font-bold uppercase tracking-wider line-clamp-1">
                        {unit.i18n?.[lang]?.address || unit.address || city}
                    </p>
                </div>

                {unit.tags && unit.tags.length > 0 && (
                    <TagsRow tags={unit.tags} lang={lang} />
                )}

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-4">
                        {unit.unit_type === 'land' ? (
                            <>
                                {unit.area != null && (
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-outlined text-[20px] text-primary">square_foot</span>
                                        <span className="text-[10px] font-black text-outline-variant mt-1">{unit.area} м²</span>
                                    </div>
                                )}
                                {unit.ada && (
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black text-primary">ADA</span>
                                        <span className="text-[10px] font-black text-outline-variant mt-1">{unit.ada}</span>
                                    </div>
                                )}
                                {unit.parsel && (
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black text-primary">PARSEL</span>
                                        <span className="text-[10px] font-black text-outline-variant mt-1">{unit.parsel}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {(unit.bedrooms != null || unit.living_rooms != null) && (
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-outlined text-[20px] text-outline">bed</span>
                                        <span className="text-[10px] font-black text-outline-variant mt-1">{unit.bedrooms || 0}+{unit.living_rooms || 0}</span>
                                    </div>
                                )}
                                {unit.area != null && (
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-outlined text-[20px] text-outline">square_foot</span>
                                        <span className="text-[10px] font-black text-outline-variant mt-1">{unit.area} м²</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onAskBot} className="btn-secondary !p-3">
                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                        </button>
                        <button onClick={onBookNow} className="btn-primary !py-3 !px-5">
                            <span className="material-symbols-outlined text-[16px] font-black">shopping_cart_checkout</span>
                            {lang === 'ru' ? 'КУПИТЬ' : 'BOOK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TagsRow({ tags, lang }: { tags: string[], lang: string }) {
    const [expanded, setExpanded] = useState(false);
    const visibleTags = expanded ? tags : tags.slice(0, 4);
    const hasMore = tags.length > 4;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((tagId: string) => {
                    const amenity = ALL_AMENITIES.find(a => a.id === tagId);
                    if (!amenity) return null;
                    return (
                        <div key={tagId} className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[9px] font-bold text-outline-variant uppercase tracking-wider whitespace-nowrap">
                            <span className="material-symbols-outlined text-[12px]">{amenity.icon}</span>
                            <span>{amenity.labels[lang as keyof typeof amenity.labels] || amenity.labels.ru}</span>
                        </div>
                    );
                })}
                {hasMore && !expanded && (
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(true); }} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[9px] font-black text-primary uppercase tracking-wider">
                        +{tags.length - 4}
                    </button>
                )}
            </div>
        </div>
    );
}
