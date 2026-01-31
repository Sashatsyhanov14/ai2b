"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  city: string;
  builder_name?: string | null;
  stage?: string | null;
  quarter?: number | null;
  year?: number | null;
};

function formatDelivery(quarter?: number | null, year?: number | null) {
  if (!quarter && !year) return "—";
  if (quarter && year) return `${quarter} кв. ${year}`;
  if (year) return String(year);
  return "—";
}

function formatStage(stage?: string | null) {
  if (!stage) return "—";
  if (stage === "pre-sales") return "Предстарт";
  if (stage === "construction") return "Строится";
  if (stage === "commissioned") return "Сдан";
  return stage;
}

export default function DeveloperProjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/developer-projects");
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setRows(j.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Удалить проект?")) return;
    const res = await fetch(`/api/developer-projects/${id}`, {
      method: "DELETE",
    });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || "Не удалось удалить проект");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">
            Проекты застройщика
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Список жилых комплексов, по которым вы ведёте продажи.
          </p>
        </div>
        <Link href="/app/sales/new/project" className="btn btn-primary">
          + Новый проект
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm text-neutral-200">
            <thead className="bg-neutral-900/70 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3 text-left">Название ЖК</th>
                <th className="px-3 py-3 text-left">Город</th>
                <th className="px-3 py-3 text-left">Застройщик</th>
                <th className="px-3 py-3 text-left">Срок сдачи</th>
                <th className="px-3 py-3 text-left">Статус</th>
                <th className="px-3 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-neutral-400"
                  >
                    Загрузка проектов…
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-red-300"
                  >
                    Ошибка загрузки: {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-neutral-400"
                  >
                    Пока нет проектов. Добавьте первый.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/70"
                  >
                    <td className="px-3 py-3 align-top text-sm">{p.name}</td>
                    <td className="px-3 py-3 align-top text-sm">{p.city}</td>
                    <td className="px-3 py-3 align-top text-sm">
                      {p.builder_name || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {formatDelivery(p.quarter, p.year)}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {formatStage(p.stage)}
                    </td>
                    <td className="px-3 py-3 align-top text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label="Редактировать проект"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() =>
                            alert(
                              "Редактирование проекта будет добавлено позже.",
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить проект"
                          className="inline-flex items-center justify-center rounded-full border border-red-700 bg-red-900/20 p-1.5 text-red-300 hover:bg-red-900/40"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

