"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, MapPin, Layout, DollarSign, FileText, Tag } from "lucide-react";
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
      // Collect all features: finish type + selected tags
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
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-400" />
          </button>
          <h1 className="text-xl font-semibold text-white">Новая квартира</h1>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 md:p-6 backdrop-blur-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-400 uppercase tracking-wider">
              <Layout className="h-4 w-4" /> Основная информация
            </h2>

            <div className="space-y-5">
              {/* Location Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Город</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-neutral-600" />
                    <input
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-9 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-700"
                      placeholder="Antalya"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Адрес / Район</label>
                  <input
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-700"
                    placeholder="Liman Mah., 25. Sk"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Price & Area Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Цена (€)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-600/70" />
                    <input
                      type="number"
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-9 p-2.5 text-lg font-medium text-emerald-400 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-800"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Площадь (м²)</label>
                  <input
                    type="number"
                    min="10"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-700"
                    placeholder="65"
                    value={form.area_m2}
                    onChange={(e) => update("area_m2", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Комнат</label>
                  <select
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer"
                    value={form.rooms}
                    onChange={(e) => update("rooms", e.target.value)}
                  >
                    <option value="0">Студия (1+0)</option>
                    <option value="1">1+1</option>
                    <option value="2">2+1</option>
                    <option value="3">3+1</option>
                    <option value="4">4+1</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              </div>

              {/* Details Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Этаж</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-700"
                    placeholder="3"
                    value={form.floor}
                    onChange={(e) => update("floor", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Этажность</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-700"
                    placeholder="10"
                    value={form.floors_total}
                    onChange={(e) => update("floors_total", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium ml-1">Отделка</label>
                  <select
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer text-sm"
                    value={form.finish}
                    onChange={(e) => update("finish", e.target.value)}
                  >
                    <option value="renovated">С ремонтом</option>
                    <option value="furniture">С мебелью</option>
                    <option value="whitebox">Whitebox</option>
                    <option value="shell">Черновая</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Tags Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 md:p-6 backdrop-blur-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-400 uppercase tracking-wider">
              <FileText className="h-4 w-4" /> Описание и теги <span className="text-neutral-600 normal-case tracking-normal">(опционально)</span>
            </h2>

            <div className="space-y-4">
              <textarea
                className="w-full h-28 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-neutral-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none placeholder:text-neutral-700 text-sm"
                placeholder="Дополнительные детали: солнечная сторона, айдат, инфраструктура..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${selectedTags.includes(tag)
                        ? "bg-blue-600/20 border-blue-600 text-blue-300"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Photos & Actions */}
        <div className="space-y-6">

          {/* Photos Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Фотографии
            </h2>
            <div className="space-y-4">
              <UploadImage
                ownerUid="public"
                entity="units"
                entityId="new"
                onUploaded={(url) => setPhotos((p) => [...p, url])}
                multiple
                label="Загрузить фото"
              />

              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative aspect-square group rounded-lg overflow-hidden border border-neutral-800">
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                      {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Главное</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center text-neutral-600 text-sm">
                  Нет фото
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="sticky top-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 backdrop-blur-sm space-y-3">
            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-red-200 text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !form.price || !form.address}
              className="w-full py-6 text-base"
            >
              {loading ? "Сохранение..." : "Сохранить квартиру"}
            </Button>

            <p className="text-center text-[10px] text-neutral-500">
              Квартира сразу появится в поиске бота
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
