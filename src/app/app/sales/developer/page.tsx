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

export default function DevProjectsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/developer-projects");
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setRows(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-50">
          Проекты застройщика
        </h1>
        <Link href="/app/sales/developer/new" className="btn btn-primary btn--sm">
          + Новый проект
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm text-neutral-300">
            <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 text-left">Название</th>
                <th className="px-3 py-2 text-left">Застройщик</th>
                <th className="px-3 py-2 text-left">Город</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Срок сдачи</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-neutral-400"
                    colSpan={6}
                  >
                    Загрузка…
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-neutral-800"
                  >
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.builder_name || "—"}</td>
                    <td className="px-3 py-2">{p.city}</td>
                    <td className="px-3 py-2">{p.stage || "—"}</td>
                    <td className="px-3 py-2">
                      {p.quarter
                        ? `${p.quarter} кв. ${p.year ?? ""}`
                        : p.year ?? "—"}
                    </td>
                    <td className="px-3 py-2">
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
                          onClick={async () => {
                            if (!confirm("Удалить проект?")) return;
                            const res = await fetch(
                              `/api/developer-projects/${p.id}`,
                              {
                                method: "DELETE",
                              },
                            );
                            const j = await res.json().catch(() => ({}));
                            if (!j?.ok) {
                              alert(
                                j?.error ||
                                  "Не удалось удалить проект",
                              );
                            } else {
                              await load();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-neutral-400"
                  >
                    Пока нет проектов.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

