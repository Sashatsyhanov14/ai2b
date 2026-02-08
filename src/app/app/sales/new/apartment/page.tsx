"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadImage from "@/components/UploadImage";

export default function NewApartmentPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    city: "",
    address: "",
    rooms: "studio",
    floor: "",
    floors_total: "",
    area_m2: "",
    finish: "",
    price_total: "",
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
        // is_rent removed
        type: "apartment",
        city: form.city || null,
        address: form.address || null,
        rooms: form.rooms ? (form.rooms === "studio" ? 0 : Number(form.rooms)) : null,
        floor: form.floor ? Number(form.floor) : null,
        floors_total: form.floors_total ? Number(form.floors_total) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        price_total: form.price_total ? Number(form.price_total) : null,
        description: form.description || null,
        photos: photos.length ? photos : undefined,
        meta: photos.length ? { photos } : {},
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
    <div className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="mb-4 text-2xl font-semibold">
        Новая квартира (продажа)
      </h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">Город*</label>
            <input
              className="form-control"
              placeholder="Город"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">Адрес*</label>
            <input
              className="form-control"
              placeholder="Адрес"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Комнат*</label>
            <select
              className="form-control"
              value={form.rooms}
              onChange={(e) => update("rooms", e.target.value)}
            >
              <option value="studio">Студия</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Этаж*</label>
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Этаж"
                value={form.floor}
                onChange={(e) => update("floor", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Этажей всего*</label>
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="Этажей всего"
                value={form.floors_total}
                onChange={(e) => update("floors_total", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Площадь, м²*</label>
            <input
              className="form-control"
              type="number"
              min={5}
              step={0.1}
              placeholder="Площадь"
              value={form.area_m2}
              onChange={(e) => update("area_m2", e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Отделка</label>
            <select
              className="form-control"
              value={form.finish}
              onChange={(e) => update("finish", e.target.value)}
            >
              <option value="">Без отделки</option>
              <option value="renovated">С ремонтом</option>
              <option value="whitebox">Whitebox</option>
              <option value="shell">Черновая</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Цена, ₽*</label>
          <input
            className="form-control"
            type="number"
            placeholder="Цена ₽"
            value={form.price_total}
            onChange={(e) => update("price_total", e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">Описание</label>
          <textarea
            className="form-control min-h-[96px]"
            placeholder="Краткое описание квартиры"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-200">Фото</div>
          <UploadImage
            ownerUid={"public"}
            entity="units"
            entityId={"new"}
            onUploaded={(url) => setPhotos((p) => [...p, url])}
            multiple
          />
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((u, i) => (
                <div
                  key={i}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-800"
                >
                  <img
                    src={u}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Удалить фото"
                    onClick={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
