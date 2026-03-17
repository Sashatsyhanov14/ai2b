"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { Users, Home, CalendarDays, TrendingUp, Bell, X } from "lucide-react";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
  data?: any;
};

type Stats = {
  leads: {
    total: number;
    new: number;
    warm: number;
    hot: number;
  };
  units: {
    total: number;
  };
  rentals: {
    units: number;
    activeBookings: number;
  };
};

const STATUS_COLORS: Record<string, string> = {
  new: "text-blue-400 bg-blue-900/30",
  warm: "text-yellow-400 bg-yellow-900/30",
  hot: "text-red-400 bg-red-900/30",
  closed: "text-emerald-400 bg-emerald-900/30",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  warm: "Тёплый",
  hot: "Горячий",
  closed: "Закрыт",
};

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Notification state
  const [notification, setNotification] = useState<Lead | null>(null);
  const lastLeadIdRef = useRef<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      const data = await res.json();
      const allLeads: Lead[] = Array.isArray(data) ? data : data?.leads ?? [];
      setLeads(allLeads);

      // Check for new lead
      if (allLeads.length > 0) {
        const newest = allLeads[0];
        if (lastLeadIdRef.current !== null && newest.id !== lastLeadIdRef.current) {
          // New lead arrived!
          setNotification(newest);
        }
        lastLeadIdRef.current = newest.id;
      }

      return allLeads;
    } catch {
      return [];
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [unitsRes, rentalsRes, rentBookingsRes] = await Promise.all([
        fetch("/api/units", { cache: "no-store" }),
        fetch("/api/rentals", { cache: "no-store" }),
        fetch("/api/rental-bookings", { cache: "no-store" }),
      ]);

      const unitsData = await unitsRes.json().catch(() => ({ units: [] }));
      const rentalsData = await rentalsRes.json().catch(() => ({ units: [] }));
      const bookingsData = await rentBookingsRes.json().catch(() => ({ bookings: [] }));

      return {
        units: { total: (unitsData.units || []).length },
        rentals: {
          units: (rentalsData.units || []).length,
          activeBookings: (bookingsData.bookings || []).filter(
            (b: any) => b.status === "reserved" || b.status === "confirmed"
          ).length,
        },
      };
    } catch {
      return { units: { total: 0 }, rentals: { units: 0, activeBookings: 0 } };
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [allLeads, statsData] = await Promise.all([loadLeads(), loadStats()]);

    const new_ = allLeads.filter(l => l.status === "new").length;
    const warm = allLeads.filter(l => l.status === "warm").length;
    const hot = allLeads.filter(l => l.status === "hot").length;

    setStats({
      leads: { total: allLeads.length, new: new_, warm, hot },
      ...statsData,
    });
    setLoading(false);
  }, [loadLeads, loadStats]);

  // Initial load
  useEffect(() => {
    loadAll().then(() => {
      // Set the initial lastLeadId AFTER first load to avoid spurious notification
      // lastLeadIdRef is set inside loadLeads already
    });
  }, [loadAll]);

  // Polling every 30s for new leads
  useEffect(() => {
    pollInterval.current = setInterval(() => {
      loadLeads();
    }, 30_000);
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [loadLeads]);

  const statCards = stats ? [
    {
      label: "Всего лидов",
      value: stats.leads.total,
      sub: `🔵 ${stats.leads.new} новых · 🟡 ${stats.leads.warm} тёплых · 🔴 ${stats.leads.hot} горячих`,
      icon: Users,
      color: "from-blue-600/20 to-blue-900/10 border-blue-800/40",
    },
    {
      label: "Квартир в продаже",
      value: stats.units.total,
      sub: "В таблице продажи",
      icon: Home,
      color: "from-emerald-600/20 to-emerald-900/10 border-emerald-800/40",
    },
    {
      label: "Объектов в аренде",
      value: stats.rentals.units,
      sub: `${stats.rentals.activeBookings} активных броней`,
      icon: TrendingUp,
      color: "from-purple-600/20 to-purple-900/10 border-purple-800/40",
    },
    {
      label: "Активные брони (аренда)",
      value: stats.rentals.activeBookings,
      sub: "Статус: забронировано / подтверждено",
      icon: CalendarDays,
      color: "from-orange-600/20 to-orange-900/10 border-orange-800/40",
    },
  ] : [];

  return (
    <div className="space-y-8 px-1">

      {/* New Lead Notification Banner */}
      {notification && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-emerald-700/60 bg-emerald-900/20 px-5 py-4 shadow-lg shadow-emerald-900/20 animate-in slide-in-from-top-2 duration-300">
          <Bell className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">🔔 Новый лид!</p>
            <p className="text-xs text-neutral-300 mt-0.5">
              {notification.name || "Без имени"}
              {notification.phone ? ` · ${notification.phone}` : ""}
              {notification.data?.purpose ? ` · ${notification.data.purpose}` : ""}
            </p>
            <button
              onClick={() => {
                setNotification(null);
                router.push("/app/leads");
              }}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              Посмотреть лиды →
            </button>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-neutral-400 uppercase tracking-wider">Статистика</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border border-neutral-800 bg-neutral-900/40 animate-pulse" />
            ))
          ) : (
            statCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border bg-gradient-to-br p-4 ${card.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400 font-medium">{card.label}</span>
                  <card.icon className="h-4 w-4 text-neutral-500" />
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{card.value}</p>
                <p className="text-[10px] text-neutral-500 mt-1 leading-tight">{card.sub}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Leads Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            {t("dashboard.recentLeads")}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
            >
              {t("dashboard.update")}
            </button>
            <button
              onClick={() => router.push("/app/leads")}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
            >
              Все лиды →
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/30">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/60 text-xs text-neutral-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">{t("leads.table.name")}</th>
                <th className="px-4 py-3 text-left">{t("leads.table.phone")}</th>
                <th className="px-4 py-3 text-left">Цель</th>
                <th className="px-4 py-3 text-left">{t("leads.table.status")}</th>
                <th className="px-4 py-3 text-left">{t("leads.table.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-400 text-center" colSpan={5}>
                    {t("common.loading")}
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-neutral-400 text-center" colSpan={5}>
                    {t("leads.empty")}
                  </td>
                </tr>
              ) : (
                leads.slice(0, 15).map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-neutral-800 hover:bg-neutral-900/60 transition-colors cursor-pointer"
                    onClick={() => router.push("/app/leads")}
                  >
                    <td className="px-4 py-3 font-medium text-neutral-200">
                      {l.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {l.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {l.data?.purpose ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[l.status ?? "new"] ?? STATUS_COLORS.new}`}>
                        {STATUS_LABELS[l.status ?? "new"] ?? l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {new Date(l.created_at).toLocaleString("ru-RU", {
                        day: "2-digit", month: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
