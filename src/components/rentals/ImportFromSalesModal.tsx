"use client";

import { useEffect, useState } from "react";
import { X, Search, ArrowRight, Check, AlertCircle, ArrowLeft } from "lucide-react";

type SalesUnit = {
    id: string;
    title: string | null;
    city: string;
    address: string | null;
    description: string | null;
    rooms: string | null;
    area_m2: number | null;
    floor: number | null;
    photos: string[];
    i18n?: any;
};

type Props = {
    onClose: () => void;
    onImported: () => void;
};

export default function ImportFromSalesModal({ onClose, onImported }: Props) {
    const [units, setUnits] = useState<SalesUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<SalesUnit | null>(null);

    // Rental-specific fields to fill
    const [form, setForm] = useState({
        price_per_day: "",
        price_per_month: "",
        bedrooms: "",
        bathrooms: "",
        max_guests: "",
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchUnits() {
            try {
                const res = await fetch("/api/units");
                const json = await res.json();
                if (json.units) setUnits(json.units);
            } catch (e) {
                console.error("Failed to load sales units", e);
            } finally {
                setLoading(false);
            }
        }
        fetchUnits();
    }, []);

    const filtered = units.filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            (u.city || "").toLowerCase().includes(q) ||
            (u.address || "").toLowerCase().includes(q) ||
            (u.title || "").toLowerCase().includes(q)
        );
    });

    function selectUnit(u: SalesUnit) {
        setSelected(u);
        // Pre-fill bedrooms from rooms count if available
        setForm({
            price_per_day: "",
            price_per_month: "",
            bedrooms: u.rooms ? String(parseInt(u.rooms) || "") : "",
            bathrooms: "",
            max_guests: "",
        });
        setError("");
    }

    async function handleImport() {
        if (!selected) return;
        setError("");

        if (!form.price_per_day && !form.price_per_month) {
            setError("Укажите хотя бы одну цену — за сутки или за месяц.");
            return;
        }

        setSaving(true);
        try {
            // Get Russian title from i18n if available
            const ruTitle = selected.i18n?.ru?.title || selected.title;
            const ruCity = selected.i18n?.ru?.city || selected.city;
            const ruAddress = selected.i18n?.ru?.address || selected.address;
            const ruDescription = selected.i18n?.ru?.description || selected.description;

            const payload = {
                title: ruTitle,
                city: ruCity,
                address: ruAddress,
                description: ruDescription,
                price_per_day: form.price_per_day ? Number(form.price_per_day) : null,
                price_per_month: form.price_per_month ? Number(form.price_per_month) : null,
                bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
                bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
                max_guests: form.max_guests ? Number(form.max_guests) : null,
                photos: selected.photos || [],
            };

            const res = await fetch("/api/rentals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Ошибка при импорте");

            onImported();
            onClose();
        } catch (e: any) {
            setError(e.message || "Неизвестная ошибка");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
                    <div className="flex items-center gap-3">
                        {selected && (
                            <button
                                onClick={() => setSelected(null)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                {selected ? "Настройка аренды" : "Импорт из продажи"}
                            </h2>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {selected
                                    ? "Заполните параметры аренды для выбранной квартиры"
                                    : "Выберите квартиру из раздела продажи"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Step 1: Unit selection */}
                {!selected && (
                    <>
                        <div className="px-6 py-3 border-b border-neutral-800 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-4 py-2 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500"
                                    placeholder="Поиск по городу, адресу..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {loading ? (
                                <p className="text-neutral-400 text-sm text-center py-10">Загрузка квартир...</p>
                            ) : filtered.length === 0 ? (
                                <p className="text-neutral-500 text-sm text-center py-10">Ничего не найдено.</p>
                            ) : (
                                <div className="divide-y divide-neutral-800">
                                    {filtered.map((u) => (
                                        <button
                                            key={u.id}
                                            onClick={() => selectUnit(u)}
                                            className="w-full flex items-center gap-4 px-6 py-3 hover:bg-neutral-900/70 transition-colors text-left group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-12 w-16 rounded-lg overflow-hidden shrink-0 bg-neutral-800 border border-neutral-700">
                                                {u.photos?.[0] ? (
                                                    <img src={u.photos[0]} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-neutral-600 text-xs">нет фото</div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {u.i18n?.ru?.title || u.title || "Без названия"}
                                                </p>
                                                <p className="text-xs text-neutral-500 truncate">
                                                    {u.i18n?.ru?.city || u.city}{u.address ? `, ${u.i18n?.ru?.address || u.address}` : ""}
                                                </p>
                                                {u.rooms && (
                                                    <p className="text-xs text-neutral-600">{u.rooms} комн.{u.area_m2 ? ` · ${u.area_m2} м²` : ""}</p>
                                                )}
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-300 shrink-0 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Step 2: Fill rental params */}
                {selected && (
                    <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
                        {/* Selected unit preview */}
                        <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                            {selected.photos?.[0] && (
                                <img src={selected.photos[0]} alt="" className="h-14 w-20 rounded-lg object-cover shrink-0 border border-neutral-700" />
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {selected.i18n?.ru?.title || selected.title || "Без названия"}
                                </p>
                                <p className="text-xs text-neutral-400 truncate">
                                    {selected.i18n?.ru?.city || selected.city}{selected.address ? `, ${selected.i18n?.ru?.address || selected.address}` : ""}
                                </p>
                                {selected.rooms && (
                                    <p className="text-xs text-neutral-600">{selected.rooms} комн.{selected.area_m2 ? ` · ${selected.area_m2} м²` : ""}</p>
                                )}
                            </div>
                        </div>

                        {/* Rental-specific params */}
                        <div>
                            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Цены аренды</p>
                            <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-900/30">
                                <div className="grid grid-cols-2 divide-x divide-neutral-800">
                                    <div className="p-4">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">
                                            Цена в сутки (€/день)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-2xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none tabular-nums"
                                            placeholder="0"
                                            value={form.price_per_day}
                                            onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
                                        />
                                    </div>
                                    <div className="p-4">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">
                                            Цена в месяц (€/мес)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-2xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none tabular-nums"
                                            placeholder="0"
                                            value={form.price_per_month}
                                            onChange={(e) => setForm((f) => ({ ...f, price_per_month: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Параметры объекта</p>
                            <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-900/30">
                                <div className="grid grid-cols-3 divide-x divide-neutral-800">
                                    <div className="p-3 text-center">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">
                                            Спален
                                        </label>
                                        <p className="text-[9px] text-neutral-600 mb-1">из продажи: {selected.rooms || "—"}</p>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                            placeholder="1"
                                            value={form.bedrooms}
                                            onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
                                        />
                                    </div>
                                    <div className="p-3 text-center">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">
                                            Ванных
                                        </label>
                                        <p className="text-[9px] text-neutral-600 mb-1">&nbsp;</p>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                            placeholder="1"
                                            value={form.bathrooms}
                                            onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
                                        />
                                    </div>
                                    <div className="p-3 text-center">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">
                                            Макс. гостей
                                        </label>
                                        <p className="text-[9px] text-neutral-600 mb-1">&nbsp;</p>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                            placeholder="2"
                                            value={form.max_guests}
                                            onChange={(e) => setForm((f) => ({ ...f, max_guests: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-neutral-600 mt-2 ml-1">
                                💡 Название, адрес, город, описание и фотографии будут скопированы автоматически.
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer for step 2 */}
                {selected && (
                    <div className="px-6 py-4 border-t border-neutral-800 shrink-0">
                        <button
                            onClick={handleImport}
                            disabled={saving}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        >
                            <Check className="h-4 w-4" />
                            {saving ? "Импорт..." : "Добавить в аренду"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
