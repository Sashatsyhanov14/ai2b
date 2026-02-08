"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UploadImage from '@/components/UploadImage'

export default function AddSaleModal({ onClose, onCreated, variant = 'secondary' }: { onClose: () => void; onCreated: () => void; variant?: 'secondary' | 'developer' }) {
  const [form, setForm] = useState({
    city: '', address: '', rooms: 1, price_sale_eur: 0,
    new_build: false, developer: '', handover_date: '',
    installment_available: false, commission_percent: 0,
    description: ''
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const change = (k: any, v: any) => setForm(s => ({ ...s, [k]: v }))

  async function save() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('units')
        .insert([{
          city: form.city,
          address: form.address,
          rooms: form.rooms,
          price: form.price_sale_eur,
          description: form.description,
          // Removed is_rent
        }])
        .select('id')
        .single()
      if (error) throw error
      onCreated(); onClose()
    } catch (e: any) {
      alert(e.message || 'Ошибка сохранения квартиры')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[720px] rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Добавить объект продажи</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900">Закрыть</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Город</label>
            <input className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.city} onChange={e => change('city', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Адрес</label>
            <input className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.address} onChange={e => change('address', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Комнат</label>
            <input type="number" min={0} step={1}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.rooms} onChange={e => change('rooms', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Цена (€)</label>
            <input type="number" min={0} step={1000}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.price_sale_eur} onChange={e => change('price_sale_eur', Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={form.new_build} onChange={e => change('new_build', e.target.checked)} />
            Новостройка (от застройщика)
          </label>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Застройщик</label>
            <input className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.developer} onChange={e => change('developer', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Сдача (YYYY-MM)</label>
            <input className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.handover_date} onChange={e => change('handover_date', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={form.installment_available} onChange={e => change('installment_available', e.target.checked)} />
            Рассрочка доступна
          </label>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Комиссия (%)</label>
            <input type="number" min={0} step={0.5}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.commission_percent} onChange={e => change('commission_percent', Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Описание</label>
            <textarea className="w-full h-24 rounded border border-neutral-700 bg-neutral-900 p-2"
              value={form.description} onChange={e => change('description', e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <UploadImage ownerUid={'public'} entity="units" entityId={'new'} onUploaded={(url) => setPhotos(p => [...p, url])} multiple />
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((u, i) => <img key={i} src={u} className="h-16 w-16 rounded object-cover ring-1 ring-neutral-800" />)}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-900">Отмена</button>
          <button onClick={save} disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60">
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}



