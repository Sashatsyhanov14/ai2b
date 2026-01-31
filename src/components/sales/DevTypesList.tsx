"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { DevUnitType, useDevStore } from '@/stores/developer';

export default function DevTypesList({ projectId }: { projectId: string }) {
  const typesAll = useDevStore((s) => s.types);
  const addType = useDevStore((s) => s.addType);
  const updateType = useDevStore((s) => s.updateType);
  const removeType = useDevStore((s) => s.removeType);
  const types = typesAll.filter((t) => t.projectId === projectId);

  const [editing, setEditing] = useState<DevUnitType | null>(null);

  const [form, setForm] = useState({
    label: '',
    area_min: '',
    area_max: '',
    finish: '',
    price_from: '',
    price_per_m2: '',
    floor_markup: '',
    images: [] as string[],
  });

  function startEdit(t?: DevUnitType) {
    if (!t) {
      setEditing(null);
      setForm({
        label: '',
        area_min: '',
        area_max: '',
        finish: '',
        price_from: '',
        price_per_m2: '',
        floor_markup: '',
        images: [],
      });
    } else {
      setEditing(t);
      setForm({
        label: t.label,
        area_min: String(t.area_min),
        area_max: String(t.area_max),
        finish: t.finish || '',
        price_from: String(t.price_from),
        price_per_m2: t.price_per_m2 ? String(t.price_per_m2) : '',
        floor_markup: t.floor_markup ? String(t.floor_markup) : '',
        images: t.images || [],
      });
    }
  }

  function readFiles(files: FileList | null, cb: (urls: string[]) => void) {
    if (!files || files.length === 0) return;
    const readers: Promise<string>[] = [];
    for (const file of Array.from(files)) {
      readers.push(
        new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.readAsDataURL(file);
        }),
      );
    }
    Promise.all(readers).then(cb);
  }

  function onChange<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      projectId,
      label: form.label.trim(),
      area_min: Number(form.area_min),
      area_max: Number(form.area_max),
      finish: (form.finish || undefined) as DevUnitType['finish'],
      price_from: Number(form.price_from),
      price_per_m2: form.price_per_m2 ? Number(form.price_per_m2) : undefined,
      floor_markup: form.floor_markup ? Number(form.floor_markup) : undefined,
      images: form.images,
    };
    if (editing) {
      updateType(editing.id, payload);
    } else {
      addType(payload as any);
    }
    startEdit(undefined);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded border border-white/15 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Название типа*">
            <input
              value={form.label}
              onChange={(e) => onChange('label', e.target.value)}
              placeholder="1-комн., 2-комн., студия"
            />
          </Field>
          <Field label="Площадь от, м²*">
            <input
              type="number"
              value={form.area_min}
              onChange={(e) => onChange('area_min', e.target.value)}
            />
          </Field>
          <Field label="Площадь до, м²*">
            <input
              type="number"
              value={form.area_max}
              onChange={(e) => onChange('area_max', e.target.value)}
            />
          </Field>
          <Field label="Отделка">
            <select
              value={form.finish}
              onChange={(e) => onChange('finish', e.target.value)}
            >
              <option value="">Не указано</option>
              <option value="whitebox">Whitebox</option>
              <option value="shell">Черновая</option>
              <option value="turnkey">С ремонтом</option>
            </select>
          </Field>
          <Field label="Цена от, €*">
            <input
              type="number"
              value={form.price_from}
              onChange={(e) => onChange('price_from', e.target.value)}
            />
          </Field>
          <Field label="Цена за м², €">
            <input
              type="number"
              value={form.price_per_m2}
              onChange={(e) => onChange('price_per_m2', e.target.value)}
            />
          </Field>
          <Field label="Надбавка за этаж, €">
            <input
              type="number"
              value={form.floor_markup}
              onChange={(e) => onChange('floor_markup', e.target.value)}
            />
          </Field>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-white/80">Изображения типа</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                readFiles(e.target.files, (urls) =>
                  onChange('images', [...form.images, ...urls]),
                )
              }
            />
            {form.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="h-16 w-24 rounded object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          'images',
                          form.images.filter((_, j) => j !== i),
                        )
                      }
                      className="absolute right-1 top-1 rounded bg-red-600/80 px-1 py-0.5 text-[10px] text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="submit">
            {editing ? 'Сохранить тип' : 'Добавить тип'}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => startEdit(undefined)}
            >
              Отмена
            </Button>
          )}
        </div>
      </form>

      <div className="overflow-auto rounded border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Название</th>
              <th className="px-3 py-2 text-left">Площадь (м²)</th>
              <th className="px-3 py-2 text-left">Отделка</th>
              <th className="px-3 py-2 text-left">Цена от</th>
              <th className="px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className="border-t border-white/10">
                <td className="px-3 py-2">{t.label}</td>
                <td className="px-3 py-2">
                  {t.area_min}–{t.area_max}
                </td>
                <td className="px-3 py-2">{t.finish || '—'}</td>
                <td className="px-3 py-2">{t.price_from.toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded border border-white/15 px-2 py-1 hover:bg-white/10"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() =>
                        confirm('Удалить тип?') && removeType(t.id)
                      }
                      className="rounded border border-red-600/40 px-2 py-1 text-red-300 hover:bg-red-600/10"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/60">
                  Типы ещё не созданы.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

