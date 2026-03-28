"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { Pencil, Trash2 } from "lucide-react";
import type { Unit } from "@/types/units";
import { Button } from "@/components/ui/Button";

export default function LandPage() {
  const { t } = useI18n();
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
        const res = await fetch("/api/units?category=land");
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
    if (!confirm(t("land.deleteConfirm"))) return;
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">
            {t("land.title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {t("land.description")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row">
          <Button onClick={() => router.push("/app/land/new")}>
            {t("land.addLand")}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("land.searchPlaceholder")}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="hidden text-xs text-neutral-500 sm:block">
          {t("land.found")}: {filtered.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm text-neutral-200">
            <thead className="bg-neutral-900/70 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3 text-left w-12">Фото</th>
                <th className="px-3 py-3 text-left">{t("land.fields.city")}</th>
                <th className="px-3 py-3 text-left">{t("land.fields.address")}</th>
                <th className="px-3 py-3 text-left">{t("land.fields.area")}</th>
                <th className="px-3 py-3 text-left">{t("land.fields.price")}, €</th>
                <th className="px-3 py-3 text-left">{t("land.fields.status")}</th>
                <th className="px-3 py-3 text-right">{t("sales.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral-400">
                    {t("land.loadingCount")}
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-red-300">
                    {t("common.error")}: {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                    {t("land.empty")}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.map((u) => (
                <tr key={u.id} className="border-t border-neutral-800 hover:bg-neutral-900/70">
                  <td className="px-3 py-2 align-middle">
                    {Array.isArray(u.photos) && u.photos[0] ? (
                      <img src={u.photos[0]} alt="" className="h-10 w-14 rounded-lg object-cover border border-neutral-800 shadow" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-600 text-[9px]">нет</div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-sm">{u.category}</td>
                  <td className="px-3 py-3 align-top text-sm truncate max-w-xs">{u.address}</td>
                  <td className="px-3 py-3 align-top text-sm">{u.area_m2}</td>
                  <td className="px-3 py-3 align-top text-sm font-medium text-emerald-400">
                    {u.price?.toLocaleString()} €
                  </td>
                  <td className="px-3 py-3 align-top text-sm">{u.status}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => router.push(`/app/land/edit/${u.id}`)} className="text-neutral-400 hover:text-white transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="text-neutral-400 hover:text-red-500 transition-colors">
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
