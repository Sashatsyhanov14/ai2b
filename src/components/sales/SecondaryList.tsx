"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import type { Unit } from '@/types/units';

function statusBadge(s: Unit['status']) {
  const map: Record<string, string> = {
    available: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30',
    reserved: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
    sold: 'bg-red-600/20 text-red-300 border-red-600/30',
  };
  const label: Record<string, string> = {
    available: 'Доступна',
    reserved: 'Бронь',
    sold: 'Продано',
  };
  return <span className={`rounded border px-2 py-0.5 text-xs ${map[s || ''] || ''}`}>{label[s || ''] || s}</span>;
}

function downloadCsv(rows: Unit[]) {
  const header = [
    'id',
    'city',
    'address',
    'rooms',
    'floor',
    'floors_total',
    'area_m2',
    'finish',
    'price',
    'status',
    'created_at',
  ];
  const escape = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""') + '"';
  const lines = [header.join(',')].concat(
    rows.map((u) =>
      [
        u.id,
        u.city,
        u.address,
        String(u.rooms ?? ''),
        u.floor,
        (u as any).floors_total,
        u.area_m2,
        (u as any).finish ?? '',
        u.price,
        u.status ?? '',
        u.created_at,
      ]
        .map(escape)
        .join(',')
    )
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'secondary_units.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function SecondaryList() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Unit[]>([])
  const [total, setTotal] = useState(0)

  const city = sp.get('city') || ''
  const rooms = sp.get('rooms') || ''
  const status = sp.get('status') || ''
  const priceFrom = sp.get('priceFrom') || ''
  const priceTo = sp.get('priceTo') || ''
  const query = sp.get('search') || ''
  const page = Number(sp.get('page') || 1)
  const limit = Number(sp.get('limit') || 20)

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(sp.toString())
    if (val) p.set(key, val)
    else p.delete(key)
    if (['city', 'rooms', 'status', 'priceFrom', 'priceTo', 'search'].includes(key)) p.set('page', '1')
    router.replace(pathname + '?' + p.toString())
  }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/units?type=sale')
    const j = await res.json().catch(() => ({}))
    const units: Unit[] = (j && Array.isArray(j.units)) ? j.units : []

    // client-side filtering
    const filtered = units.filter((u) => {
      if (city && u.city !== city) return false
      if (rooms) {
        const r = rooms.toLowerCase()
        const roomVal = u.rooms ?? 0
        if (r === 'studio') {
          if (roomVal !== 0) return false
        } else if (r === '4+' || r === '4plus') {
          if (roomVal < 4) return false
        } else if (roomVal !== Number(rooms)) return false
      }
      if (status && u.status !== status) return false
      if (priceFrom && (u.price ?? 0) < Number(priceFrom)) return false
      if (priceTo && (u.price ?? 0) > Number(priceTo)) return false
      if (query && !(u.address || '').toLowerCase().includes(query.toLowerCase())) return false
      return true
    })

    const totalFiltered = filtered.length
    const start = (page - 1) * limit
    const end = start + limit
    setRows(filtered.slice(start, end))
    setTotal(totalFiltered)
    setLoading(false)
  }

  useEffect(() => { load() }, [city, rooms, status, priceFrom, priceTo, query, page, limit])

  const cities = useMemo(() => Array.from(new Set(rows.map((u) => u.city))).sort(), [rows])

  const maxPage = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Field label="Город">
          <select
            aria-label="Город"
            value={city}
            onChange={(e) => setParam('city', e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">Все</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Комнат">
          <select
            aria-label="Комнат"
            value={rooms}
            onChange={(e) => setParam('rooms', e.target.value)}
            className="min-w[120px]"
          >
            <option value="">Все</option>
            <option value="studio">Студия</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4+">4+</option>
          </select>
        </Field>

        <Field label="Цена от">
          <input
            aria-label="Цена от"
            type="number"
            value={priceFrom}
            onChange={(e) => setParam('priceFrom', e.target.value)}
            className="w-32"
            placeholder="0"
          />
        </Field>
        <Field label="до">
          <input
            aria-label="Цена до"
            type="number"
            value={priceTo}
            onChange={(e) => setParam('priceTo', e.target.value)}
            className="w-32"
            placeholder="∞"
          />
        </Field>

        <Field label="Статус">
          <select
            aria-label="Статус"
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            className="min-w-[140px]"
          >
            <option value="">Все</option>
            <option value="available">Доступна</option>
            <option value="reserved">Бронь</option>
            <option value="sold">Продано</option>
          </select>
        </Field>

        <div className="ml-auto flex items-start gap-2">
          <Field label="Поиск по адресу">
            <input
              aria-label="Поиск по адресу"
              placeholder="Поиск по адресу"
              value={query}
              onChange={(e) => setParam('search', e.target.value)}
              className="w-60"
            />
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <Button variant="secondary" onClick={() => downloadCsv(rows)}>
              Экспорт CSV
            </Button>
            <Link href="/app/sales/secondary/new">
              <Button>+ Новая квартира</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Город</th>
              <th className="px-3 py-2 text-left">Адрес</th>
              <th className="px-3 py-2 text-left">Комнат</th>
              <th className="px-3 py-2 text-left">Эт./Эт-ть</th>
              <th className="px-3 py-2 text-left">Площадь (м²)</th>
              <th className="px-3 py-2 text-left">Цена</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-left">Фото</th>
              <th className="px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4 text-white/60" colSpan={9}>Загрузка…</td></tr>
            ) : rows.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">{u.city}</td>
                <td className="px-3 py-2">{u.address}</td>
                <td className="px-3 py-2">{u.rooms === 0 ? 'Студия' : u.rooms}</td>
                <td className="px-3 py-2">
                  {u.floor}/{(u as any).floors_total}
                </td>
                <td className="px-3 py-2">{u.area_m2}</td>
                <td className="px-3 py-2">{(u.price ?? 0).toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2">{u.status ? statusBadge(u.status) : '-'}</td>
                <td className="px-3 py-2">{u.photos_count ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link href={`/app/sales/secondary/${u.id}`} className="rounded border border-white/15 px-2 py-1 hover:bg-white/10">Редактировать</Link>
                    <button
                      onClick={() => alert('Скоро: предпросмотр карточки объекта')}
                      className="rounded border border-white/15 px-2 py-1 hover:bg-white/10"
                    >
                      Просмотр
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Точно удалить?')) return
                        const res = await fetch(`/api/units/${u.id}`, { method: 'DELETE' })
                        const j = await res.json().catch(() => ({}))
                        if (!j?.ok) alert(j?.error || 'Ошибка удаления')
                        await load()
                      }}
                      className="rounded border border-red-600/40 px-2 py-1 text-red-300 hover:bg-red-600/10"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-white/60">
                  Ничего не найдено.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">Всего: {total}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setParam('page', String(Math.max(1, page - 1)))}
          >Назад</Button>
          <div className="text-sm">{page} / {Math.max(1, Math.ceil(total / limit))}</div>
          <Button
            variant="secondary"
            disabled={page >= Math.max(1, Math.ceil(total / limit))}
            onClick={() => setParam('page', String(Math.min(Math.max(1, Math.ceil(total / limit)), page + 1)))}
          >Вперед</Button>
        </div>
      </div>
    </div>
  );
}
