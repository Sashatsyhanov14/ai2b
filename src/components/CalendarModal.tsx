"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { X, Trash2 } from "lucide-react";

type Booking = {
  id: string;
  start_utc: string;
  end_utc: string;
  status: string;
  guest_name?: string | null;
};

type Props = {
  unitId: string;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CalendarModal({ unitId, onClose, onCreated }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/bookings?unit_id=${unitId}`);
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setBookings(j.data || []);
    else alert(j?.error || "Не удалось загрузить бронирования");
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  async function add() {
    if (!newStart || !newEnd) {
      alert("Выбери даты заезда и выезда.");
      return;
    }

    const start = dayjs(newStart);
    const end = dayjs(newEnd);

    if (!end.isSame(start) && !end.isAfter(start)) {
      alert("Дата выезда должна быть не раньше даты заезда.");
      return;
    }

    setSaving(true);
    const startISO = start.startOf("day").toDate().toISOString();
    // считаем end_utc как начало следующего дня, чтобы диапазон был [start, end)
    const endISO = end.add(1, "day").startOf("day").toDate().toISOString();

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: unitId, start_utc: startISO, end_utc: endISO, status: "confirmed" }),
    });

    const j = await res.json().catch(() => ({}));
    setSaving(false);

    if (!j?.ok) {
      alert(j?.error || "Не удалось создать бронь");
      return;
    }

    setNewStart("");
    setNewEnd("");
    await load();
    onCreated?.();
  }

  async function remove(id: string) {
    if (!confirm("Удалить бронь?")) return;
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!j?.ok) {
      alert(j?.error || "Не удалось удалить бронь");
      return;
    }
    await load();
    onCreated?.();
  }

  const fmt = (s: string) => dayjs(s).format("DD.MM.YYYY");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">Календарь занятости</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Отмечай даты, когда квартира занята. Бот будет использовать эти интервалы, чтобы не предлагать объект
              в уже забронированные дни.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-700 bg-neutral-900/80 p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-200">Новая бронь</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Укажи даты заезда и выезда. Дата выезда не входит в период проживания.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-neutral-400">Заезд</label>
                <input
                  type="date"
                  className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-neutral-400">Выезд</label>
                <input
                  type="date"
                  className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={saving}
              onClick={add}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Сохранение…" : "Добавить бронь"}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-200">Брони</h3>
            {loading ? (
              <div className="text-sm text-neutral-400">Загрузка…</div>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/60 px-4 py-6 text-sm text-neutral-400">
                Пока нет броней. Добавь первую, чтобы бот знал, когда квартира занята.
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-100"
                  >
                    <div className="mr-3">
                      <div>
                        {fmt(b.start_utc)} — {fmt(b.end_utc)}
                      </div>
                      {b.guest_name && (
                        <div className="text-xs text-neutral-400">Гость: {b.guest_name}</div>
                      )}
                    </div>
                    <button
                      onClick={() => remove(b.id)}
                      className="inline-flex items-center justify-center rounded-full border border-red-700 bg-red-900/30 p-1.5 text-red-300 hover:bg-red-900/50"
                      aria-label="Удалить бронь"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
