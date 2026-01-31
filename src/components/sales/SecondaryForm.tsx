"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

type FormState = {
  city: string;
  address: string;
  rooms: 'studio' | '1' | '2' | '3' | '4+';
  floor: number | '';
  floors_total: number | '';
  area_m2: number | '';
  finish?: 'renovated' | 'whitebox' | 'shell';
  price_total: number | '';
  description?: string;
  photos: string[];
  status: 'available' | 'reserved' | 'sold';
};

export default function SecondaryForm() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const unitId = params?.id as string | undefined;

  const [form, setForm] = useState<FormState>({
    city: '',
    address: '',
    rooms: 'studio',
    floor: '',
    floors_total: '',
    area_m2: '',
    finish: undefined,
    price_total: '',
    description: '',
    photos: [],
    status: 'available',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<
    Array<{ id: string; url: string; is_main?: boolean | null; sort_order?: number | null }>
  >([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [loading, setLoading] = useState<boolean>(!!unitId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!unitId) return;
      setLoading(true);
      const res = await fetch(`/api/units/${unitId}`);
      const j = await res.json().catch(() => ({}));
      if (j?.ok && j.data) {
        const u = j.data;
        setForm({
          city: u.city || '',
          address: u.address || '',
          rooms: (u.rooms === 0 ? 'studio' : String(u.rooms)) as any,
          floor: u.floor ?? '',
          floors_total: (u as any).floors_total ?? '',
          area_m2: u.area ?? '',
          finish: (u as any).finish ?? undefined,
          price_total: u.price ?? '',
          description: u.description ?? '',
          photos: [],
          status: (u.status as any) || 'available',
        });
        const pr = await fetch(`/api/units/${unitId}/photos`);
        const pj = await pr.json().catch(() => ({}));
        if (pj?.ok) setPhotos(pj.data || []);
      }
      setLoading(false);
    }
    load();
  }, [unitId]);

  function onChange<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.city.trim()) e.city = 'Укажите город';
    if (!form.address.trim()) e.address = 'Укажите адрес';
    if (form.floor === '' || Number(form.floor) <= 0) e.floor = 'Этаж должен быть > 0';
    if (form.floors_total === '' || Number(form.floors_total) <= 0)
      e.floors_total = 'Этажей всего должно быть > 0';
    if (
      form.floor !== '' &&
      form.floors_total !== '' &&
      Number(form.floor) > Number(form.floors_total)
    )
      e.floor = 'Этаж не может быть больше числа этажей дома';
    if (form.area_m2 === '' || Number(form.area_m2) < 5)
      e.area_m2 = 'Минимальная площадь — 5 м²';
    if (form.price_total === '' || Number(form.price_total) <= 0)
      e.price_total = 'Цена должна быть > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setSubmitting(true);

    const payload = {
      city: form.city.trim(),
      address: form.address.trim(),
      rooms: form.rooms,
      floor: form.floor === '' ? undefined : Number(form.floor),
      floors_total: form.floors_total === '' ? undefined : Number(form.floors_total),
      area_m2: form.area_m2 === '' ? undefined : Number(form.area_m2),
      finish: form.finish,
      price_total: form.price_total === '' ? undefined : Number(form.price_total),
      description: form.description?.trim() || undefined,
      status: form.status,
      is_rent: false,
      type: 'apartment',
    };

    try {
      if (unitId) {
        const res = await fetch(`/api/units/${unitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!j?.ok) {
          setSubmitError(j?.error || 'Не удалось обновить квартиру');
          return;
        }
      } else {
        const res = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!j?.ok) {
          setSubmitError(j?.error || 'Не удалось создать квартиру');
          return;
        }
      }

      router.push('/app/sales/secondary');
    } finally {
      setSubmitting(false);
    }
  }

  async function addPhoto() {
    if (!unitId) {
      alert('Сначала сохраните квартиру, затем добавляйте фото');
      return;
    }
    const url = newPhotoUrl.trim();
    if (!url) return;
    const res = await fetch(`/api/units/${unitId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || 'Не удалось добавить фото');
      return;
    }
    setNewPhotoUrl('');
    const pr = await fetch(`/api/units/${unitId}/photos`);
    const pj = await pr.json().catch(() => ({}));
    if (pj?.ok) setPhotos(pj.data || []);
  }

  async function markMain(id: string) {
    if (!unitId) return;
    const res = await fetch(`/api/units/${unitId}/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_main: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || 'Не удалось обновить главное фото');
      return;
    }
    const pr = await fetch(`/api/units/${unitId}/photos`);
    const pj = await pr.json().catch(() => ({}));
    if (pj?.ok) setPhotos(pj.data || []);
  }

  async function removePhoto(id: string) {
    if (!unitId) return;
    if (!confirm('Удалить фото?')) return;
    const res = await fetch(`/api/units/${unitId}/photos/${id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || 'Не удалось удалить фото');
      return;
    }
    setPhotos((list) => list.filter((p) => p.id !== id));
  }

  const roomOptions: { value: FormState['rooms']; label: string }[] = [
    { value: 'studio', label: 'Студия' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4+', label: '4+' },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Город*" error={errors.city}>
          <input
            aria-label="Город"
            placeholder="Город"
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </Field>
        <Field label="Адрес*" error={errors.address}>
          <input
            aria-label="Адрес"
            placeholder="Адрес"
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
          />
        </Field>

        <Field label="Комнат">
          <select
            aria-label="Комнат"
            value={form.rooms}
            onChange={(e) => onChange('rooms', e.target.value as FormState['rooms'])}
          >
            {roomOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Этаж*" error={errors.floor}>
            <input
              aria-label="Этаж"
              placeholder="Этаж"
              type="number"
              value={form.floor}
              onChange={(e) =>
                onChange('floor', e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Этажей всего*" error={errors.floors_total}>
            <input
              aria-label="Этажей всего"
              placeholder="Этажей всего"
              type="number"
              value={form.floors_total}
              onChange={(e) =>
                onChange(
                  'floors_total',
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
            />
          </Field>
        </div>

        <Field label="Площадь (м²)*" error={errors.area_m2}>
          <input
            aria-label="Площадь"
            placeholder="Площадь (м²)"
            type="number"
            min={5}
            step={0.1}
            value={form.area_m2}
            onChange={(e) =>
              onChange('area_m2', e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Отделка">
          <select
            aria-label="Отделка"
            value={form.finish || ''}
            onChange={(e) =>
              onChange('finish', (e.target.value || undefined) as FormState['finish'])
            }
          >
            <option value="">Без отделки</option>
            <option value="renovated">С ремонтом</option>
            <option value="whitebox">Whitebox</option>
            <option value="shell">Черновая</option>
          </select>
        </Field>

        <Field label="Цена, ₽*" error={errors.price_total}>
          <input
            aria-label="Цена"
            placeholder="Цена, ₽"
            type="number"
            value={form.price_total}
            onChange={(e) =>
              onChange('price_total', e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </Field>

        <Field label="Статус">
          <select
            aria-label="Статус"
            value={form.status}
            onChange={(e) =>
              onChange('status', e.target.value as FormState['status'])
            }
          >
            <option value="available">Свободно</option>
            <option value="reserved">Бронь</option>
            <option value="sold">Продано</option>
          </select>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          aria-label="Описание"
          placeholder="Краткое описание квартиры"
          value={form.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          rows={4}
        />
      </Field>

      <div>
        <div className="mb-2 text-sm text-white/80">
          Фотографии
        </div>
        {!unitId && (
          <div className="text-sm text-neutral-500">
            Сначала сохраните новую квартиру, затем можно будет добавить фотографии.
          </div>
        )}
        {unitId && (
          <div className="mb-2 flex items-center gap-2">
            <input
              className="form-control"
              placeholder="Вставьте публичный URL фотографии"
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addPhoto}
            >
              Добавить
            </button>
          </div>
        )}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded border border-white/10"
              >
                <img src={p.url} alt="" className="h-32 w-full object-cover" />
                <div className="absolute left-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => markMain(p.id)}
                    className={`rounded px-2 py-0.5 text-xs ${
                      p.is_main
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black/50 text-white/80 hover:bg-black/70'
                    }`}
                  >
                    Главное
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-2 top-2 hidden rounded bg-red-600/80 px-2 py-1 text-xs text-white group-hover:block"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {submitError && (
        <div className="text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || submitting}>
          {submitting ? 'Сохранение…' : unitId ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
