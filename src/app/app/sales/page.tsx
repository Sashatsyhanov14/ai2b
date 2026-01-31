"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Unit } from "@/types/units";
import { Button } from "@/components/ui/Button";

function formatPrice(value?: number | null) {
  if (value == null) return "—";
  try {
    return value.toLocaleString("ru-RU");
  } catch {
    return String(value);
  }
}

function formatStatus(status?: Unit["status"]) {
  if (!status) return "—";
  if (status === "available") return "В продаже";
  if (status === "reserved") return "Бронь";
  if (status === "sold") return "Продано";
  return status;
}

export default function SalesApartmentsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/units?type=sale");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        if (!cancelled && Array.isArray(json.units)) {
          setUnits(json.units);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load units");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => {
      const city = (u.city || "").toLowerCase();
      const addr = (u.address || "").toLowerCase();
      return city.includes(q) || addr.includes(q);
    });
  }, [units, search]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить объект?")) return;
    try {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e?.message || "Не удалось удалить объект");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">
            Продажа — квартиры
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Управление объектами из таблицы{" "}
            <span className="font-mono text-xs text-neutral-300">
              public.units
            </span>
            .
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row">
          <Button onClick={() => router.push("/app/sales/new/apartment")}>
            + Добавить квартиру
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по городу или адресу"
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="hidden text-xs text-neutral-500 sm:block">
          Найдено: {filtered.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm text-neutral-200">
            <thead className="bg-neutral-900/70 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3 text-left">Город</th>
                <th className="px-3 py-3 text-left">Адрес</th>
                <th className="px-3 py-3 text-left">Комнат</th>
                <th className="px-3 py-3 text-left">Этаж</th>
                <th className="px-3 py-3 text-left">Площадь, м²</th>
                <th className="px-3 py-3 text-left">Цена, €</th>
                <th className="px-3 py-3 text-left">Статус</th>
                <th className="px-3 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-neutral-400"
                  >
                    Загрузка списка…
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-red-300"
                  >
                    Ошибка загрузки: {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-neutral-400"
                  >
                    Пока нет квартир. Добавьте первую.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/70"
                  >
                    <td className="px-3 py-3 align-top text-sm">{u.city}</td>
                    <td className="px-3 py-3 align-top text-sm">
                      <div className="max-w-xs truncate" title={u.address}>
                        {u.address}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {u.rooms ?? "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {u.floor != null
                        ? `${u.floor}${
                            u.floors_total ? ` / ${u.floors_total}` : ""
                          }`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {u.area ?? "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {formatPrice(u.price)}
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      {formatStatus(u.status)}
                    </td>
                    <td className="px-3 py-3 align-top text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label="Редактировать объект"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() =>
                            alert(
                              "Редактирование объекта будет добавлено позже.",
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить объект"
                          className="inline-flex items-center justify-center rounded-full border border-red-700 bg-red-900/20 p-1.5 text-red-300 hover:bg-red-900/40"
                          onClick={() => handleDelete(u.id)}
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

