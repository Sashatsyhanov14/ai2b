"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadImage from "@/components/UploadImage";

type FormState = {
  city: string;
  address: string;
  rooms: string;
  price_day: string;
  price_week: string;
  allow_pets: boolean;
  description: string;
};

export default function NewDailyRentUnitPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    city: "",
    address: "",
    rooms: "",
    price_day: "",
    price_week: "",
    allow_pets: false,
    description: "",
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const roomsNum = Number(form.rooms);
    const priceDayNum = Number(form.price_day);
    const priceWeekNum =
      form.price_week.trim() === "" ? null : Number(form.price_week);

    if (!form.city.trim() || !form.address.trim()) {
      setError("Город и адрес обязательны");
      return;
    }
    if (!roomsNum || roomsNum <= 0 || Number.isNaN(roomsNum)) {
      setError("Комнат должно быть число > 0");
      return;
    }
    if (!priceDayNum || priceDayNum <= 0 || Number.isNaN(priceDayNum)) {
      setError("Цена/день должна быть числом > 0");
      return;
    }
    if (
      priceWeekNum !== null &&
      (Number.isNaN(priceWeekNum) || priceWeekNum <= 0)
    ) {
      setError("Цена/неделю должна быть числом > 0 или пустой");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/rent-daily-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: form.city,
          address: form.address,
          rooms: roomsNum,
          price_day: priceDayNum,
          price_week: priceWeekNum,
          allow_pets: form.allow_pets,
          description: form.description || null,
          photos: photos.length ? photos : undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error || `Ошибка сохранения (HTTP ${res.status})`);
        return;
      }

      router.push("/app/rent");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full w-full px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">
          Новая квартира (посуточно)
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl rounded-xl bg-[#111111] p-6 shadow"
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Город*</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={form.city}
              onChange={handleChange("city")}
              placeholder="Antalya"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Адрес*</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={form.address}
              onChange={handleChange("address")}
              placeholder="Улица, дом"
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Комнат*
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={form.rooms}
              onChange={handleChange("rooms")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Цена/день, €*
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={form.price_day}
              onChange={handleChange("price_day")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Цена/неделю, € (опционально)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={form.price_week}
              onChange={handleChange("price_week")}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-500"
              checked={form.allow_pets}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  allow_pets: e.target.checked,
                }))
              }
            />
            ????? ? ?????????
          </label>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-400">Описание</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            value={form.description}
            onChange={handleChange("description")}
            placeholder="Кратко опишите объект"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-400">Фото</label>
          <UploadImage
            ownerUid={"public"}
            entity="rent_units"
            entityId={"new"}
            onUploaded={(url) => setPhotos((prev) => [...prev, url])}
            multiple
          />
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((u, i) => (
                <img
                  key={i}
                  src={u}
                  className="h-16 w-16 rounded object-cover ring-1 ring-neutral-800"
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500 bg-red-950 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-[#1a1a1a]"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}