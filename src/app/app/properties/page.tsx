"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { Pencil, Trash2, Filter } from "lucide-react";
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

export default function PropertiesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all units. The API now returns all categories if none specified or handles it
        const res = await fetch("/api/units"); 
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
    return units.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || 
        (u.city || "").toLowerCase().includes(q) || 
        (u.address || "").toLowerCase().includes(q);
      
      const matchesCategory = categoryFilter === "all" || u.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [units, search, categoryFilter]);

  async function handleDelete(id: string) {
    if (!confirm(t("properties.deleteConfirm") || "Удалить объект?")) return;
    try {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e?.message || t("common.error"));
    }
  }

  const categories = [
    { id: "all", label: t("properties.categoryAll") || "Все" },
    { id: "sale", label: t("properties.categorySale") || "Продажа" },
    { id: "rent", label: t("properties.categoryRent") || "Аренда" },
    { id: "commercial", label: t("properties.categoryCommercial") || "Коммерция" },
    { id: "land", label: t("properties.categoryLand") || "Земля" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">
            {t("properties.title") || "Объекты недвижимости"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {t("properties.description") || "Управление всеми объектами"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row">
          <Button onClick={() => router.push("/app/units/new")}>
            {t("properties.addUnit") || "+ Добавить объект"}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("properties.searchPlaceholder") || "Поиск..."}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-neutral-500 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-neutral-800/50 text-neutral-400 border border-transparent hover:bg-neutral-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="hidden text-xs text-neutral-500 sm:block shrink-0">
          {t("properties.found") || "Найдено"}: {filtered.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="max-h-[65vh] overflow-y-auto">
          <table className="min-w-full text-sm text-neutral-200">
            <thead className="sticky top-0 z-10 bg-neutral-900/90 backdrop-blur text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3 text-left w-12">Фото</th>
                <th className="px-3 py-3 text-left">{t("properties.fields.category") || "Категория"}</th>
                <th className="px-3 py-3 text-left">{t("properties.fields.city") || "Город"}</th>
                <th className="px-3 py-3 text-left">{t("properties.fields.address") || "Адрес"}</th>
                <th className="px-3 py-3 text-left">{t("properties.fields.price") || "Цена"}</th>
                <th className="px-3 py-3 text-left">{t("properties.fields.status") || "Статус"}</th>
                <th className="px-3 py-3 text-right">{t("properties.actions") || "Действия"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                       <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                       <span>{t("properties.loadingCount") || "Загрузка..."}</span>
                    </div>
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-400">
                    {t("common.error")}: {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-neutral-500">
                    {t("properties.empty") || "Ничего не найдено"}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.map((u) => (
                <tr key={u.id} className="group hover:bg-neutral-800/30 transition-colors">
                  <td className="px-3 py-3">
                    {Array.isArray(u.photos) && u.photos[0] ? (
                      <img
                        src={u.photos[0]}
                        alt=""
                        className="h-10 w-14 rounded-lg object-cover border border-neutral-800"
                      />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-neutral-800/50 border border-neutral-700/30 flex items-center justify-center text-[10px] text-neutral-600">
                        НЕТ
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      u.category === 'sale' ? 'bg-blue-500/10 text-blue-400' :
                      u.category === 'rent' ? 'bg-emerald-500/10 text-emerald-400' :
                      u.category === 'commercial' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {u.category === 'sale' ? t("properties.categorySale") :
                       u.category === 'rent' ? t("properties.categoryRent") :
                       u.category === 'commercial' ? t("properties.categoryCommercial") :
                       t("properties.categoryLand")}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-neutral-300">{u.city}</td>
                  <td className="px-3 py-3">
                     <div className="max-w-[200px] truncate text-neutral-400" title={u.address}>
                        {u.address}
                     </div>
                  </td>
                  <td className="px-3 py-3 text-neutral-200">
                    {u.category === 'rent' ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-emerald-400">{formatPrice(u.price_per_day)} €</span>
                        <span className="text-[10px] text-neutral-500">/ сутки</span>
                      </div>
                    ) : (
                       <span className="font-semibold text-neutral-100">{formatPrice(u.price)} €</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                       <div className={`h-1.5 w-1.5 rounded-full ${
                         u.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                         u.status === 'reserved' ? 'bg-amber-500' : 'bg-neutral-600'
                       }`} />
                       <span className="text-xs">{u.status === 'available' ? 'Активен' : u.status === 'reserved' ? 'Бронь' : 'Продан'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/app/units/edit/${u.id}`)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="rounded-lg border border-red-950 bg-red-950/20 p-1.5 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
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
