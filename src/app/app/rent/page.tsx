"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import CalendarModal from "@/components/CalendarModal";

type RoomsFilter = "all" | "1" | "2" | "3" | "4plus";
type OccupiedFilter = "all" | "free" | "occupied";

type RentDailyUnit = {
  id: string;
  city: string;
  address: string;
  rooms: number;
  price_day: number;
  price_week: number | null;
  allow_pets: boolean;
  description: string | null;
  created_at: string;
};

type RentLongUnit = {
  id: string;
  city: string;
  address: string;
  rooms: number;
  price_month: number;
  min_term: number;
  allow_pets: boolean;
  is_occupied: boolean;
  description: string | null;
  created_at: string;
};

function DailyRentSection() {
  const router = useRouter();

  const [units, setUnits] = useState<RentDailyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityFilter, setCityFilter] = useState("");
  const [roomsFilter, setRoomsFilter] = useState<RoomsFilter>("all");
  const [priceMax, setPriceMax] = useState<string>("");
  const [petsOnly, setPetsOnly] = useState(false);
  const [calendarUnitId, setCalendarUnitId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/rent-daily-units");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        if (!cancelled && Array.isArray(json.units)) {
          setUnits(json.units);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to fetch");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (
        cityFilter &&
        !u.city.toLowerCase().includes(cityFilter.toLowerCase())
      ) {
        return false;
      }

      if (roomsFilter !== "all") {
        if (roomsFilter === "4plus") {
          if (u.rooms < 4) return false;
        } else if (u.rooms !== Number(roomsFilter)) {
          return false;
        }
      }

      if (priceMax) {
        const max = Number(priceMax);
        if (!Number.isNaN(max) && u.price_day > max) return false;
      }

      if (petsOnly && !u.allow_pets) return false;

      return true;
    });
  }, [units, cityFilter, roomsFilter, priceMax, petsOnly]);

  async function handleDelete(id: string) {
    if (!confirm("Удалить объект посуточной аренды?")) return;
    try {
      const res = await fetch(`/api/rent-daily-units/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e?.message || "Не удалось удалить объект.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Посуточно / краткосрочно
        </h2>
        <button
          type="button"
          onClick={() => router.push("/app/rent/daily/new")}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
        >
          + Добавить объект
        </button>
      </div>

      <div className="rounded-xl bg-[#111111] p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Город</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Antalya"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Комнат</label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={roomsFilter}
              onChange={(e) => setRoomsFilter(e.target.value as RoomsFilter)}
            >
              <option value="all">Все</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4plus">4+</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Цена/день до, €
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={petsOnly}
                onChange={(e) => setPetsOnly(e.target.checked)}
              />
              Можно с питомцами
            </label>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-gray-400">
          Загрузка посуточной аренды…
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-lg border border-red-500 bg-red-950 px-4 py-3 text-sm text-red-100">
          Ошибка загрузки: {error}
        </div>
      )}

      {!loading && !error && filteredUnits.length === 0 && (
        <div className="mt-6 text-sm text-gray-400">
          Нет объектов по текущим фильтрам.
        </div>
      )}

      {!loading && !error && filteredUnits.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-800 bg-[#101010]">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm text-gray-200">
              <thead className="bg-[#151515] text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Rooms</th>
                  <th className="px-4 py-3 text-left">Price/day</th>
                  <th className="px-4 py-3 text-left">Pets</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-gray-800 hover:bg-[#181818]"
                  >
                    <td className="px-4 py-3">{u.city}</td>
                    <td className="px-4 py-3">{u.address}</td>
                    <td className="px-4 py-3">{u.rooms}</td>
                    <td className="px-4 py-3">{u.price_day}</td>
                    <td className="px-4 py-3">
                      {u.allow_pets ? "Да" : "Нет"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(u.created_at).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label="Редактировать"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() =>
                            alert(
                              "Редактирование пока недоступно, позже добавим полноценную форму.",
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Календарь"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() => setCalendarUnitId(u.id)}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить"
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
      )}

      {calendarUnitId && (
        <CalendarModal
          unitId={calendarUnitId}
          onClose={() => setCalendarUnitId(null)}
        />
      )}
    </div>
  );
}

function LongRentSection() {
  const router = useRouter();

  const [units, setUnits] = useState<RentLongUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityFilter, setCityFilter] = useState("");
  const [roomsFilter, setRoomsFilter] = useState<RoomsFilter>("all");
  const [priceMax, setPriceMax] = useState<string>("");
  const [petsOnly, setPetsOnly] = useState(false);
  const [occupiedFilter, setOccupiedFilter] =
    useState<OccupiedFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/rent-long-units");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        if (!cancelled && Array.isArray(json.units)) {
          setUnits(json.units);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to fetch");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (
        cityFilter &&
        !u.city.toLowerCase().includes(cityFilter.toLowerCase())
      ) {
        return false;
      }

      if (roomsFilter !== "all") {
        if (roomsFilter === "4plus") {
          if (u.rooms < 4) return false;
        } else if (u.rooms !== Number(roomsFilter)) {
          return false;
        }
      }

      if (priceMax) {
        const max = Number(priceMax);
        if (!Number.isNaN(max) && u.price_month > max) return false;
      }

      if (petsOnly && !u.allow_pets) return false;

      if (occupiedFilter === "free" && u.is_occupied) return false;
      if (occupiedFilter === "occupied" && !u.is_occupied) return false;

      return true;
    });
  }, [units, cityFilter, roomsFilter, priceMax, petsOnly, occupiedFilter]);

  async function handleToggleOccupied(unit: RentLongUnit) {
    const next = !unit.is_occupied;
    try {
      const res = await fetch(`/api/rent-long-units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_occupied: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unit.id ? { ...u, is_occupied: next } : u,
        ),
      );
    } catch (e: any) {
      alert(e?.message || "Не удалось обновить статус занятости.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить объект из долгосрочной аренды?")) return;
    try {
      const res = await fetch(`/api/rent-long-units/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setUnits((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e?.message || "Не удалось удалить объект.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Долгосрочная аренда
        </h2>
        <button
          type="button"
          onClick={() => router.push("/app/rent/long/new")}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
        >
          + Добавить объект
        </button>
      </div>

      <div className="rounded-xl bg-[#111111] p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Город</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Antalya"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Комнат</label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={roomsFilter}
              onChange={(e) => setRoomsFilter(e.target.value as RoomsFilter)}
            >
              <option value="all">Все</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4plus">4+</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Цена/месяц до, €
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Статус</label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-[#191919] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              value={occupiedFilter}
              onChange={(e) =>
                setOccupiedFilter(e.target.value as OccupiedFilter)
              }
            >
              <option value="all">Все</option>
              <option value="free">Свободно</option>
              <option value="occupied">Занято</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={petsOnly}
                onChange={(e) => setPetsOnly(e.target.checked)}
              />
              Можно с питомцами
            </label>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-4 text-sm text-gray-400">
          Загрузка долгосрочной аренды…
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-lg border border-red-500 bg-red-950 px-4 py-3 text-sm text-red-100">
          Ошибка загрузки: {error}
        </div>
      )}

      {!loading && !error && filteredUnits.length === 0 && (
        <div className="mt-6 text-sm text-gray-400">
          Нет объектов по текущим фильтрам.
        </div>
      )}

      {!loading && !error && filteredUnits.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-800 bg-[#101010]">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm text-gray-200">
              <thead className="bg-[#151515] text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Rooms</th>
                  <th className="px-4 py-3 text-left">Price/month</th>
                  <th className="px-4 py-3 text-left">Min term</th>
                  <th className="px-4 py-3 text-left">Pets</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-gray-800 hover:bg-[#181818]"
                  >
                    <td className="px-4 py-3">{u.city}</td>
                    <td className="px-4 py-3">{u.address}</td>
                    <td className="px-4 py-3">{u.rooms}</td>
                    <td className="px-4 py-3">{u.price_month}</td>
                    <td className="px-4 py-3">
                      {u.min_term > 1 ? `${u.min_term} мес` : "1 мес"}
                    </td>
                    <td className="px-4 py-3">
                      {u.allow_pets ? "Да" : "Нет"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          u.is_occupied
                            ? "bg-red-900/40 text-red-300"
                            : "bg-emerald-900/40 text-emerald-300"
                        }`}
                      >
                        {u.is_occupied ? "Занято" : "Свободно"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(u.created_at).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label="Редактировать"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() =>
                            alert(
                              "Редактирование пока недоступно, позже добавим полноценную форму.",
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Изменить статус занятости"
                          className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-emerald-300"
                          onClick={() => handleToggleOccupied(u)}
                        >
                          {u.is_occupied ? "Сделать свободной" : "Сделать занятой"}
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить"
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
      )}
    </div>
  );
}

export default function RentPage() {
  const [tab, setTab] = useState<"daily" | "long">("daily");

  return (
    <div className="h-full w-full px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Аренда</h1>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("daily")}
          className={`rounded-full px-4 py-1.5 text-sm ${
            tab === "daily"
              ? "bg-emerald-500 text-black"
              : "bg-[#171717] text-gray-300 hover:bg-[#222222]"
          }`}
        >
          Посуточно
        </button>
        <button
          type="button"
          onClick={() => setTab("long")}
          className={`rounded-full px-4 py-1.5 text-sm ${
            tab === "long"
              ? "bg-emerald-500 text-black"
              : "bg-[#171717] text-gray-300 hover:bg-[#222222]"
          }`}
        >
          Долгий срок
        </button>
      </div>

      {tab === "daily" ? <DailyRentSection /> : <LongRentSection />}
    </div>
  );
}

