"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadImage from "@/components/UploadImage";

type FormState = {
  name: string;
  developer: string;
  city: string;
  district: string;
  stage: string;
  quarter: "1" | "2" | "3" | "4";
  year: string;
  sections: string;
  description: string;
};

const initialForm: FormState = {
  name: "",
  developer: "",
  city: "",
  district: "",
  stage: "pre-sales",
  quarter: "1",
  year: "",
  sections: "",
  description: "",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setForm(initialForm);
    setPhotos([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.city.trim()) {
      setError("Укажи название проекта и город.");
      return;
    }

    const quarterNumber = Number(form.quarter);
    if (![1, 2, 3, 4].includes(quarterNumber)) {
      setError("Квартал должен быть от 1 до 4.");
      return;
    }

    const yearNumber = Number(form.year);
    if (!yearNumber || yearNumber < 2020 || yearNumber > 2100) {
      setError("Укажи корректный год сдачи.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        district: form.district.trim() || undefined,
        builder_name: form.developer.trim() || undefined,
        stage: form.stage || undefined,
        quarter: quarterNumber as 1 | 2 | 3 | 4,
        year: yearNumber,
        sections: form.sections.trim() || undefined,
        description: form.description.trim() || undefined,
        media: photos.length ? photos : undefined,
      };

      const res = await fetch("/api/developer-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        const message = json?.error || "Не удалось сохранить проект";
        setError(message);
        return;
      }

      resetForm();
      router.push("/app/sales/developer");
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 rounded-2xl bg-neutral-900/70 p-6 text-neutral-100">
        <h1 className="text-2xl font-semibold">Новый проект застройщика</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Заполни основные параметры ЖК и добавь несколько рендеров — после сохранения проект появится в разделе
          &laquo;Продажа → Проекты&raquo;.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-neutral-100">Основная информация</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Название проекта *</label>
                  <input
                    className="form-control"
                    placeholder=" например, Nova City"
                    value={form.name}
                    onChange={(e) => update("name")(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Застройщик</label>
                  <input
                    className="form-control"
                    placeholder="Группа компаний..."
                    value={form.developer}
                    onChange={(e) => update("developer")(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-label">Город *</label>
                  <input
                    className="form-control"
                    value={form.city}
                    onChange={(e) => update("city")(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Район</label>
                  <input
                    className="form-control"
                    value={form.district}
                    onChange={(e) => update("district")(e.target.value)}
                    placeholder="Микрорайон / часть города"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="form-label">Стадия</label>
                  <select
                    className="form-control"
                    value={form.stage}
                    onChange={(e) => update("stage")(e.target.value)}
                  >
                    <option value="pre-sales">Предпродажи</option>
                    <option value="construction">Строится</option>
                    <option value="commissioned">Сдан</option>
                    <option value="unknown">Не указано</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Квартал сдачи *</label>
                  <select
                    className="form-control"
                    value={form.quarter}
                    onChange={(e) => update("quarter")(e.target.value as FormState["quarter"])}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Год сдачи *</label>
                  <input
                    className="form-control"
                    type="number"
                    placeholder="2026"
                    value={form.year}
                    onChange={(e) => update("year")(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Секции (через запятую)</label>
                <input
                  className="form-control"
                  placeholder="А, Б, В..."
                  value={form.sections}
                  onChange={(e) => update("sections")(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Описание проекта</label>
                <textarea
                  className="form-control min-h-[120px]"
                  placeholder="Кратко опиши концепцию, инфрастуктуру, преимущества..."
                  value={form.description}
                  onChange={(e) => update("description")(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-lg font-semibold text-neutral-100">Медиа</h2>
            <p className="text-sm text-neutral-400">
              Добавь 1–5 рендеров — их увидят менеджеры и клиенты внутри CRM.
            </p>

            <UploadImage
              ownerUid="public"
              entity="developer_projects"
              entityId="new"
              onUploaded={(url) => setPhotos((prev) => [...prev, url])}
              label="Загрузить рендеры"
            />

            {photos.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Прикреплённые фото</p>
                <div className="flex flex-wrap gap-3">
                  {photos.map((url, idx) => (
                    <div
                      key={url}
                      className="relative h-20 w-24 overflow-hidden rounded-xl border border-neutral-800"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white hover:bg-black"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-4 text-sm text-neutral-400">
              Пока что фото просто сохраняются в Supabase Storage. После сохранения проекта ссылки запишутся в поле
              <span className="text-neutral-200"> media[]</span>.
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-neutral-800 bg-neutral-950/70 px-2 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900/70 px-5 py-2.5 text-sm font-medium text-neutral-200 shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Сохраняем проект…" : "Сохранить проект"}
          </button>
        </div>
      </form>
    </div>
  );
}
