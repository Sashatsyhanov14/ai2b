"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Project = {
  id: string;
  name: string;
  city: string;
  builder_name?: string | null;
  stage?: string | null;
  quarter?: number | null;
  year?: number | null;
  description?: string | null;
};

type Unit = {
  id: string;
  address: string;
  project_id?: string | null;
  rooms?: number | null;
  floor?: number | null;
  floors_total?: number | null;
  area?: number | null;
  price?: number | null;
  status?: string | null;
};

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [pRes, uRes] = await Promise.all([
      fetch(`/api/developer-projects/${projectId}`),
      fetch(`/api/units?type=sale`),
    ]);
    const pj = await pRes.json().catch(() => ({}));
    if (pj?.ok) setProject(pj.data);
    const uj = await uRes.json().catch(() => ({}));
    const allUnits: Unit[] = (uj && Array.isArray(uj.units)) ? uj.units : [];
    setUnits(allUnits.filter((u) => u.project_id === projectId));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [projectId]);

  if (loading) return <div className="text-white/70">Загрузка…</div>;
  if (!project) return <div className="text-white/70">Проект не найден</div>;

  return (
    <div>
      <div className="mb-3 text-xl font-semibold">{project.name}</div>

      <div className="mb-4 text-sm text-white/70">
        {project.city} • {project.stage || 'Стадия не указана'} •{' '}
        {project.quarter ? `${project.quarter} кв. ${project.year ?? ''}` : project.year ?? 'Срок не указан'}
      </div>

      <div className="overflow-auto rounded border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-3 py-2 text-left">Адрес</th>
              <th className="px-3 py-2 text-left">Комнат</th>
              <th className="px-3 py-2 text-left">Этаж</th>
              <th className="px-3 py-2 text-left">Площадь (м²)</th>
              <th className="px-3 py-2 text-left">Цена</th>
              <th className="px-3 py-2 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">{u.address}</td>
                <td className="px-3 py-2">{u.rooms === 0 ? 'Студия' : u.rooms ?? ''}</td>
                <td className="px-3 py-2">{u.floor}/{u.floors_total}</td>
                <td className="px-3 py-2">{u.area_m2 ?? ''}</td>
                <td className="px-3 py-2">{(u.price ?? 0).toLocaleString('ru-RU')}</td>
                <td className="px-3 py-2">{u.status ?? '—'}</td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-white/60">
                  Нет квартир, привязанных к этому проекту.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
