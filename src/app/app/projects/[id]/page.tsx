"use client";
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getProject, updateProject, type Project } from '@/lib/devProjectsMock';

export default function ProjectPage(){
  const { id } = useParams<{id:string}>();
  const [proj, setProj] = useState<Project|undefined>();
  const [tab, setTab] = useState<'inventory'|'types'|'media'|'settings'|'leads'>('inventory');
  useEffect(()=>{ setProj(getProject(id)); },[id]);

  const lots = proj?.lots || [];
  const types = proj?.types || [];

  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = useMemo(()=> lots.filter(l => {
    const okS = !filterSection || l.section===filterSection;
    const okSt = !filterStatus || l.status===filterStatus as any;
    return okS && okSt;
  }), [lots, filterSection, filterStatus]);

  if (!proj) return <div className="text-zinc-400">Проект не найден</div>;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{proj.name} — {proj.city}</h1>
          <div className="text-sm text-zinc-400">Секции: {proj.sections.join(', ')}</div>
        </div>
        <div className="flex gap-2">
          {(['inventory','types','media','settings','leads'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`rounded-lg border px-3 py-1.5 text-sm ${tab===t?'border-zinc-500 bg-zinc-900':'border-zinc-700 hover:bg-zinc-900'}`}>
              {t==='inventory'?'Инвентарь':t==='types'?'Типы':t==='media'?'Медиа':t==='settings'?'Настройки':'Лиды'}
            </button>
          ))}
        </div>
      </header>

      {tab==='inventory' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Секция</label>
              <select value={filterSection} onChange={e=>setFilterSection(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm">
                <option value="">Все</option>
                {proj.sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Статус</label>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm">
                <option value="">Все</option>
                <option value="available">available</option>
                <option value="reserved">reserved</option>
                <option value="sold">sold</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left">Лот №</th>
                  <th className="px-3 py-2 text-left">Секция</th>
                  <th className="px-3 py-2 text-left">Этаж</th>
                  <th className="px-3 py-2 text-left">Тип</th>
                  <th className="px-3 py-2 text-left">Площадь</th>
                  <th className="px-3 py-2 text-left">Цена</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td className="px-3 py-4 text-zinc-400" colSpan={7}>Пока нет лотов</td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{l.number}</td>
                    <td className="px-3 py-2">{l.section}</td>
                    <td className="px-3 py-2">{l.floor}</td>
                    <td className="px-3 py-2">{types.find(t=>t.id===l.type_id)?.title ?? '-'}</td>
                    <td className="px-3 py-2">{l.area}</td>
                    <td className="px-3 py-2">{l.price.toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='types' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">Тип</th>
                <th className="px-3 py-2 text-left">Площадь</th>
                <th className="px-3 py-2 text-left">Цена от</th>
              </tr>
            </thead>
            <tbody>
              {types.length===0 ? (
                <tr><td className="px-3 py-4 text-zinc-400" colSpan={3}>Пока нет типов</td></tr>
              ) : types.map(t => (
                <tr key={t.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{t.title}</td>
                  <td className="px-3 py-2">{t.area_from}–{t.area_to} м² ({t.finish})</td>
                  <td className="px-3 py-2">{t.price_from.toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='media' && (
        <div className="text-zinc-400 text-sm">Медиа (рендеры/генплан) — позже подключим загрузку.</div>
      )}

      {tab==='settings' && (
        <div className="text-zinc-400 text-sm">Настройки проекта (цвета статусов, правила надбавок) — заглушка.</div>
      )}

      {tab==='leads' && (
        <div className="text-zinc-400 text-sm">Лиды — временно пусто.</div>
      )}
    </div>
  );
}

