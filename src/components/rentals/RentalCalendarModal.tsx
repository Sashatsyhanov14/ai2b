"use client";

import { useEffect, useState } from "react";
import { X, Plus, Pencil, Trash2, Check, AlertCircle } from "lucide-react";

type Booking = {
    id: string;
    unit_id: number;
    start_date: string;
    end_date: string;
    user_chat_id: string | null;
    status: "reserved" | "blocked" | "confirmed" | "cancelled" | "pending";
    notes?: string | null;
    guest_name?: string | null;
    guest_phone?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Ожидает подтверждения",
    reserved: "Бронь",
    blocked: "Заблокировано",
    confirmed: "Подтверждено",
    cancelled: "Отменено",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "text-orange-400 bg-orange-900/30 border-orange-800",
    reserved: "text-emerald-400 bg-emerald-900/30 border-emerald-800",
    blocked: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
    confirmed: "text-blue-400 bg-blue-900/30 border-blue-800",
    cancelled: "text-neutral-500 bg-neutral-900/30 border-neutral-800",
};

const EMPTY_FORM = {
    start_date: "",
    end_date: "",
    status: "reserved" as Booking["status"],
    user_chat_id: "",
    notes: "",
};

export default function RentalCalendarModal({ unitId, onClose }: { unitId: string; onClose: () => void }) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    async function loadBookings() {
        setLoading(true);
        try {
            const res = await fetch(`/api/rental-bookings?unit_id=${unitId}`);
            const json = await res.json();
            if (json.bookings) setBookings(json.bookings);
        } catch (err) {
            console.error("Failed to load bookings", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadBookings();
    }, [unitId]);

    function handleEdit(b: Booking) {
        setEditingId(b.id);
        setForm({
            start_date: b.start_date,
            end_date: b.end_date,
            status: b.status,
            user_chat_id: b.user_chat_id || "",
            notes: b.notes || "",
        });
        setShowForm(true);
        setFormError("");
    }

    function handleNew() {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setShowForm(true);
        setFormError("");
    }

    async function handleSave() {
        if (!form.start_date || !form.end_date) {
            setFormError("Укажите дату заезда и выезда.");
            return;
        }
        if (form.start_date >= form.end_date) {
            setFormError("Дата выезда должна быть позже даты заезда.");
            return;
        }
        setSaving(true);
        setFormError("");
        try {
            let res: Response;
            if (editingId) {
                res = await fetch(`/api/rental-bookings/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
            } else {
                res = await fetch("/api/rental-bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...form, unit_id: unitId }),
                });
            }
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Ошибка сохранения");
            setShowForm(false);
            setEditingId(null);
            await loadBookings();
        } catch (e: any) {
            setFormError(e.message || "Ошибка");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Удалить бронирование?")) return;
        try {
            const res = await fetch(`/api/rental-bookings/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Ошибка удаления");
            setBookings((prev) => prev.filter((b) => b.id !== id));
        } catch (e: any) {
            alert(e.message || "Не удалось удалить");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
                    <h2 className="text-lg font-semibold text-white">Календарь бронирований</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNew}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Добавить бронь
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Booking form */}
                {showForm && (
                    <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 shrink-0">
                        <h3 className="text-sm font-semibold text-neutral-300 mb-3">
                            {editingId ? "Редактировать бронь" : "Новое бронирование"}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Заезд</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    value={form.start_date}
                                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Выезд</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    value={form.end_date}
                                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Статус</label>
                                <select
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                    value={form.status}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Booking["status"] }))}
                                >
                                    <option value="pending">Ожидает подтверждения</option>
                                    <option value="reserved">Бронь</option>
                                    <option value="confirmed">Подтверждено</option>
                                    <option value="blocked">Заблокировано</option>
                                    <option value="cancelled">Отменено</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">ID / Контакт клиента</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-neutral-600"
                                    placeholder="Telegram ID или имя"
                                    value={form.user_chat_id}
                                    onChange={(e) => setForm((f) => ({ ...f, user_chat_id: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Заметка</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder:text-neutral-600"
                                placeholder="Необязательно..."
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                        {formError && (
                            <div className="flex items-center gap-2 mb-3 text-xs text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {formError}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {saving ? "Сохранение..." : "Сохранить"}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 transition-colors"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                )}

                {/* Bookings list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
                    {loading ? (
                        <p className="text-neutral-400 text-sm text-center py-8">Загрузка бронирований...</p>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-neutral-500 text-sm">Пока нет бронирований.</p>
                            <p className="text-neutral-600 text-xs mt-1">Нажмите «Добавить бронь», чтобы создать первое.</p>
                        </div>
                    ) : (
                        bookings.map((b) => (
                            <div key={b.id} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 hover:border-neutral-700 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-white">
                                            {new Date(b.start_date).toLocaleDateString("ru-RU")} — {new Date(b.end_date).toLocaleDateString("ru-RU")}
                                        </span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.status] || STATUS_COLORS.reserved}`}>
                                            {STATUS_LABELS[b.status] || b.status}
                                        </span>
                                    </div>
                                    {b.guest_name && (
                                        <p className="text-xs text-neutral-500 mt-0.5 truncate">👤 {b.guest_name}{b.guest_phone ? ` · ${b.guest_phone}` : ""}</p>
                                    )}
                                    {!b.guest_name && b.user_chat_id && (
                                        <p className="text-xs text-neutral-500 mt-0.5 truncate">👤 {b.user_chat_id}</p>
                                    )}
                                    {b.notes && (
                                        <p className="text-xs text-neutral-600 mt-0.5 italic truncate">📝 {b.notes}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleEdit(b)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                                        title="Редактировать"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(b.id)}
                                        className="p-1.5 rounded-lg text-red-400/70 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                                        title="Удалить"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
