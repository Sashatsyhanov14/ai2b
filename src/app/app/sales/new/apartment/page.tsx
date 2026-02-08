"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import UploadImage from "@/components/UploadImage";
import { Button } from "@/components/ui/Button";

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

  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
        // finish is not in schema directly? it is in features maybe? or just description
        features: [form.finish],
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800"
          >
            <ChevronLeft className="h-5 w-5 text-neutral-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Новая квартира</h1>
            <p className="text-sm text-neutral-400">Заполните данные о квартире для продажи</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-8">

        {/* Section: Location */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-200 border-b border-neutral-800 pb-2">
            Локация
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Город
              </label>
              <input
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Например: Antalya"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Адрес / Район
              </label>
              <input
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Улица, дом или название ЖК"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* Section: Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-200 border-b border-neutral-800 pb-2">
            Характеристики
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Комнат
              </label>
              <select
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={form.rooms}
                onChange={(e) => update("rooms", e.target.value)}
              >
                <option value="0">Студия</option>
                <option value="1">1+1</option>
                <option value="2">2+1</option>
                <option value="3">3+1</option>
                <option value="4">4+1</option>
                <option value="5">5+</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Площадь (м²)
              </label>
              <input
                type="number"
                min="10"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={form.area_m2}
                onChange={(e) => update("area_m2", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Этаж
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Эт."
                  value={form.floor}
                  onChange={(e) => update("floor", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Всего этажей
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="Всего"
                  value={form.floors_total}
                  onChange={(e) => update("floors_total", e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section: Price & Finish */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-200 border-b border-neutral-800 pb-2">
            Цена и Отделка
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Цена (€)
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-lg font-medium text-emerald-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-neutral-600"
                placeholder="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Отделка
              </label>
              <select
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                value={form.finish}
                onChange={(e) => update("finish", e.target.value)}
              >
                <option value="renovated">С ремонтом</option>
                <option value="furniture">С мебелью</option>
                <option value="whitebox">Whitebox (чистовая)</option>
                <option value="shell">Черновая</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section: Description */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-200 border-b border-neutral-800 pb-2">
            Описание
          </h2>
          <div>
            <textarea
              className="w-full h-32 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-neutral-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              placeholder="Подробное описание квартиры..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </section>

        {/* Section: Photos */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-200 border-b border-neutral-800 pb-2">
            Фотографии
          </h2>
          <div className="bg-neutral-900/30 rounded-xl p-4 border border-neutral-800 border-dashed">
            <UploadImage
              ownerUid="public"
              entity="units"
              entityId="new"
              onUploaded={(url) => setPhotos((p) => [...p, url])}
              multiple
            />
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square group">
                    <img
                      src={url}
                      alt={`Photo ${i}`}
                      className="w-full h-full object-cover rounded-lg border border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                        Главное
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-900/50 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="pt-4 flex justify-end gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={loading || !form.price}
            className="w-40"
          >
            {loading ? (
              <span className="flex items-center gap-2">Сохранение...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} /> Сохранить</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
