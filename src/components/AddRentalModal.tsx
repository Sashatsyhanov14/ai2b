"use client";
import { useState } from 'react';
import UploadImage from '@/components/UploadImage';

export default function AddRentalModal({ ownerUid, onClose, onCreated }:{
  ownerUid: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    city: '',
    address: '',
    bedrooms: 1,
    price_daily: 0,
    price_month_eur: 0,
    animals: false,
    description: '',
  });
  const [newUnitId, setNewUnitId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const change = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: form.city,
          address: form.address,
          rooms: form.bedrooms,
          price: form.price_month_eur,
          status: 'available',
          description: form.description,
          is_rent: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j?.ok) throw new Error(j?.error || 'Не удалось создать объект');
      const unitId = j.data.id as string;
      setNewUnitId(unitId);
      try {
        for (let i = 0; i < photos.length; i++) {
          await fetch(`/api/units/${unitId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: photos[i], sort_order: i + 1 }),
          });
        }
      } catch {}
      onCreated();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="
          w-full max-w-2xl
          max-h-[90vh]
          overflow-y-auto
          rounded-2xl
          bg-neutral-900
          border border-neutral-800
          shadow-2xl
          p-6
        "
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Новый объект (аренда)</h3>
          <button onClick={onClose} className="btn btn-ghost btn--sm">
            Закрыть
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Город</label>
            <input
              className="form-control"
              value={form.city}
              onChange={(e) => change('city', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="form-label">Адрес</label>
            <input
              className="form-control"
              value={form.address}
              onChange={(e) => change('address', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Комнат</label>
            <input
              type="number"
              min={0}
              step={1}
              className="form-control"
              value={form.bedrooms}
              onChange={(e) => change('bedrooms', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="form-label">Цена/день (€)</label>
            <input
              type="number"
              min={0}
              step={10}
              className="form-control"
              value={form.price_daily}
              onChange={(e) => change('price_daily', Number(e.target.value))}
            />
          </div>
          <div>
            <label className="form-label">Цена/месяц (€)</label>
            <input
              type="number"
              min={0}
              step={50}
              className="form-control"
              value={form.price_month_eur}
              onChange={(e) => change('price_month_eur', Number(e.target.value))}
            />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.animals}
              onChange={(e) => change('animals', e.target.checked)}
            />
            Можно с питомцами
          </label>
          <div className="col-span-2">
            <label className="form-label">Описание</label>
            <textarea
              className="h-24 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.description}
              onChange={(e) => change('description', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <UploadImage
            ownerUid={ownerUid}
            entity="units"
            entityId={newUnitId || 'temp'}
            onUploaded={(url) => setPhotos((p) => [...p, url])}
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
          <p className="mt-2 text-xs text-neutral-500">
            Фотографии сохраняются как публичные URL после загрузки в хранилище.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost btn--sm">
            Отмена
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn btn-primary btn--sm"
          >
            {saving ? 'Сохранение…' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
