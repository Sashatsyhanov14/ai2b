"use client";
import { useMemo, useState } from 'react';
import UploadImage from '@/components/UploadImage';

type RoomsOpt = 'studio'|'1'|'2'|'3'|'4+';

export default function AddSecondaryModal({ onClose, onCreated }:{ onClose: () => void; onCreated: () => void }){
  const [form, setForm] = useState({
    city: '', address: '',
    rooms: 'studio' as RoomsOpt,
    floor: 1, floors_total: 1,
    area_m2: 30,
    finish: 'renovated' as 'renovated'|'whitebox'|'shell',
    price_total: 0,
    description: ''
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const valid = useMemo(() => {
    const { city, address, floor, floors_total, area_m2, price_total } = form;
    if (!city.trim() || !address.trim()) return false;
    if (!(floor > 0) || !(floors_total > 0) || floor > floors_total) return false;
    if (!(area_m2 >= 5)) return false;
    if (!(price_total > 0)) return false;
    return true;
  }, [form]);

  function change<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(s => ({ ...s, [k]: v }));
  }

  async function save(){
    setSaving(true);
    try {
      // UI-first: пока без БД. Здесь можно вызвать реальный API позже.
      // имитация сохранения
      await new Promise(r => setTimeout(r, 400));
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function removePhoto(idx: number){
    setPhotos(arr => arr.filter((_,i)=>i!==idx));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[720px] rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Добавить квартиру (вторичка)</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-900">Закрыть</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-xs text-zinc-400 mb-1">Город*</label>
            <input className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                   value={form.city} onChange={e=>change('city', e.target.value)} />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-zinc-400 mb-1">Адрес*</label>
            <input className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                   value={form.address} onChange={e=>change('address', e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Комнат*</label>
            <select className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                    value={form.rooms} onChange={e=>change('rooms', e.target.value as RoomsOpt)}>
              <option value="studio">студия</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4+">4+</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Этаж*</label>
              <input type="number" min={1} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                     value={form.floor} onChange={e=>change('floor', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Этажность*</label>
              <input type="number" min={1} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                     value={form.floors_total} onChange={e=>change('floors_total', Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Площадь (м²)*</label>
            <input type="number" min={5} step={1} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                   value={form.area_m2} onChange={e=>change('area_m2', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Состояние</label>
            <select className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                    value={form.finish} onChange={e=>change('finish', e.target.value as any)}>
              <option value="renovated">с ремонтом</option>
              <option value="whitebox">whitebox</option>
              <option value="shell">черновая</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Цена, ₽*</label>
            <input type="number" min={1} step={10000} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2"
                   value={form.price_total} onChange={e=>change('price_total', Number(e.target.value))} />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Описание</label>
            <textarea className="w-full h-24 rounded border border-zinc-700 bg-zinc-900 p-2"
                      value={form.description} onChange={e=>change('description', e.target.value)} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <UploadImage ownerUid={'public'} entity="units" entityId={'new'}
                       onUploaded={(url)=> setPhotos(p=>[...p, url])} multiple/>
          {photos.length>0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {photos.map((u,i)=> (
                <div key={i} className="relative">
                  <img src={u} className="h-16 w-16 rounded object-cover ring-1 ring-zinc-800" />
                  <button onClick={()=>removePhoto(i)} className="absolute -top-1 -right-1 rounded-full bg-black/70 border border-zinc-700 px-1 text-[10px]">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900">Отмена</button>
          <button onClick={save} disabled={saving || !valid}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
