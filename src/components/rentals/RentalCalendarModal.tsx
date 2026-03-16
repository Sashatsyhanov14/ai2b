"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Booking = {
    id: string;
    unit_id: number;
    start_date: string;
    end_date: string;
    user_chat_id: string | null;
    status: "reserved" | "blocked" | "completed" | "cancelled";
};

export default function RentalCalendarModal({ unitId, onClose }: { unitId: string; onClose: () => void }) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Example simple representation. Real calendar would use standard day grids.
    useEffect(() => {
        let cancelled = false;
        async function loadBookings() {
            setLoading(true);
            try {
                const res = await fetch(`/api/rental-bookings?unit_id=${unitId}`);
                const json = await res.json();
                if (!cancelled && json.bookings) {
                    setBookings(json.bookings);
                }
            } catch (err) {
                console.error("Failed to load bookings", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadBookings();
        return () => { cancelled = true; };
    }, [unitId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-xl font-semibold text-white">Календарь бронирований</h2>

                {loading ? (
                    <p className="text-neutral-400">Загрузка бронирований...</p>
                ) : (
                    <div className="space-y-4">
                        {/* A placeholder for the actual calendar grid component. We use a list representation for MVP */}
                        {bookings.length > 0 ? (
                            <ul className="space-y-2">
                                {bookings.map(b => (
                                    <li key={b.id} className="flex gap-4 p-3 rounded-lg border border-neutral-800 bg-neutral-950 text-sm text-neutral-200">
                                        <div>
                                            <span className="text-neutral-500 text-xs block">Даты</span>
                                            {new Date(b.start_date).toLocaleDateString("ru-RU")} - {new Date(b.end_date).toLocaleDateString("ru-RU")}
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 text-xs block">Статус</span>
                                            <span className={`capitalize ${b.status === 'reserved' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-neutral-500 text-xs block">Клиент ID</span>
                                            {b.user_chat_id || 'Неизвестно'}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-neutral-400 mt-8 text-center border-t border-neutral-800 pt-8">Пока нет бронирований для этого объекта.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
