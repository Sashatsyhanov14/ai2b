"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { supabase as sb } from "@/lib/supabaseClient";
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
  Zap,
  Flame,
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
import LeadCard from "@/components/LeadCard";
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
  const [funnel, setFunnel] = useState({ sessions: 0, drafts: 0, leads: 0 });

  async function load() {
    setLoading(true);
    try {

      // Fetch Funnel Stats
      const [sessRes, draftsRes, leadsRes] = await Promise.all([
        sb.from('sessions').select('*', { count: 'exact', head: true }),
        sb.from('leads').select('*', { count: 'exact', head: true }).eq('phone', 'Unknown'),
        sb.from('leads').select('*', { count: 'exact', head: true }).neq('phone', 'Unknown'),
      ]);
      setFunnel({
        sessions: sessRes.count || 0,
        drafts: draftsRes.count || 0,
        leads: leadsRes.count || 0
      });

      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (source) qs.set("source", source);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (q) qs.set("q", q);
      const res = await fetch("/api/leads?" + qs.toString());
      const j = await res.json().catch(() => ({}));
      if (j?.ok) {
        // Smart sorting:
        // 1. Snoozed leads whose time expired go to TOP
        // 2. Then sort by score (hot leads first)
        const now = new Date();

        // Auto-Decay for Drafts
        const validLeads = (j.data || []).filter((r: any) => {
          if (r.phone === 'Unknown') {
            const ageHours = (now.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
            if (ageHours > 48) return false;
          }
          return true;
        });

        const sorted = validLeads.sort((a: any, b: any) => {
          const aSnoozed = a.snoozed_until ? new Date(a.snoozed_until) : null;
          const bSnoozed = b.snoozed_until ? new Date(b.snoozed_until) : null;

          // If A's snooze expired and B's hasn't (or B not snoozed), A goes first
          const aExpired = aSnoozed && aSnoozed <= now;
          const bExpired = bSnoozed && bSnoozed <= now;

          if (aExpired && !bExpired) return -1;
          if (!aExpired && bExpired) return 1;

          // Both expired or both not expired: sort by score
          const scoreA = a.data?.score || 0;
          const scoreB = b.data?.score || 0;
          return scoreB - scoreA; // Descending
        });
        setRows(sorted);
      }
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

  async function deleteLead(id: string) {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        if (selectedLead?.id === id) setSelectedLead(null);
        load();
      } else {
        alert(`${t("common.error") || "Error"}: ${json.error || "Unknown"}`);
      }
    } catch (e) {
      console.error("Failed to delete lead", e);
      alert(t("common.error") || "Error");
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

        {/* Funnel Analytics */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden mt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-orange-500/5 to-emerald-500/5" />
            <div className="relative p-6 px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 relative">

                {/* Step 1: Sessions */}
                <div className="flex flex-col items-center text-center group flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 transition-transform group-hover:scale-110">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <h4 className="text-3xl font-black text-white">{funnel.sessions}</h4>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t("leads.funnel.allChats")}</p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex text-neutral-700">
                  <ChevronRight className="h-8 w-8" />
                </div>

                {/* Step 2: Drafts */}
                <div className="flex flex-col items-center text-center group flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-3 transition-transform group-hover:scale-110">
                    <Zap className="h-7 w-7" />
                  </div>
                  <h4 className="text-3xl font-black text-white">{funnel.drafts}</h4>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t("leads.funnel.drafts")}</p>
                  <span className="text-[10px] text-orange-400/80 mt-1 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">{t("leads.funnel.conversion")}: {funnel.sessions > 0 ? Math.round((funnel.drafts / funnel.sessions) * 100) : 0}%</span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex text-neutral-700">
                  <ChevronRight className="h-8 w-8" />
                </div>

                {/* Step 3: Leads */}
                <div className="flex flex-col items-center text-center group flex-1">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 transition-transform group-hover:scale-110">
                    <Target className="h-7 w-7" />
                  </div>
                  <h4 className="text-3xl font-black text-white">{funnel.leads}</h4>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">{t("leads.funnel.readyLeads")}</p>
                  <span className="text-[10px] text-emerald-400/80 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">{t("leads.funnel.conversion")}: {funnel.drafts > 0 ? Math.round((funnel.leads / funnel.drafts) * 100) : 0}%</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Filters - Text Search Only */}
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
            <LeadCard
              key={lead.id}
              lead={lead}
              onDetailsClick={() => setSelectedLead(lead)}
              onStatusUpdate={updateStatus}
              onDelete={deleteLead}
            />
          ))
        )}
      </div>

      {/* Side Detail Panel (Quick & Rough Implementation for Visual Context) */}
      {
        selectedLead && (
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
                  {/* Current locale translation if available, otherwise fallback */}
                  {(() => {
                    const { locale } = useI18n();
                    const i18n = selectedLead.data?.i18n?.[locale] || {};
                    const fields = {
                      client_summary: i18n.client_summary || selectedLead.data?.client_summary,
                      interest: i18n.interest || selectedLead.data?.interest,
                      urgency: i18n.urgency || selectedLead.data?.urgency,
                      purpose: i18n.purpose || selectedLead.data?.purpose,
                      unit_type: i18n.unit_type || selectedLead.data?.unit_type,
                      manager_hints: i18n.manager_hints || selectedLead.data?.manager_hints,
                    };

                    return (
                      <>
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
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.card.phone")}</span>
                              <p className="text-sm font-mono text-neutral-200">{selectedLead.phone || "—"}</p>
                            </div>
                            <div className="bg-neutral-900 p-4">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.card.email")}</span>
                              <p className="text-sm text-neutral-200">{selectedLead.data?.email || selectedLead.email || "—"}</p>
                            </div>
                            <div className="bg-neutral-900 p-4">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.card.source")}</span>
                              <p className="text-sm text-neutral-200">{selectedLead.source}</p>
                            </div>
                            <div className="bg-neutral-900 p-4">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-1">{t("leads.card.createdAt")}</span>
                              <p className="text-sm text-neutral-200">{new Date(selectedLead.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500" /> {t("leads.card.aiAnalysis")}
                          </h4>

                          {fields.client_summary && (
                            <div className="rounded-3xl border border-neutral-800 bg-violet-500/5 p-6 mb-4 border-l-4 border-l-violet-500">
                              <p className="text-sm text-neutral-300 leading-relaxed italic">
                                "{fields.client_summary}"
                              </p>
                            </div>
                          )}

                          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4 border-l-4 border-l-blue-600">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.card.temperature")}</span>
                              <div className="flex items-center gap-2 font-bold">
                                {selectedLead.data?.temperature === 'hot' ? (
                                  <span className="text-rose-500 flex items-center gap-2"><Flame className="h-4 w-4" /> {t("leads.card.hot")} 🔥</span>
                                ) : selectedLead.data?.temperature === 'warm' ? (
                                  <span className="text-amber-500 flex items-center gap-2"><Activity className="h-4 w-4" /> {t("leads.card.warm")} ☀️</span>
                                ) : (
                                  <span className="text-blue-500 flex items-center gap-2"><Activity className="h-4 w-4" /> {t("leads.card.cold")} ❄️</span>
                                )}
                              </div>
                            </div>
                            {selectedLead.data?.budget && (
                              <div className="space-y-1 pt-2">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.card.budget")}</span>
                                <div className="flex items-center gap-2 text-emerald-500 font-bold">
                                  <Wallet className="h-4 w-4" /> ${selectedLead.data.budget.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {selectedLead.data?.interested_units && selectedLead.data.interested_units.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t("leads.card.interestedIn")}</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedLead.data.interested_units.map((unit: string, i: number) => (
                                    <span key={i} className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">{unit}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-neutral-800/50">
                              {selectedLead.data?.tg_username && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Telegram</span>
                                  <span className="text-sm font-medium text-blue-400">@{selectedLead.data.tg_username}</span>
                                </div>
                              )}
                              {selectedLead.data?.chat_id && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.chatId")}</span>
                                  <span className="text-xs font-mono text-neutral-400">{selectedLead.data.chat_id}</span>
                                </div>
                              )}
                              {selectedLead.data?.score !== undefined && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.score")}</span>
                                  <span className="text-sm font-medium text-emerald-400">{selectedLead.data.score} / 10</span>
                                </div>
                              )}
                              {selectedLead.data?.lang && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.lang")}</span>
                                  <span className="text-sm font-medium text-neutral-200">
                                    {selectedLead.data.lang === 'ru' ? 'Русский 🇷🇺' :
                                      selectedLead.data.lang === 'en' ? 'English 🇬🇧' :
                                        selectedLead.data.lang === 'tr' ? 'Türkçe 🇹🇷' :
                                          selectedLead.data.lang.toUpperCase()}
                                  </span>
                                </div>
                              )}
                              {fields.urgency && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.urgency")}</span>
                                  <span className="text-xs text-neutral-300">{fields.urgency}</span>
                                </div>
                              )}
                              {fields.purpose && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.purpose")}</span>
                                  <span className="text-xs text-neutral-300">{fields.purpose}</span>
                                </div>
                              )}
                              {fields.unit_type && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.unitType")}</span>
                                  <span className="text-xs text-neutral-300">{fields.unit_type}</span>
                                </div>
                              )}
                              {fields.interest && (
                                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/50 col-span-full">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">{t("leads.card.aiNotes")}</span>
                                  <span className="text-sm text-neutral-300 leading-relaxed">{fields.interest}</span>
                                </div>
                              )}
                            </div>

                            {fields.manager_hints && (
                              <div className="mt-4 pt-4 border-t border-neutral-800/50">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2">{t("leads.card.managerHints")}</span>
                                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                                  <p className="text-sm text-neutral-300 leading-relaxed">{fields.manager_hints}</p>
                                </div>
                              </div>
                            )}

                            {selectedLead.data?.ai_summary && (
                              <div className="mt-4 pt-4 border-t border-neutral-800/50">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">{t("leads.card.dialogue")}</span>
                                <p className="text-xs text-neutral-500 italic leading-relaxed px-2">
                                  "{selectedLead.data.ai_summary}"
                                </p>
                              </div>
                            )}
                          </div>
                        </section>
                      </>
                    );
                  })()}

                  <div className="pt-10 flex gap-4">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 rounded-2xl shadow-lg shadow-blue-900/20">{t("leads.card.writeTg")}</Button>
                    <Button variant="secondary" className="border-neutral-800 h-12 rounded-2xl" onClick={() => setSelectedLead(null)}>{t("common.cancel")}</Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 cursor-pointer" onClick={() => setSelectedLead(null)} />
          </div>
        )
      }
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
