"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const l = await fetch("/api/leads", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => []);
    setLeads(Array.isArray(l) ? l : l?.leads ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dashboard.recentLeads")}</h2>
          <button
            onClick={load}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
          >
            {t("dashboard.update")}
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">{t("leads.table.name")}</th>
                <th className="px-3 py-2 text-left">{t("leads.table.phone")}</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">{t("leads.table.status")}</th>
                <th className="px-3 py-2 text-left">{t("leads.table.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-zinc-400"
                    colSpan={5}
                  >
                    {t("common.loading")}
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-4 text-zinc-400"
                    colSpan={5}
                  >
                    {t("leads.empty")}
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-zinc-800"
                  >
                    <td className="px-3 py-2">
                      {l.name ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {l.phone ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {l.email ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {l.status ?? "new"}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(l.created_at).toLocaleString()}
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

