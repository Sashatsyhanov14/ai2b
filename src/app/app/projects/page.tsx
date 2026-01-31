"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listProjects, removeProject, type Project } from '@/lib/devProjectsMock';

export default function ProjectsPage(){
  const [items, setItems] = useState<Project[]>([]);
  const load = () => setItems(listProjects());
  useEffect(load, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Проекты застройщика</h1>
        <Link href="/app/projects/new" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">+ Добавить проект</Link>
      </header>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50 text-zinc-300">
            <tr>
              <th className="px-3 py-2 text-left">ЖК</th>
              <th className="px-3 py-2 text-left">Застройщик</th>
              <th className="px-3 py-2 text-left">Город</th>
              <th className="px-3 py-2 text-left">Стадия</th>
              <th className="px-3 py-2 text-left">Срок сдачи</th>
              <th className="px-3 py-2 text-left">Секции</th>
              <th className="px-3 py-2 text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length===0 ? (
              <tr><td className="px-3 py-4 text-zinc-400" colSpan={7}>Пока нет проектов</td></tr>
            ) : items.map(p => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.developer}</td>
                <td className="px-3 py-2">{p.city}</td>
                <td className="px-3 py-2">{p.stage ?? '-'}</td>
                <td className="px-3 py-2">{p.quarter ? `${p.quarter} кв ${p.year}` : '-'}</td>
                <td className="px-3 py-2">{p.sections.join(', ')}</td>
                <td className="px-3 py-2 flex gap-2">
                  <Link href={`/app/projects/${p.id}`} className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-900">Открыть</Link>
                  <button onClick={() => { if(confirm('Удалить проект?')) { removeProject(p.id); load(); } }} className="rounded-md border border-red-700/60 px-2 py-1 text-red-300 hover:bg-red-950/40">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

