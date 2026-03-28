"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, DollarSign, Home, Building2, Map as MapIcon } from "lucide-react";
import UploadImage from "@/components/UploadImage";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n";

const COMMON_TAGS = [
  "near_sea", "sea_view", "pool", "parking", "gas", "security", "fitness", "sauna",
  "playground", "near_school", "city_center", "furnished", "residence_permit",
  "citizenship", "renovated", "whitebox", "shell", "new_building",
];

export default function PropertyForm({ initialData }: { initialData?: any }) {
  const { t } = useI18n();
  const router = useRouter();

  const [category, setCategory] = useState<'sale' | 'rent' | 'commercial' | 'land'>(initialData?.category || 'sale');
  const [isForSale, setIsForSale] = useState(initialData?.price ? true : initialData?.category !== 'rent');
  const [isForRent, setIsForRent] = useState(initialData?.category === 'rent' || !!initialData?.price_per_day);

  const [form, setForm] = useState({
    title: initialData?.title || "",
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
          
          {/* Dual Transaction Selector - Multi-Choice Style */}
          <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden relative gap-1">
            <button 
              type="button"
              onClick={() => {
                if (isForSale && isForRent) setIsForSale(false); // Can't unselect all
                else setIsForSale(true);
              }}
              className={`relative z-10 px-6 py-2 rounded-xl text-xs font-black tracking-widest transition-all duration-300 ${isForSale ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
            >
              ПРОДАЖА
            </button>
            <button 
              type="button"
              onClick={() => {
                if (isForSale && isForRent) setIsForRent(false); // Can't unselect all
                else setIsForRent(true);
              }}
              className={`relative z-10 px-6 py-2 rounded-xl text-xs font-black tracking-widest transition-all duration-300 ${isForRent ? 'bg-emerald-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}
            >
              АРЕНДА
            </button>
          </div>
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
                disabled={isForRent && !isForSale && item.id !== 'sale'}
                onClick={() => setCategory(item.id as any)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all w-24 ${
                  isForRent && !isForSale && item.id !== 'sale' ? 'opacity-20 cursor-not-allowed grayscale' :
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

        {/* Основная инфо */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 uppercase font-bold">Город</label>
              <input value={form.city} onChange={e => update('city', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" placeholder="Alanya" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 uppercase font-bold">Адрес</label>
              <input value={form.address} onChange={e => update('address', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500" placeholder="Mahmutlar, 25. Sk" />
            </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 p-6 rounded-[40px] border transition-all ${isForSale && isForRent ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-neutral-900 border-neutral-800'}`}>
            {isForSale && (
              <div className="p-5 rounded-3xl bg-neutral-950/50 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="h-10 w-10 text-emerald-500" /></div>
                <div className={`space-y-1 transition-all ${form.price ? 'opacity-100 scale-100' : 'opacity-70 scale-[0.98]'}`}>
                  <label className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest">Общая цена (€)</label>
                  <input type="number" value={form.price} onChange={e => update('price', e.target.value)} className="w-full bg-transparent border-0 px-0 py-1 text-emerald-400 text-3xl font-black outline-none placeholder:text-neutral-800" placeholder="0" />
                </div>
              </div>
            )}

            {isForRent && (
              <div className="grid grid-cols-2 gap-4 p-5 rounded-3xl bg-neutral-950/50 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="h-10 w-10 text-emerald-500" /></div>
                <div className={`space-y-1 transition-all ${form.price_per_day ? 'opacity-100 scale-100' : 'opacity-70 scale-[0.98]'}`}>
                  <label className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest">Цена / Сутки (€)</label>
                  <input type="number" value={form.price_per_day} onChange={e => update('price_per_day', e.target.value)} className="w-full bg-transparent border-0 px-0 py-1 text-white text-3xl font-black outline-none placeholder:text-neutral-800" placeholder="0" />
                </div>
                <div className={`space-y-1 transition-all ${form.price_per_month ? 'opacity-100 scale-100' : 'opacity-70 scale-[0.98]'}`}>
                  <label className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest">Цена / Месяц (€)</label>
                  <input type="number" value={form.price_per_month} onChange={e => update('price_per_month', e.target.value)} className="w-full bg-transparent border-0 px-0 py-1 text-white text-3xl font-black outline-none placeholder:text-neutral-800" placeholder="0" />
                </div>
              </div>
            )}
            
            <div className={`p-5 rounded-3xl transition-all border md:col-span-2 lg:col-span-2 ${form.area_m2 ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950/30 border-neutral-800'} relative overflow-hidden`}>
               <div className="absolute top-0 right-0 p-2 opacity-5"><Building2 className="h-10 w-10 text-white" /></div>
               <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-black tracking-widest text-center block">Общая площадь объекта (м²)</label>
                  <input type="number" value={form.area_m2} onChange={e => update('area_m2', e.target.value)} className="w-full bg-transparent border-0 px-0 py-1 text-white text-4xl font-black outline-none placeholder:text-neutral-800 text-center" placeholder="0" />
               </div>
            </div>
          </div>

          {category === 'sale' && (
            <div className="grid grid-cols-3 gap-4">
               <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">Комнаты</label>
                <input value={form.rooms} onChange={e => update('rooms', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-center outline-none focus:border-emerald-500" placeholder="1+1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">Спальни</label>
                <input type="number" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-center outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold">Гости (max)</label>
                <input type="number" value={form.max_guests} onChange={e => update('max_guests', e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-center outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}
        </section>

        {/* Теги */}
        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Особенности</h2>
          <div className="flex flex-wrap gap-2">
            {COMMON_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-4 py-2 rounded-full text-xs transition-all border ${selectedTags.includes(tag) ? "bg-emerald-600 border-emerald-500 text-white" : "bg-neutral-900 border-neutral-800 text-neutral-400"}`}>
                {t(`sales.tags.${tag}` as any) || tag}
              </button>
            ))}
          </div>
        </section>

        {/* Описание */}
        <section className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] text-neutral-500 uppercase font-bold">Описание для клиентов</label>
             <textarea value={form.description} onChange={e => update('description', e.target.value)} className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 resize-none text-sm" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] text-rose-500 uppercase font-bold">Инструкции для ИИ (закрыто от клиента)</label>
             <textarea value={form.ai_instructions} onChange={e => update('ai_instructions', e.target.value)} className="w-full h-24 bg-rose-900/5 border border-rose-900/20 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-800/40 resize-none text-sm" />
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
