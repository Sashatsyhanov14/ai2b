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
    finish: "renovated",
    price: "",
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
      const allFeatures = Array.from(new Set([form.finish, ...selectedTags]));

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

          {/* 1. PHOTOS FIRST (Effect of ownership) */}
          <section>
            <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4 transition-all hover:border-neutral-700">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  1. Фотографии
                </h2>
                <span className="text-[10px] text-neutral-500">{photos.length} загружено</span>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square group rounded-lg overflow-hidden border border-neutral-800">
                    <img src={url} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wide">Главное</div>}
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

          {/* 2. UNIFIED INPUTS (One block, no stress) */}
          <section>
            <h2 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">
              2. Основное
            </h2>
            <div className="rounded-2xl border border-neutral-700 overflow-hidden bg-neutral-900/30">

              {/* Row 1: PRICE (Big & Green) */}
              <div className="relative border-b border-neutral-800 bg-neutral-900/60 p-4 flex items-center group focus-within:bg-neutral-900">
                <DollarSign className="h-6 w-6 text-emerald-500 mr-3 shrink-0" />
                <input
                  type="number"
                  className="w-full bg-transparent text-3xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                />
                <span className="text-neutral-500 font-medium text-lg ml-2">EUR</span>
              </div>

              {/* Row 2: Location (City | Address) */}
              <div className="flex border-b border-neutral-800">
                <div className="flex-1 border-r border-neutral-800 p-3 relative group focus-within:bg-neutral-900/50">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Город</label>
                  <input
                    className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="Antalya"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </div>
                <div className="flex-[2] p-3 relative group focus-within:bg-neutral-900/50">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Адрес / Район</label>
                  <input
                    className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="Liman Mah., 25. Sk"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Specs (Grid of 4) */}
              <div className="grid grid-cols-4 divide-x divide-neutral-800 border-b border-neutral-800">
                <div className="p-3 text-center group focus-within:bg-neutral-900/50">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Метраж</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="65"
                    value={form.area_m2}
                    onChange={(e) => update("area_m2", e.target.value)}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Этаж</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="3"
                    value={form.floor}
                    onChange={(e) => update("floor", e.target.value)}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Всего</label>
                  <input
                    type="number"
                    className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                    placeholder="10"
                    value={form.floors_total}
                    onChange={(e) => update("floors_total", e.target.value)}
                  />
                </div>
                <div className="p-3 text-center group focus-within:bg-neutral-900/50 relative">
                  <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Комнат</label>
                  <select
                    className="w-full bg-transparent text-center text-neutral-200 outline-none text-sm font-medium appearance-none absolute inset-0 opacity-0 cursor-pointer"
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
                  <div className="text-sm font-medium text-neutral-200 pointer-events-none">
                    {form.rooms === "0" ? "Студия" : form.rooms}
                  </div>
                </div>
              </div>
              {/* Row 4: Finish */}
              <div className="p-3 group focus-within:bg-neutral-900/50 flex items-center justify-between">
                <label className="text-[10px] text-neutral-500 uppercase tracking-wider">Отделка</label>
                <select
                  className="bg-transparent text-right text-neutral-200 outline-none text-sm font-medium cursor-pointer"
                  value={form.finish}
                  onChange={(e) => update("finish", e.target.value)}
                >
                  <option value="renovated" className="bg-neutral-900">С ремонтом</option>
                  <option value="furniture" className="bg-neutral-900">С мебелью</option>
                  <option value="whitebox" className="bg-neutral-900">Whitebox</option>
                  <option value="shell" className="bg-neutral-900">Черновая</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3. TAGS (Victory) */}
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
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all transform active:scale-95 ${isSelected
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-500"
                      : "bg-neutral-900/50 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
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
                <span className="group-open:rotate-90 transition-transform">▸</span>
                Добавить описание (необязательно)
              </summary>
              <div className="mt-3">
                <textarea
                  className="w-full h-24 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-neutral-200 outline-none focus:border-neutral-700 transition-all text-sm resize-none"
                  placeholder="Любые заметки..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </div>
            </details>
          </section>

          {/* Spacer for mobile fixed button */}
          <div className="h-20 md:hidden"></div>

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
              className={`w-full py-4 text-base font-semibold shadow-lg transition-all ${loading || !form.price
                ? "opacity-50 grayscale"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                }`}
            >
              {loading ? "Сохранение..." : "Сохранить объект"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
