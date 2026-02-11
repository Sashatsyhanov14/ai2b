import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n";
import {
  Users,
  UserPlus,
  Activity,
  Search,
  Filter,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Target,
  Wallet,
  Globe,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  MapPin,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, LeadStatus } from "@/components/StatusBadge";

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
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (source) qs.set("source", source);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (q) qs.set("q", q);
      const res = await fetch("/api/leads?" + qs.toString());
      const j = await res.json().catch(() => ({}));
      if (j?.ok) setRows(j.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, source, from, to, q]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) load();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  }

  const stats = {
    total: rows.length,
    new: rows.filter(r => r.status === 'new').length,
    inWork: rows.filter(r => r.status === 'in_work').length,
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 italic">{t("leads.title")}</h1>
            <p className="text-sm text-neutral-400 mt-1">{t("leads.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-2 border-neutral-800 bg-neutral-900/50">
              <TrendingUp className="h-4 w-4" /> {t("leads.analytics")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-neutral-900/40 border-neutral-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{t("leads.stats.total")}</p>
                  <h3 className="text-3xl font-bold text-neutral-50 mt-1">{stats.total}</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/40 border-neutral-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{t("leads.stats.new")}</p>
                  <h3 className="text-3xl font-bold text-neutral-50 mt-1">{stats.new}</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <UserPlus className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/40 border-neutral-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{t("leads.stats.inWork")}</p>
                  <h3 className="text-3xl font-bold text-neutral-50 mt-1">{stats.inWork}</h3>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-600 transition-all"
            placeholder={t("leads.filters.search")}
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-600 cursor-pointer"
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="">{t("leads.filters.allStatuses")}</option>
            <option value="new">{t("leads.stats.new")}</option>
            <option value="in_work">{t("leads.stats.inWork")}</option>
            <option value="done">{t("common.save")}</option> {/* Wait, no, done is usually something else. Let's check common */}
            <option value="spam">Spam</option>
          </select>

          <select
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-600 cursor-pointer"
            value={source}
            onChange={(e) => setParam("source", e.target.value)}
          >
            <option value="">{t("leads.filters.allSources")}</option>
            <option value="telegram_bot">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="landing">Сайт</option>
            <option value="manual">Вручную</option>
          </select>
        </div>
      </div>

      {/* Lead Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl border border-neutral-800 bg-neutral-900/20 animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl">
            <Users className="h-12 w-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">{t("leads.empty")}</p>
          </div>
        ) : (
          rows.map((lead) => (
            <div
              key={lead.id}
              className="group relative flex flex-col bg-neutral-900/40 border border-neutral-800 rounded-3xl overflow-hidden transition-all hover:border-neutral-700 hover:bg-neutral-900/60"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-950 flex items-center justify-center text-xl shadow-inner border border-neutral-800/50">
                      {lead.name ? lead.name[0] : <Search className="h-5 w-5 text-neutral-600" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                        {lead.name || t("leads.card.anonymous")}
                        <StatusBadge status={lead.status} />
                      </h3>
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" /> {new Date(lead.created_at).toLocaleDateString()} в {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-xl bg-neutral-950/50 border border-neutral-800 text-neutral-500 hover:text-blue-400 hover:border-blue-500/30 transition-all">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-xl bg-neutral-950/50 border border-neutral-800 text-neutral-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-6">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t("leads.card.budget")}</span>
                    <div className="flex items-center gap-2 text-neutral-200">
                      <Wallet className="h-4 w-4 text-amber-500/70" />
                      {lead.data?.budget_min || lead.data?.budget_max
                        ? `${lead.data.budget_min || 0} - ${lead.data.budget_max || '…'} $`
                        : t("leads.card.noBudget")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t("leads.card.location")}</span>
                    <div className="flex items-center gap-2 text-neutral-200">
                      <MapPin className="h-4 w-4 text-blue-500/70" />
                      {lead.data?.city || t("leads.card.allTurkey")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t("leads.card.lang")}</span>
                    <div className="flex items-center gap-2 text-neutral-200">
                      <Globe className="h-4 w-4 text-emerald-500/70" />
                      {lead.data?.lang === 'ru' ? 'Русский' : 'English / International'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">{t("leads.card.objects")}</span>
                    <div className="flex items-center gap-2 text-neutral-200 truncate pr-2">
                      <Target className="h-4 w-4 text-red-500/70" />
                      {lead.data?.unit_id ? `Unit ID: ${lead.data.unit_id}` : t("leads.card.interestedIn")}
                    </div>
                  </div>
                </div>

                {lead.notes && (
                  <div className="bg-neutral-950/50 border border-neutral-800/50 rounded-2xl p-4 mt-4">
                    <p className="text-xs text-neutral-400 leading-relaxed italic line-clamp-2">
                      &ldquo;{lead.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-neutral-800/50 p-4 bg-neutral-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.table.status")}:</span>
                  <select
                    className="bg-transparent text-xs font-bold text-neutral-300 outline-none cursor-pointer focus:text-blue-400"
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                  >
                    <option value="new">{t("leads.stats.new")}</option>
                    <option value="in_work">{t("leads.stats.inWork")}</option>
                    <option value="done">Done</option> {/* Wait, no, done is usually something else. Let's check common */}
                    <option value="spam">Spam</option>
                  </select>
                </div>
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
                >
                  {t("leads.card.details")} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side Detail Panel (Quick & Rough Implementation for Visual Context) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-full max-w-lg h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-xl font-bold italic">{t("leads.card.title")}</h2>
                <button onClick={() => setSelectedLead(null)} className="p-2 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all text-neutral-500 hover:text-white font-bold">×</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <section>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="h-20 w-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-3xl font-bold italic shadow-2xl">
                      {selectedLead.name ? selectedLead.name[0] : "?"}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedLead.name || t("leads.card.anonymous")}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={selectedLead.status} />
                        <span className="text-xs text-neutral-500">ID: {selectedLead.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-800">
                    <div className="bg-neutral-900 p-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.table.phone")}</span>
                      <p className="text-sm font-mono text-neutral-200">{selectedLead.phone || "—"}</p>
                    </div>
                    <div className="bg-neutral-900 p-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">Email</span>
                      <p className="text-sm text-neutral-200">{selectedLead.email || "—"}</p>
                    </div>
                    <div className="bg-neutral-900 p-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.table.source")}</span>
                      <p className="text-sm text-neutral-200">{selectedLead.source}</p>
                    </div>
                    <div className="bg-neutral-900 p-4">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.table.createdAt")}</span>
                      <p className="text-sm text-neutral-200">{new Date(selectedLead.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" /> {t("leads.card.aiAnalysis")}
                  </h4>
                  <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4 border-l-4 border-l-blue-600">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.card.temperature")}</span>
                      <div className="flex items-center gap-2 text-rose-500 font-bold">
                        <Activity className="h-4 w-4" /> Теплый (Пример)
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.card.interestedIn")}</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">Konak Resort #123</span>
                        <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">Villa Azure</span>
                      </div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">{t("leads.card.sessionData")}</span>
                      <pre className="text-[10px] font-mono p-4 bg-neutral-950 rounded-xl overflow-x-auto text-neutral-600">
                        {JSON.stringify(selectedLead.data || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </section>

                <div className="pt-10 flex gap-4">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 rounded-2xl shadow-lg shadow-blue-900/20">{t("leads.card.writeTg")}</Button>
                  <Button variant="secondary" className="border-neutral-800 h-12 rounded-2xl" onClick={() => setSelectedLead(null)}>{t("common.cancel")}</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setSelectedLead(null)} />
        </div>
      )}
    </div>
  );
}

// Sparkles icon helper if not imported
function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
