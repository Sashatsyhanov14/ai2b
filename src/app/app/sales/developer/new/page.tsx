"use client";
import PageHeader from '@/components/PageHeader';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewDevProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    district: '',
    builder_name: '',
    stage: '',
    quarter: '1',
    year: '',
    description: '',
    mediaText: '',
  });
  const change = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const media = form.mediaText.trim()
        ? form.mediaText.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        district: form.district.trim() || undefined,
        builder_name: form.builder_name.trim() || undefined,
        stage: form.stage || undefined,
        quarter: Number(form.quarter) as 1 | 2 | 3 | 4,
        year: form.year ? Number(form.year) : undefined,
        description: form.description.trim() || undefined,
        media,
      };
      const res = await fetch('/api/developer-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!j?.ok) {
        alert(j?.error || 'Не удалось создать проект');
        return;
      }
      router.push(`/app/sales/developer/${j.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Новый проект застройщика"
        subtitle="Заполните основные параметры проекта; медиа и детали можно добавить позже."
      />
      <form onSubmit={onSubmit} className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-4 lg:col-span-8">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className="form-label">Название проекта *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => change('name', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className="form-label">Город *</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => change('city', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-6">
                <label className="form-label">Квартал сдачи</label>
                <select
                  className="form-control"
                  value={form.quarter}
                  onChange={(e) => change('quarter', e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div className="col-span-6">
                <label className="form-label">Год</label>
                <input
                  className="form-control"
                  inputMode="numeric"
                  placeholder="2026"
                  value={form.year}
                  onChange={(e) => change('year', e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-control h-24"
                  value={form.description}
                  onChange={(e) => change('description', e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <label className="form-label">Медиа (URL, по одному в строке)</label>
                <textarea
                  className="form-control h-24"
                  value={form.mediaText}
                  onChange={(e) => change('mediaText', e.target.value)}
                  placeholder={"https://.../image1.jpg\nhttps://.../image2.jpg"}
                />
              </div>
            </div>
          </div>

          <div className="col-span-12 space-y-4 lg:col-span-4">
            <div>
              <label className="form-label">Застройщик</label>
              <input
                className="form-control"
                value={form.builder_name}
                onChange={(e) => change('builder_name', e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Можно оставить пустым и заполнить позже.
              </p>
            </div>
            <div>
              <label className="form-label">Стадия</label>
              <select
                className="form-control"
                value={form.stage}
                onChange={(e) => change('stage', e.target.value)}
              >
                <option value="">Не указано</option>
                <option value="pre-sales">Предпродажи</option>
                <option value="construction">Строительство</option>
                <option value="commissioned">Ввод в эксплуатацию</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 mt-8 border-t bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl justify-end gap-2 px-6 py-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
            >
              Отмена
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

