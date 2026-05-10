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
        locationField: 'Местоположение',
        locationPlaceholder: 'Район, улица, дом...',
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
        locationField: 'Location',
        locationPlaceholder: 'District, street, house...',
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
        locationField: 'Konum',
        locationPlaceholder: 'Mahalle, sokak, no...',
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
        locationField: 'Standort',
        locationPlaceholder: 'Stadtteil, Straße, Haus...',
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
        locationField: 'Ubicación',
        locationPlaceholder: 'Distrito, calle, casa...',
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
        locationField: 'الموقع',
        locationPlaceholder: 'المنطقة، الشارع، المنزل...',
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
        locationField: 'Emplacement',
        locationPlaceholder: 'Quartier, rue, maison...',
    },
};

const LAND_AMENITIES = [
    { id: 'electricity', icon: 'bolt', labels: { ru: 'Электричество', en: 'Electricity', tr: 'Elektrik', de: 'Strom', es: 'Electricidad', ar: 'كهرباء', fr: 'Électricité' } },
    { id: 'water', icon: 'water_drop', labels: { ru: 'Вода', en: 'Water', tr: 'Su', de: 'Wasser', es: 'Agua', ar: 'ماء', fr: 'Eau' } },
    { id: 'gas', icon: 'mode_fan', labels: { ru: 'Газ', en: 'Gas', tr: 'Gaz', de: 'Gas', es: 'Gas', ar: 'غاز', fr: 'Gaz' } },
    { id: 'road', icon: 'add_road', labels: { ru: 'Дорога', en: 'Road', tr: 'Yol', de: 'Straße', es: 'Camino', ar: 'طريق', fr: 'Route' } },
    { id: 'sea_view', icon: 'waves', labels: { ru: 'Вид на море', en: 'Sea View', tr: 'Deniz Manzarası', de: 'Meerblick', es: 'Vista al mar', ar: 'إطلالة на البحر', fr: 'Vue sur mer' } },
    { id: 'mountain_view', icon: 'terrain', labels: { ru: 'Вид на горы', en: 'Mountain View', tr: 'Dağ Manzarası', de: 'Bergblick', es: 'Vista a la montaña', ar: 'إطلالة على الجبال', fr: 'Vue sur montagne' } },
    { id: 'forest', icon: 'park', labels: { ru: 'Рядом лес', en: 'Near Forest', tr: 'Orman Yakını', de: 'Waldnähe', es: 'Cerca del bosque', ar: 'قرب الغابة', fr: 'Près de la forêt' } },
    { id: 'fence', icon: 'fence', labels: { ru: 'Забор', en: 'Fence', tr: 'Çit', de: 'Zaun', es: 'Valla', ar: 'سياج', fr: 'Clôture' } },
    { id: 'permit', icon: 'description', labels: { ru: 'Разрешение', en: 'Permit', tr: 'İmar İzni', de: 'Baugenehmigung', es: 'Permiso', ar: 'تصريح بناء', fr: 'Permis' } },
    { id: 'fruit_trees', icon: 'nature', labels: { ru: 'Сад/Деревья', en: 'Fruit Trees', tr: 'Meyve Ağaçları', de: 'Obstbäume', es: 'Frutales', ar: 'أшجار فاكهة', fr: 'Verger' } },
];

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
    { id: 'bbq', icon: 'outdoor_grill', labels: { ru: 'Барбекю', en: 'BBQ', tr: 'Mangal', de: 'Grillplatz', es: 'Barbacoa', ar: 'شواء', fr: 'Barbecue' } },
    { id: 'elevator', icon: 'elevator', labels: { ru: 'Лифт', en: 'Elevator', tr: 'Asansör', de: 'Aufzug', es: 'Ascensor', ar: 'مصعد', fr: 'Ascenseur' } },
    { id: 'heating', icon: 'thermostat', labels: { ru: 'Отопление', en: 'Heating', tr: 'Isıtma', de: 'Heizung', es: 'Calefacción', ar: 'تدفئة', fr: 'Chauffage' } },
    { id: 'dishwasher', icon: 'dishwasher_gen', labels: { ru: 'Посудомойка', en: 'Dishwasher', tr: 'Bulaşık Makinesi', de: 'Spülmaschine', es: 'Lavavajillas', ar: 'غسالة أطباق', fr: 'Lave-vaisselle' } },
    { id: 'washing_machine', icon: 'local_laundry_service', labels: { ru: 'Стиральная машина', en: 'Washing Machine', tr: 'Çamaşır Makinesi', de: 'Waschmaschine', es: 'Lavadora', ar: 'غسالة ملابس', fr: 'Lave-linge' } },
    { id: 'smart_home', icon: 'smart_toy', labels: { ru: 'Умный дом', en: 'Smart Home', tr: 'Akıllı Ev', de: 'Smart Home', es: 'Casa inteligente', ar: 'منزل ذки', fr: 'Maison intelligente' } },
    { id: 'terrace', icon: 'deck', labels: { ru: 'Терраса', en: 'Terrace', tr: 'Teras', de: 'Terrasse', es: 'Terraza', ar: 'تراس', fr: 'Terrasse' } },
];

export default function UnitsView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [langTab, setLangTab] = useState('ru');
    const [formData, setFormData] = useState<any>({
        title: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
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
        floor: '',
        total_floors: '',
        ada: '',
        parsel: '',
        density: '',
        height_limit: '',
        tags: [],
        photos: [],
        description: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
    });

    const [publishing, setPublishing] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [publishStatus, setPublishStatus] = useState('');

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
        const sourceText = formData.address;
        if (!sourceText) return alert(lang === 'ru' ? 'Введите адрес для перевода' : 'Enter address to translate');

        setTranslating(true);
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                body: JSON.stringify({ text: sourceText }),
            });
            const data = await res.json();
            if (data && typeof data === 'object') {
                setFormData({ 
                    ...formData, 
                    title: data,
                    description: Object.keys(data).reduce((acc: any, l) => {
                        acc[l] = ''; 
                        return acc;
                    }, {})
                });
            }
        } catch (err) {
            console.error('Translation failed:', err);
        } finally {
            setTranslating(false);
        }
    };

    const handleAdd = async () => {
        // 1. Validation Logic
        if (!formData.address) return alert(lang === 'ru' ? 'Укажите местоположение' : 'Specify location');
        
        if (formData.is_sale && !formData.price_sale) {
            return alert(lang === 'ru' ? 'Укажите цену продажи' : 'Specify sale price');
        }
        if (formData.is_rent && !formData.price_month && !formData.price_day) {
            return alert(lang === 'ru' ? 'Укажите цену аренды' : 'Specify rent price');
        }
        
        setPublishing(true);
        setPublishStatus('Подготовка данных...');
        
        try {
            // If title is not translated yet, use current address as RU title
            let finalTitle = formData.title;
            if (!finalTitle.ru) {
                finalTitle = { ...finalTitle, ru: formData.address };
            }

            const payload: any = {
                title: finalTitle,
                description: formData.description,
                city: formData.city,
                address: formData.address,
                district: formData.district || '',
                unit_type: formData.unit_type,
                intent: [formData.is_sale && 'sale', formData.is_rent && 'rent'].filter(Boolean).join(','),
                price: parseFloat(formData.price_sale || formData.price_month || formData.price_day || '0'),
                price_sale: formData.is_sale ? parseFloat(formData.price_sale || '0') : null,
                price_month: formData.is_rent ? parseFloat(formData.price_month || '0') : null,
                price_day: formData.is_rent ? parseFloat(formData.price_day || '0') : null,
                price_period: formData.is_rent && !formData.is_sale ? (formData.price_month ? 'month' : 'day') : 'total',
                bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
                living_rooms: formData.living_rooms ? parseInt(formData.living_rooms) : null,
                bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
                area: formData.area ? parseFloat(formData.area) : null,
                floor: formData.floor ? parseInt(formData.floor) : null,
                total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
                ada: formData.ada || null,
                parsel: formData.parsel || null,
                density: formData.density ? parseFloat(formData.density) : null,
                height_limit: formData.height_limit ? parseFloat(formData.height_limit) : null,
                tags: formData.tags,
                photos: formData.photos,
                is_active: true,
                i18n: Object.keys(finalTitle).reduce((acc: any, l) => {
                    acc[l] = { 
                        title: finalTitle[l as keyof typeof finalTitle], 
                        description: formData.description[l as keyof typeof formData.description] || '' 
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
                    title: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
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
                    floor: '',
                    total_floors: '',
                    tags: [],
                    photos: [],
                    description: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' }
                });
                fetchUnits();
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed');
        } finally {
            setPublishing(false);
            setPublishStatus('');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setPublishing(true);
        setPublishStatus('Загрузка фото...');
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
        setPublishing(false);
        setPublishStatus('');
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

            {/* Add Form */}
            {isAdding && (
                <div className="p-0 space-y-0 pb-32">
                        {/* 0. Tabs Section (Top Screen Switcher) */}
                        <div className="flex bg-zinc-900 border-b border-white/5 sticky top-0 z-20">
                            <button 
                                onClick={() => setFormData({ ...formData, unit_type: 'apartment' })}
                                className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1 ${formData.unit_type === 'apartment' ? 'text-primary bg-primary/5' : 'text-zinc-600'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">apartment</span>
                                {lang === 'ru' ? 'КВАРТИРА' : 'APARTMENT'}
                                {formData.unit_type === 'apartment' && <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(208,188,255,0.5)]" />}
                            </button>
                            <button 
                                onClick={() => setFormData({ ...formData, unit_type: 'land' })}
                                className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center gap-1 ${formData.unit_type === 'land' ? 'text-primary bg-primary/5' : 'text-zinc-600'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">landscape</span>
                                {lang === 'ru' ? 'УЧАСТОК' : 'LAND'}
                                {formData.unit_type === 'land' && <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(208,188,255,0.5)]" />}
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* 1. Location Section */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{t.locationField}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder={t.city}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                            />
                            <input
                                placeholder={t.locationPlaceholder}
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:border-primary/30 transition-all font-medium col-span-2"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value, district: '' })}
                            />
                        </div>
                    </div>

                    {/* 2. Photo Section (Below Location) */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{lang === 'ru' ? 'Фотографии' : 'Photos'}</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <label className="flex-shrink-0 w-20 h-20 bg-white/[0.03] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                                <span className="material-symbols-outlined text-outline">add_a_photo</span>
                                <input 
                                    type="file" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFileUpload} 
                                />
                            </label>
                            {formData.photos.map((p: string, i: number) => (
                                <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden group">
                                    <img src={p} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_:any,idx:any) => idx !== i)})}
                                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Intent & Prices Section */}
                    <div className="space-y-4 p-5 bg-white/[0.02] rounded-[32px] border border-white/5">
                        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-white/5">
                            <button 
                                onClick={() => setFormData({ ...formData, is_sale: true, is_rent: false })}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.is_sale ? 'bg-primary text-on-primary shadow-lg' : 'text-outline'}`}
                            >
                                {t.sale}
                            </button>
                            <button 
                                onClick={() => setFormData({ ...formData, is_sale: false, is_rent: true })}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.is_rent ? 'bg-primary text-on-primary shadow-lg' : 'text-outline'}`}
                            >
                                {t.rent}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {formData.is_sale && (
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-outline uppercase tracking-widest px-1">{lang === 'ru' ? 'Цена продажи' : 'Sale Price'}</p>
                                    <input
                                        type="number"
                                        placeholder="€ 0.00"
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-lg font-black text-white outline-none focus:border-primary/30"
                                        value={formData.price_sale}
                                        onChange={e => setFormData({ ...formData, price_sale: e.target.value })}
                                    />
                                </div>
                            )}
                            {formData.is_rent && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-outline uppercase tracking-widest px-1">{lang === 'ru' ? 'Месяц' : 'Monthly'}</p>
                                        <input
                                            type="number"
                                            placeholder="€ /мес"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary/30"
                                            value={formData.price_month}
                                            onChange={e => setFormData({ ...formData, price_month: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-outline uppercase tracking-widest px-1">{lang === 'ru' ? 'День' : 'Daily'}</p>
                                        <input
                                            type="number"
                                            placeholder="€ /день"
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-primary/30"
                                            value={formData.price_day}
                                            onChange={e => setFormData({ ...formData, price_day: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Details Section (Auto-translation of Location) */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{lang === 'ru' ? 'Перевод местоположения' : 'Location Translation'}</p>
                            <div className="flex bg-white/[0.02] p-1 rounded-xl border border-white/5">
                                {['ru', 'en', 'tr'].map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setLangTab(l)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${langTab === l ? 'bg-white/10 text-white' : 'text-zinc-600'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={handleAutoTranslate}
                                disabled={translating || !formData.address}
                                className="w-full py-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30"
                            >
                                <span className="material-symbols-outlined text-[18px]">{translating ? 'sync' : 'translate'}</span>
                                {translating ? (lang === 'ru' ? 'ПЕРЕВОД...' : 'TRANSLATING...') : (lang === 'ru' ? 'ПЕРЕВЕСТИ АДРЕС НА ВСЕ ЯЗЫКИ' : 'TRANSLATE ADDRESS TO ALL LANGUAGES')}
                            </button>
                            <p className="text-[8px] text-center text-zinc-600 font-bold uppercase tracking-wider">
                                {lang === 'ru' ? 'Название и описание теперь формируются автоматически' : 'Title and description are now generated automatically'}
                            </p>
                        </div>
                    </div>

                    {/* 5. Characteristics Section */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{lang === 'ru' ? 'Характеристики' : 'Characteristics'}</p>
                        
                        {formData.unit_type === 'apartment' ? (
                            <>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: lang === 'ru' ? 'Спальни' : 'Beds', key: 'bedrooms', icon: 'bed' },
                                        { label: lang === 'ru' ? 'Гостиные' : 'Living', key: 'living_rooms', icon: 'chair' },
                                        { label: lang === 'ru' ? 'Ванные' : 'Baths', key: 'bathrooms', icon: 'bathtub' },
                                        { label: lang === 'ru' ? 'М²' : 'M²', key: 'area', icon: 'square_foot' }
                                    ].map((item) => (
                                        <div key={item.key} className="bg-white/[0.02] border border-white/5 rounded-2xl p-2 flex flex-col items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px] text-outline">{item.icon}</span>
                                            <span className="text-[8px] font-black text-zinc-600 uppercase">{item.label}</span>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-center text-xs font-black text-white outline-none"
                                                value={formData[item.key as keyof typeof formData]}
                                                onChange={e => setFormData({ ...formData, [item.key]: e.target.value })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-outline">layers</span>
                                            <span className="text-[10px] font-black text-zinc-500 uppercase">{lang === 'ru' ? 'Этаж' : 'Floor'}</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-12 bg-transparent text-right text-sm font-black text-white outline-none"
                                            value={formData.floor}
                                            onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                        />
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-outline">apartment</span>
                                            <span className="text-[10px] font-black text-zinc-500 uppercase">{lang === 'ru' ? 'Всего эт.' : 'Total Floors'}</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-12 bg-transparent text-right text-sm font-black text-white outline-none"
                                            value={formData.total_floors}
                                            onChange={e => setFormData({ ...formData, total_floors: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[24px] text-primary">square_foot</span>
                                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{lang === 'ru' ? 'Общая площадь (м²)' : 'Total Area (m²)'}</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-24 bg-transparent text-right text-lg font-black text-primary outline-none"
                                        placeholder="0"
                                        value={formData.area}
                                        onChange={e => setFormData({ ...formData, area: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 6. Amenities Section */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">{lang === 'ru' ? 'Удобства (теги)' : 'Amenities (tags)'}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(formData.unit_type === 'apartment' ? AMENITIES : LAND_AMENITIES).map((item) => {
                                const isSelected = formData.tags.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            const newTags = isSelected
                                                ? formData.tags.filter((t: string) => t !== item.id)
                                                : [...formData.tags, item.id];
                                            setFormData({ ...formData, tags: newTags });
                                        }}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all active:scale-95 ${
                                            isSelected
                                                ? 'bg-primary/20 border-primary text-primary shadow-lg'
                                                : 'bg-white/[0.02] border-white/5 text-zinc-500 hover:border-white/10'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                            {item.labels[lang as keyof typeof item.labels] || item.labels.ru}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={publishing}
                        className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.3)] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {publishing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                <span>{publishStatus || 'Загрузка...'}</span>
                            </>
                        ) : (
                            t.publish
                        )}
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
                                    {unit.tags && unit.tags.length > 0 && (
                                        <div className="mt-2">
                                            <TagsRow tags={unit.tags} lang={lang} />
                                        </div>
                                    )}
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

function TagsRow({ tags, lang }: { tags: string[], lang: string }) {
    const [expanded, setExpanded] = useState(false);
    const visibleTags = expanded ? tags : tags.slice(0, 3); // Even more compact for admin list
    const hasMore = tags.length > 3;

    return (
        <div className="flex flex-wrap gap-1">
            {visibleTags.map((tagId: string) => {
                const amenity = AMENITIES.find(a => a.id === tagId);
                if (!amenity) return null;
                return (
                    <div 
                        key={tagId} 
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.03] border border-white/5 rounded-md text-[8px] font-bold text-zinc-500 uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[10px]">{amenity.icon}</span>
                        <span>{amenity.labels[lang as keyof typeof amenity.labels] || amenity.labels.ru}</span>
                    </div>
                );
            })}
            {hasMore && !expanded && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                    className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-[8px] font-black text-primary uppercase"
                >
                    +{tags.length - 3}
                </button>
            )}
        </div>
    );
}

