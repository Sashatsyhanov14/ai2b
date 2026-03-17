"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import RentalCalendarModal from "@/components/rentals/RentalCalendarModal";
import ImportFromSalesModal from "@/components/rentals/ImportFromSalesModal";

type RentalUnit = {
    id: string;
    city: string;
    address: string;
    bedrooms: number;
    price_per_day: number | null;
    price_per_month: number | null;
    max_guests: number | null;
    is_active: boolean;
    created_at: string;
};

function formatPrice(value?: number | null) {
    if (value == null) return "—";
    try {
        return value.toLocaleString("ru-RU") + " €";
    } catch {
        return String(value) + " €";
    }
}

export default function RentalsPage() {
    const router = useRouter();
    const [units, setUnits] = useState<RentalUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [calendarUnitId, setCalendarUnitId] = useState<string | null>(null);
    const [showImport, setShowImport] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/rentals");
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(json?.error || `HTTP ${res.status}`);
                }
                if (!cancelled && Array.isArray(json.units)) {
                    setUnits(json.units);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Не удалось загрузить объекты аренды");
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
        if (!confirm("Вы уверены, что хотите удалить этот объект аренды?")) return;
        try {
            const res = await fetch(`/api/rentals/${id}`, { method: "DELETE" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.error || `HTTP ${res.status}`);
            }
            setUnits((prev) => prev.filter((u) => u.id !== id));
        } catch (e: any) {
            alert(e?.message || "Ошибка при удалении");
        }
    }

    async function handleToggleActive(id: string, current: boolean) {
        try {
            const res = await fetch(`/api/rentals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !current }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Error");
            setUnits((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !current } : u));
        } catch (e: any) {
            alert(e?.message || "Ошибка");
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-50">Аренда — объекты</h1>
                    <p className="mt-1 text-sm text-neutral-400">Управление объектами посуточной и долгосрочной аренды.</p>
                </div>
                <div className="flex flex-col items-end gap-2 sm:flex-row">
                    <button
                        onClick={() => setShowImport(true)}
                        className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        ↩ Импорт из продажи
                    </button>
                    <Button onClick={() => router.push("/app/rentals/new")}>
                        + Добавить объект
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
                                <th className="px-3 py-3 text-left">Спален</th>
                                <th className="px-3 py-3 text-left">Гостей (макс)</th>
                                <th className="px-3 py-3 text-left">Цена / день</th>
                                <th className="px-3 py-3 text-left">Цена / месяц</th>
                                <th className="px-3 py-3 text-center">Актив.</th>
                                <th className="px-3 py-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-neutral-400">
                                        Загрузка списка...
                                    </td>
                                </tr>
                            )}
                            {error && !loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-300">
                                        Ошибка: {error}
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-400">
                                        Пока нет объектов аренды. Добавьте первый.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                !error &&
                                filtered.map((u) => (
                                    <tr key={u.id} className="border-t border-neutral-800 hover:bg-neutral-900/70">
                                        <td className="px-3 py-3 align-top text-sm">{u.city}</td>
                                        <td className="px-3 py-3 align-top text-sm">
                                            <div className="max-w-xs truncate" title={u.address}>
                                                {u.address}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-sm">{u.bedrooms ?? "—"}</td>
                                        <td className="px-3 py-3 align-top text-sm">{u.max_guests ?? "—"}</td>
                                        <td className="px-3 py-3 align-top text-sm">{formatPrice(u.price_per_day)}</td>
                                        <td className="px-3 py-3 align-top text-sm">{formatPrice(u.price_per_month)}</td>
                                        <td className="px-3 py-3 align-middle text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(u.id, u.is_active)}
                                                title={u.is_active ? "Активен — нажать чтобы скрыть" : "Скрыт — нажать чтобы активировать"}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${u.is_active
                                                        ? "bg-emerald-600 border-emerald-500"
                                                        : "bg-neutral-700 border-neutral-600"
                                                    }`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${u.is_active ? "translate-x-4" : "translate-x-0.5"
                                                    }`} />
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 align-top text-right text-sm">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    aria-label="Редактировать объект"
                                                    className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                                                    onClick={() => router.push(`/app/rentals/edit/${u.id}`)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="Календарь бронирований"
                                                    className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                                                    onClick={() => setCalendarUnitId(u.id)}
                                                >
                                                    <CalendarDays className="h-4 w-4" />
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

            {calendarUnitId && (
                <RentalCalendarModal
                    unitId={calendarUnitId}
                    onClose={() => setCalendarUnitId(null)}
                />
            )}

            {showImport && (
                <ImportFromSalesModal
                    onClose={() => setShowImport(false)}
                    onImported={async () => {
                        setShowImport(false);
                        const res = await fetch("/api/rentals");
                        const json = await res.json();
                        if (json.units) setUnits(json.units);
                    }}
                />
            )}
        </div>
    );
}
