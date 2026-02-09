"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, MapPin, Layout, DollarSign, FileText } from "lucide-react";
import UploadImage from "@/components/UploadImage";
import { Button } from "@/components/ui/Button";

const COMMON_TAGS = [
  "Рядом с морем",
  "Вид на море",
  "Бассейн",
  "Парковка",
  "Газ",
  "Охрана 24/7",
  "Фитнес",
  "Сауна",
  "Детская площадка",
  "Рядом школа",
  "Центр города",
  "Меблированная",
  "ВНЖ",
  "Гражданство",
  "С ремонтом",
  "Whitebox",
  "Черновая",
  "Новостройка",
  "Сдача в этом году",
  "Сдача через 1 год",
  "Сдача через 2 года",
  "На этапе котлована",
];

export default function NewApartmentPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    city: "Antalya",
    address: "",
    rooms: "1",
    floor: "",
    floors_total: "",
    area_m2: "",
    price: "",
    currency: "EUR", // Default currency
    description: "",
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: string) {
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
      // Collect all features: selected tags + currency tag
      const allFeatures = [...selectedTags];

      // Add currency tag if it's not EUR (or always add it to be safe)
      // Format: "currency:USD" or just "Цена в USD" to be human readable?
      // Let's use a systematic tag "currency:USD" for machine reading, and maybe rely on that.
      // But for the bot to read it easily, maybe "Цена в долларах"?
      // Let's settle on technical tag "currency:USD"
      allFeatures.push(`currency:${form.currency}`);

      const payload = {
        type: "apartment",
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        rooms: Number(form.rooms),
        floor: form.floor ? Number(form.floor) : null,
        floors_total: form.floors_total ? Number(form.floors_total) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        price: form.price ? Number(form.price) : null,
        description: form.description.trim() || null,
        features: allFeatures,
        photos: photos.length ? photos : undefined,
      };

      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      router.push("/app/sales");
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 md:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 py-4 md:px-6 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-400" />
          </button>
          <h1 className="text-lg md:text-xl font-semibold text-white">Новая квартира</h1>
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-8">
        <form onSubmit={submit} className="space-y-8">

          {/* 1. PHOTOS FIRST */}
          <section>
            <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4 transition-all hover:border-neutral-700 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  1. Фотографии
                </h2>
                <span className="text-[10px] text-neutral-500">{photos.length} загружено</span>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                    <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 backdrop-blur-sm"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-1 uppercase tracking-wide backdrop-blur-md">Главное</div>}
                  </div>
                ))}
                <div className="aspect-square">
                  <UploadImage
                    ownerUid="public"
                    entity="units"
                    entityId="new"
                    onUploaded={(url) => setPhotos((p) => [...p, url])}
                    multiple
                    label="+"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. MAIN INFO - FIXED LAYOUT */}
          <section>
            <h2 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">
              2. Основное
            </h2>
            <div className="rounded-2xl border border-neutral-700 overflow-hidden bg-neutral-900/30 shadow-sm">

              {/* Row 1: PRICE + CURRENCY - FLEXBOX */}
              <div className="relative border-b border-neutral-800 bg-neutral-900/60 p-4 flex items-center justify-between group focus-within:bg-neutral-900 transition-colors">
                <div className="flex items-center flex-1">
                  <DollarSign className={`h-6 w-6 mr-3 shrink-0 transition-colors ${form.price ? 'text-emerald-500' : 'text-neutral-600'}`} />
                  <input
                    type="number"
                    className="w-full bg-transparent text-3xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none tabular-nums"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                  />
                </div>

                {/* Currency Selector */}
                <div className="relative ml-4">
                  <select
                    className="appearance-none bg-neutral-950 border border-neutral-700 text-neutral-200 py-2 pl-4 pr-8 rounded-lg text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                    value={form.currency}
                    onChange={(e) => update("currency", e.target.value)}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Row 2: Location - GRID (12 columns) */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-b border-neutral-800">
                {/* City: 4 cols */}
                <div className="md:col-span-4 p-3 border-b md:border-b-0 md:border-r border-neutral-800 relative group focus-within:bg-neutral-900/50 transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Город</label>
                  <input
                    className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="Antalya"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>
                {/* Address: 8 cols */}
                <div className="md:col-span-8 p-3 relative group focus-within:bg-neutral-900/50 transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Адрес / Район</label>
                  <input
                    className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="Liman Mah., 25. Sk"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Specs - GRID (4 equal cols) */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-neutral-800">
                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Площадь м²</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium tabular-nums"
                    placeholder="65"
                    value={form.area_m2}
                    onChange={(e) => update("area_m2", e.target.value)}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50 relative transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Комнат</label>
                  <select
                    className="w-full bg-transparent text-center text-neutral-200 outline-none text-sm font-medium appearance-none absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    value={form.rooms}
                    onChange={(e) => update("rooms", e.target.value)}
                  >
                    <option value="0">Студия</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                  <input
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-transparent text-center text-neutral-200 outline-none text-sm font-medium pointer-events-none"
                    value={form.rooms === "0" ? "Студия" : form.rooms}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Этаж</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium tabular-nums"
                    placeholder="3"
                    value={form.floor}
                    onChange={(e) => update("floor", e.target.value)}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Всего этажей</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium tabular-nums"
                    placeholder="10"
                    value={form.floors_total}
                    onChange={(e) => update("floors_total", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. TAGS */}
          <section>
            <h2 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">
              3. Хештеги
            </h2>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all transform active:scale-95 border ${isSelected
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-500"
                      : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                      }`}
                  >
                    {isSelected ? "✓ " : ""}{tag}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. OPTIONAL DESCRIPTION */}
          <section>
            <details className="group">
              <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1 hover:text-neutral-300 transition-colors">
                <span className="group-open:rotate-90 transition-transform text-neutral-600">▸</span>
                Добавить описание (необязательно)
              </summary>
              <div className="mt-3">
                <textarea
                  className="w-full h-24 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-neutral-200 outline-none focus:border-neutral-700 transition-all text-sm resize-none placeholder:text-neutral-700"
                  placeholder="Заметки для бота..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
            </details>
          </section>

          {/* 5. SPACER for Mobile */}
          <div className="h-24 md:hidden"></div>

          {/* FIXED BOTTOM SAVE BUTTON */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-800 md:static md:bg-transparent md:border-0 md:p-0 z-40">
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/50 text-red-200 text-xs text-center">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading || !form.price}
              className={`w-full py-4 text-base font-semibold shadow-xl transition-all ${loading || !form.price
                ? "opacity-50 grayscale"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
                }`}
            >
              {loading ? "Сохранение..." : "Сохранить квартиру"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
