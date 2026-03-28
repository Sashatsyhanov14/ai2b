"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, DollarSign, Home, Building2, Map as MapIcon } from "lucide-react";
import UploadImage from "@/components/UploadImage";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n";

const RESIDENTIAL_TAGS = [
  {
    name: "Удобства",
    tags: ["pool", "parking", "gas", "security", "fitness", "sauna", "playground", "wifi", "smart_home", "air_conditioning"],
  },
  {
    name: "Вид и расположение",
    tags: ["near_sea", "sea_view", "city_center", "near_school", "new_building", "mountain_view", "quiet_area"],
  },
  {
    name: "Состояние",
    tags: ["furnished", "renovated", "whitebox", "shell", "high_ceiling"],
  },
  {
    name: "Юридические",
    tags: ["residence_permit", "citizenship", "tapu_ready"],
  }
];

const COMMERCIAL_TAGS = [
  {
    name: "Тип объекта",
    tags: ["office", "shop", "warehouse", "restaurant", "hotel", "factory", "showroom"],
  },
  {
    name: "Характеристики",
    tags: ["high_power", "loading_dock", "high_ceiling", "open_space", "mezzanine", "exhaust_system"],
  },
  {
    name: "Инфраструктура",
    tags: ["parking", "security", "fiber_optics", "fire_safety", "reception", "elevators"],
  }
];

const LAND_TAGS = [
  {
    name: "Назначение (Имaр)",
    tags: ["residential_land", "commercial_land", "agricultural_land", "tourism_land", "industrial_land"],
  },
  {
    name: "Коммуникации",
    tags: ["electricity", "water", "natural_gas", "road_access", "sewage", "fiber_optics"],
  },
  {
    name: "Особенности",
    tags: ["sea_view", "mountain_view", "flat_land", "sloped_land", "corner_plot"],
  }
];

export default function PropertyForm({ initialData }: { initialData?: any }) {
  const { t } = useI18n();
  const router = useRouter();

  const [category, setCategory] = useState<'sale' | 'rent' | 'commercial' | 'land'>(initialData?.category || 'sale');
  const [isForSale, setIsForSale] = useState(initialData?.price ? true : initialData?.category !== 'rent');
  const [isForRent, setIsForRent] = useState(initialData?.category === 'rent' || !!initialData?.price_per_day);

  const [form, setForm] = useState({
    district: initialData?.district || "",
    city: initialData?.city || "Alanya",
    address: initialData?.address || "",
    rooms: initialData?.rooms || "1",
    floor: initialData?.floor || "",
    floors_total: initialData?.floors_total || "",
    area_m2: initialData?.area_m2 || "",
    price: initialData?.price || "",
    price_per_day: initialData?.price_per_day || "",
    price_per_month: initialData?.price_per_month || "",
    bedrooms: initialData?.bedrooms || "",
    bathrooms: initialData?.bathrooms || "",
    max_guests: initialData?.max_guests || "",
    description: initialData?.description || "",
    ai_instructions: initialData?.ai_instructions || "",
  });

  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.features || []);
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        category: isForRent && !isForSale ? 'rent' : category, // If only rent, use rent category
        features: selectedTags,
        photos: photos,
        // Ensure numbers
        rooms: form.rooms ? String(form.rooms) : null,
        price: form.price ? Number(form.price) : null,
        price_per_day: form.price_per_day ? Number(form.price_per_day) : null,
        price_per_month: form.price_per_month ? Number(form.price_per_month) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
      };

      const url = initialData?.id ? `/api/units/${initialData.id}` : "/api/units";
      const method = initialData?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Ошибка сохранения");
      }

      router.back();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getTitle = () => {
    if (category === 'rent') return "Добавить аренду";
    if (category === 'commercial') return "Добавить коммерцию";
    if (category === 'land') return "Добавить участок";
    return "Добавить продажу";
  };

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 py-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="h-9 w-9 flex items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50">
              <ChevronLeft className="h-5 w-5 text-neutral-400" />
            </button>
            <h1 className="text-xl font-semibold text-white">
              {initialData ? "Редактировать" : "Добавить объект"}
            </h1>
          </div>
          
          {/* Spacer to keep alignment if needed, or just let it empty */}

        </div>
      </div>

      <form onSubmit={submit} className="px-4 space-y-8">
        {/* Category Icons */}
        <section className="flex justify-center gap-4">
           {[
             { id: 'sale', label: 'Квартира', icon: Home },
             { id: 'commercial', label: 'Коммерция', icon: Building2 },
             { id: 'land', label: 'Участок', icon: MapIcon },
           ].map((item) => (
             <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id as any)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all w-24 ${
                  category === item.id ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 
                  'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
             >
                <item.icon className={`h-6 w-6 ${category === item.id ? 'text-emerald-400' : 'text-neutral-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
             </button>
           ))}
        </section>
        {/* Фото */}
        <section className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Фото объекта</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-800">
                <img src={url} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter(p => p !== url))} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-600">×</button>
              </div>
            ))}
            <UploadImage ownerUid="public" entity="units" entityId="new" onUploaded={(url) => setPhotos([...photos, url])} multiple label="+" />
          </div>
        </section>

        {/* HERO SECTION: District, Area, Floor */}
        <section className="bg-neutral-900/50 rounded-[40px] border border-neutral-800 p-8 shadow-2xl space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">Город</label>
                <input value={form.city} onChange={e => update('city', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 shadow-inner" placeholder="Alanya" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">
                  {category === 'land' ? 'Местоположение / Район' : 'Район'}
                </label>
                <input value={form.district} onChange={e => update('district', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 shadow-inner" placeholder={category === 'land' ? 'Напр: Gazipaşa / Koru' : 'Mahmutlar'} />
              </div>
           </div>
           
           <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">
                {category === 'land' ? 'Ада / Парсель (Ada/Parsel)' : 'Точный адрес'}
              </label>
              <input 
                value={form.address} 
                onChange={e => update('address', e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-medium outline-none focus:border-emerald-500 shadow-inner" 
                placeholder={category === 'land' ? 'Например: 102 / 5' : 'Улица, дом, номер квартиры...'} 
              />
           </div>

           <div className={`grid grid-cols-1 md:grid-cols-${category === 'land' ? '1' : '3'} gap-6 pt-4`}>
              <div className="p-6 rounded-3xl bg-neutral-950/40 border border-neutral-800 flex flex-col items-center gap-2 group hover:border-neutral-700 transition-colors">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Общая площадь (м²)</label>
                <input type="number" value={form.area_m2} onChange={e => update('area_m2', e.target.value)} className="w-full bg-transparent border-0 text-center text-3xl font-black text-white outline-none placeholder:text-neutral-800" placeholder="0" />
              </div>
              {category !== 'land' && (
                <>
                  <div className="p-6 rounded-3xl bg-neutral-950/40 border border-neutral-800 flex flex-col items-center gap-2 group hover:border-neutral-700 transition-colors">
                    <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Этаж</label>
                    <input type="number" value={form.floor} onChange={e => update('floor', e.target.value)} className="w-full bg-transparent border-0 text-center text-3xl font-black text-white outline-none placeholder:text-neutral-800" placeholder="0" />
                  </div>
                  <div className="p-6 rounded-3xl bg-neutral-950/40 border border-neutral-800 flex flex-col items-center gap-2 group hover:border-neutral-700 transition-colors">
                    <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Всего этажей</label>
                    <input type="number" value={form.floors_total} onChange={e => update('floors_total', e.target.value)} className="w-full bg-transparent border-0 text-center text-3xl font-black text-white outline-none placeholder:text-neutral-800" placeholder="0" />
                  </div>
                </>
              )}
           </div>
        </section>

        {/* PRICE MODULES SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* SALE CARD */}
           <div className={`p-8 rounded-[40px] border transition-all duration-500 ${isForSale ? 'bg-emerald-500/5 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.05)] scale-100' : 'bg-neutral-900 border-neutral-800 opacity-40 grayscale-[0.5] scale-[0.98]'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${isForSale ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                      <DollarSign className="h-5 w-5" />
                   </div>
                   <h3 className={`text-sm font-black tracking-widest uppercase ${isForSale ? 'text-emerald-400' : 'text-neutral-500'}`}>Продажа</h3>
                </div>
                <button type="button" onClick={() => setIsForSale(!isForSale)} className={`w-12 h-6 rounded-full transition-all relative ${isForSale ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isForSale ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Цена продажи (€)</label>
                <input 
                  type="number" 
                  disabled={!isForSale}
                  value={form.price} 
                  onChange={e => update('price', e.target.value)} 
                  className={`w-full bg-transparent border-0 px-0 py-2 text-4xl font-black outline-none transition-colors ${isForSale ? 'text-emerald-400' : 'text-neutral-800'}`} 
                  placeholder="0" 
                />
              </div>
           </div>

           {/* RENT CARD */}
           <div className={`p-8 rounded-[40px] border transition-all duration-500 ${isForRent ? 'bg-emerald-500/5 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.05)] scale-100' : 'bg-neutral-900 border-neutral-800 opacity-40 grayscale-[0.5] scale-[0.98]'}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${isForRent ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                      <Home className="h-5 w-5" />
                   </div>
                   <h3 className={`text-sm font-black tracking-widest uppercase ${isForRent ? 'text-emerald-400' : 'text-neutral-500'}`}>Аренда</h3>
                </div>
                <button type="button" onClick={() => setIsForRent(!isForRent)} className={`w-12 h-6 rounded-full transition-all relative ${isForRent ? 'bg-emerald-600' : 'bg-neutral-700'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isForRent ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Сутки (€)</label>
                  <input 
                    type="number" 
                    disabled={!isForRent}
                    value={form.price_per_day} 
                    onChange={e => update('price_per_day', e.target.value)} 
                    className={`w-full bg-transparent border-0 px-0 py-2 text-3xl font-black outline-none transition-colors ${isForRent ? 'text-white' : 'text-neutral-800'}`} 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Месяц (€)</label>
                  <input 
                    type="number" 
                    disabled={!isForRent}
                    value={form.price_per_month} 
                    onChange={e => update('price_per_month', e.target.value)} 
                    className={`w-full bg-transparent border-0 px-0 py-2 text-3xl font-black outline-none transition-colors ${isForRent ? 'text-white' : 'text-neutral-800'}`} 
                    placeholder="0" 
                  />
                </div>
              </div>
           </div>
        </section>

        {/* DETAILS SECTION: Rooms, Bedrooms, etc. - Only for Homes and Commercial (if applicable) */}
        {category !== 'land' && (
          <section className="bg-neutral-900/30 rounded-[40px] border border-neutral-800 p-8">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-6 px-1">Детали объекта</h2>
            <div className="grid grid-cols-3 gap-6">
               <div className="space-y-2">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">Помещения</label>
                <input value={form.rooms} onChange={e => update('rooms', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white text-center font-bold outline-none focus:border-emerald-500 shadow-inner" placeholder="1+1" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">{category === 'commercial' ? 'Санузлы' : 'Спальни'}</label>
                <input type="number" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white text-center font-bold outline-none focus:border-emerald-500 shadow-inner" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-neutral-500 uppercase font-black tracking-widest px-1">Гардеробные / кладовые</label>
                <input type="number" value={form.max_guests} onChange={e => update('max_guests', e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white text-center font-bold outline-none focus:border-emerald-500 shadow-inner" placeholder="0" />
              </div>
            </div>
          </section>
        )}

        {/* Теги */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest">Особенности и удобства</h2>
            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
              Выбрано: {selectedTags.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {(category === 'land' ? LAND_TAGS : category === 'commercial' ? COMMERCIAL_TAGS : RESIDENTIAL_TAGS).map((cat) => (
              <div key={cat.name} className="space-y-4 bg-neutral-900/20 p-6 rounded-[32px] border border-neutral-800/50">
                <h3 className="text-[10px] text-neutral-400 uppercase font-black tracking-widest px-1 flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  {cat.name}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {cat.tags.map(tag => (
                    <button 
                      key={tag} 
                      type="button" 
                      onClick={() => toggleTag(tag)} 
                      className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 border flex items-center gap-2.5 shadow-sm active:scale-95 ${
                        selectedTags.includes(tag) 
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.2)] scale-[1.02] z-10" 
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${selectedTags.includes(tag) ? 'bg-white scale-125' : 'bg-neutral-700'}`} />
                      {t(`sales.tags.${tag}` as any) || tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Описание */}
        <section className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] text-neutral-500 uppercase font-bold">Описание для клиентов (необязательно)</label>
             <textarea value={form.description} onChange={e => update('description', e.target.value)} className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 resize-none text-sm" placeholder="Напишите всё, что важно знать об объекте..." />
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 md:relative md:p-0 md:bg-transparent md:border-0">
          {error && <div className="mb-3 text-red-400 text-xs text-center">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg">
            {loading ? "Сохранение..." : "Сохранить объект"}
          </Button>
        </div>
      </form>
    </div>
  );
}
