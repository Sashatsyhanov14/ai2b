"use client";
import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useI18n } from "@/i18n";
import Spinner from "@/components/ui/Spinner";

export default function LeadsPageClient() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const status = sp.get("status") || "";
  const source = sp.get("source") || "";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const q = sp.get("q") || "";

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(sp.toString());
    if (val) p.set(key, val);
    else p.delete(key);
    router.replace(pathname + "?" + p.toString());
  }

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (source) qs.set("source", source);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (q) qs.set("q", q);
    const res = await fetch("/api/leads?" + qs.toString());
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setRows(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [status, source, from, to, q]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("leads.title")}</h1>
        </div>
        <div className="panel flex flex-wrap items-end gap-2 p-4 animate-fade">
          <div>
            <label className="form-label">
              {t("leads.filters.status")}
            </label>
            <select
              className="input"
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
            >
              <option value="">{t("leads.filters.all")}</option>
              <option value="new">new</option>
              <option value="in_work">in_work</option>
              <option value="done">done</option>
              <option value="spam">spam</option>
            </select>
          </div>
          <div>
            <label className="form-label">
              {t("leads.filters.source")}
            </label>
            <select
              className="input"
              value={source}
              onChange={(e) => setParam("source", e.target.value)}
            >
              <option value="">{t("leads.filters.all")}</option>
              <option value="telegram_bot">telegram_bot</option>
              <option value="whatsapp">whatsapp</option>
              <option value="landing">landing</option>
              <option value="manual">manual</option>
            </select>
          </div>
          <div>
            <label className="form-label">
              {t("leads.filters.from")}
            </label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">
              {t("leads.filters.to")}
            </label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="form-label">
              {t("leads.filters.search")}
            </label>
            <input
              className="input w-full"
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <table className="w-full text-sm text-neutral-300">
          <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">
                {t("leads.table.createdAt")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("leads.table.name")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("leads.table.phone")}
              </th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">
                {t("leads.table.source")}
              </th>
              <th className="px-3 py-2 text-left">
                {t("leads.table.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-3 py-4 text-zinc-400"
                  colSpan={6}
                >
                  <div className="flex items-center gap-2">
                    <Spinner size={16} /> {t("leads.loading")}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-zinc-400"
                  colSpan={6}
                >
                  {t("leads.empty")}
                </td>
              </tr>
            ) : (
              rows.map((l: any) => (
                <tr
                  key={l.id}
                  className="border-t border-zinc-800"
                >
                  <td className="px-3 py-2">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{l.name ?? "-"}</td>
                  <td className="px-3 py-2">{l.phone ?? "-"}</td>
                  <td className="px-3 py-2">{l.email ?? "-"}</td>
                  <td className="px-3 py-2">{l.source ?? "-"}</td>
                  <td className="px-3 py-2">
                    <select
                      className="input"
                      value={l.status || "new"}
                      onChange={async (e) => {
                        const res = await fetch(
                          `/api/leads/${l.id}`,
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body: JSON.stringify({
                              status: e.target.value,
                            }),
                          },
                        );
                        const j = await res
                          .json()
                          .catch(() => ({}));
                        if (!j?.ok) {
                          alert(
                            j?.error ||
                              "Не удалось обновить статус лида",
                          );
                          return;
                        }
                        await load();
                      }}
                    >
                      <option value="new">new</option>
                      <option value="in_work">in_work</option>
                      <option value="done">done</option>
                      <option value="spam">spam</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
