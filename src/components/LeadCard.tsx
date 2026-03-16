"use client";

import { useState, useEffect } from "react";
import { Phone, MessageSquare, ChevronRight, Eye, Target, DollarSign, Heart, Lightbulb, MessageCircle, Clock, CheckCircle, X, Briefcase } from "lucide-react";
import { useI18n } from "@/i18n";

interface LeadCardProps {
    lead: any;
    onDetailsClick: () => void;
    onStatusUpdate: (id: string, status: string) => void;
    onDelete: (id: string) => void;
}

// Language to flag mapping
const LANG_FLAGS: Record<string, string> = {
    ru: "🇷🇺",
    en: "🇬🇧",
    tr: "🇹🇷",
    de: "🇩🇪",
    fr: "🇫🇷",
    es: "🇪🇸",
    it: "🇮🇹",
    ar: "🇸🇦",
    zh: "🇨🇳",
    ja: "🇯🇵",
    ko: "🇰🇷",
    pt: "🇵🇹",
    pl: "🇵🇱",
    uk: "🇺🇦",
};

// Temperature mapping
const TEMP_CONFIG: Record<string, { emoji: string; label: string; color: string; key: string }> = {
    "горячий": { emoji: "🔥", label: "HOT", color: "text-red-500", key: "hot" },
    "теплый": { emoji: "⚡", label: "WARM", color: "text-orange-500", key: "warm" },
    "холодный": { emoji: "❄️", label: "COLD", color: "text-blue-400", key: "cold" },
};

export default function LeadCard({ lead, onDetailsClick, onStatusUpdate, onDelete }: LeadCardProps) {
    const { t, locale } = useI18n();
    const [focusUnit, setFocusUnit] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Dynamic translations state
    const [translatedData, setTranslatedData] = useState<any>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    // Fetch focus unit details
    useEffect(() => {
        const unitId = lead.data?.focus_unit_id || lead.data?.unit_id;
        if (unitId) {
            setLoading(true);
            fetch(`/api/units/${unitId}`)
                .then((res) => res.json())
                .then((json) => {
                    // API returns { ok: true, data: unit }
                    if (json?.ok && json?.data) {
                        setFocusUnit(json.data);
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [lead.data?.focus_unit_id, lead.data?.unit_id]);

    // Handle auto-translation of AI lead data when locale changes
    useEffect(() => {
        // 1. Check if we already have pre-calculated translations in the DB
        if (lead.data?.i18n?.[locale]) {
            setTranslatedData(lead.data.i18n[locale]);
            return;
        }

        if (locale === 'ru') {
            setTranslatedData(null); // Reset to original (Russian)
            return;
        }

        // 2. Fallback to on-the-fly translation for legacy leads (backwards compatibility)
        const fieldsToTranslate = {
            client_summary: lead.data?.client_summary,
            manager_hints: lead.data?.manager_hints,
            interest: lead.data?.interest,
            urgency: lead.data?.urgency,
            purpose: lead.data?.purpose,
            unit_type: lead.data?.unit_type,
            ai_summary: lead.data?.ai_summary,
            preferred_areas: Array.isArray(lead.data?.preferred_areas) ? lead.data.preferred_areas.join(', ') : null
        };

        const activeFields = Object.entries(fieldsToTranslate).filter(([_, v]) => !!v);
        if (activeFields.length === 0) return;

        setIsTranslating(true);
        const keys = activeFields.map(([k]) => k);
        const values = activeFields.map(([_, v]) => v);

        fetch('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ text: values, target: locale })
        })
            .then(res => res.json())
            .then(json => {
                if (json.ok && Array.isArray(json.result)) {
                    const mapping: any = {};
                    keys.forEach((key, i) => {
                        mapping[key] = json.result[i];
                    });
                    setTranslatedData(mapping);
                }
            })
            .catch(console.error)
            .finally(() => setIsTranslating(false));

    }, [locale, lead.data]);

    // Determine language flag
    const lang = lead.data?.lang || "en";
    const flag = LANG_FLAGS[lang] || "🌐";

    // Determine temperature
    const urgency = lead.data?.urgency?.toLowerCase() || "холодный";
    const tempConfig = TEMP_CONFIG[urgency] || TEMP_CONFIG["холодный"];

    // Score and stage from scoring system
    const score = lead.data?.score || 0;
    const stage = lead.data?.stage || "sandbox";

    // Stage config
    const stageConfig: Record<string, { label: string; color: string; emoji: string }> = {
        sandbox: { label: t("leads.stages.sandbox"), color: "text-gray-500 bg-gray-500/10 border-gray-500/20", emoji: "🏖️" },
        warmup: { label: t("leads.stages.warmup"), color: "text-orange-500 bg-orange-500/10 border-orange-500/20", emoji: "⚡" },
        handoff: { label: t("leads.stages.handoff"), color: "text-red-500 bg-red-500/10 border-red-500/20", emoji: "🔥" },
        reactivation: { label: t("leads.stages.reactivation"), color: "text-blue-500 bg-blue-500/10 border-blue-500/20", emoji: "🔄" },
    };

    const currentStage = stageConfig[stage] || stageConfig.sandbox;

    // Format last active time
    const lastActive = new Date(lead.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
    const timeAgo =
        diffMinutes < 60
            ? `${diffMinutes} ${t("common.time.min")} ${t("common.time.ago")}`
            : diffMinutes < 1440
                ? `${Math.floor(diffMinutes / 60)} ${t("common.time.hour")} ${t("common.time.ago")}`
                : `${Math.floor(diffMinutes / 1440)} ${t("common.time.day")} ${t("common.time.ago")}`;

    // WhatsApp link
    const whatsappLink = lead.phone
        ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`
        : null;

    // Language flag mapping (uses module-level LANG_FLAGS)
    const clientLang = lead.data?.language;
    const langFlag = clientLang ? (LANG_FLAGS[clientLang] ?? '🌐') : null;
    const isInWork = lead.status === 'in_work';

    return (
        <div className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all ${isInWork
            ? 'bg-amber-950/20 border border-amber-500/40 shadow-[0_0_16px_2px_rgba(245,158,11,0.12)] hover:border-amber-400/60'
            : 'bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
            }`}>
            {/* Header */}
            <div className="p-5 border-b border-neutral-800/50">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        {/* Avatar with temperature dot */}
                        <div className="relative">
                            <div className="h-10 w-10 rounded-xl bg-neutral-950 flex items-center justify-center text-lg font-bold border border-neutral-800/50">
                                {lead.name ? lead.name[0].toUpperCase() : "?"}
                            </div>
                            {/* Glowing temperature dot */}
                            <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-neutral-900 ${lead.data?.temperature === 'hot'
                                ? 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.6)] animate-pulse'
                                : lead.data?.temperature === 'warm'
                                    ? 'bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]'
                                    : 'bg-blue-500 shadow-[0_0_4px_1px_rgba(59,130,246,0.4)]'
                                }`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                                {flag} {lead.name || t("leads.card.anonymous")}
                                {/* Language badge */}
                                {langFlag && (
                                    <span className="text-sm" title={`${t("leads.card.lang")}: ${clientLang?.toUpperCase()}`}>{langFlag}</span>
                                )}
                                {(translatedData?.purpose?.toLowerCase().includes("rent") || lead.data?.purpose?.toLowerCase().includes("аренд") || translatedData?.purpose?.toLowerCase().includes("аренд") || lead.data?.purpose?.toLowerCase().includes("rent")) && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Аренда</span>
                                )}
                                {isInWork && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">{t('leads.card.inWorkActive')}</span>
                                )}
                            </h3>
                            <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                                🕒 {timeAgo}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Client Summary */}
            {(translatedData?.client_summary || lead.data?.client_summary) && (
                <div className={`px-5 py-3 border-b border-neutral-800/50 bg-violet-500/5 transition-opacity ${isTranslating ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2">
                        <span className="text-violet-400 text-xs mt-0.5">✦</span>
                        <p className="text-sm text-neutral-300 leading-relaxed italic">
                            {translatedData?.client_summary || lead.data.client_summary}
                        </p>
                    </div>
                </div>
            )}

            {/* Goal, Budget & CRM fields */}
            <div className={`px-5 py-4 space-y-2 border-b border-neutral-800/50 bg-neutral-950/20 ${isTranslating ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-2 text-sm">
                    <Target className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest shrink-0 mt-0.5">{t('leads.card.interest')}:</span>
                    <span className="text-neutral-200 font-medium max-w-full overflow-hidden text-ellipsis line-clamp-2">
                        {translatedData?.interested_units && translatedData.interested_units.length > 0
                            ? translatedData.interested_units.join(', ')
                            : (lead.data?.interested_units && lead.data.interested_units.length > 0)
                                ? lead.data.interested_units.join(', ')
                                : (translatedData?.interest || lead.data?.interest || t('leads.card.notSet'))}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-neutral-500" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('leads.card.budget')}:</span>
                    <span className="text-neutral-200 font-medium">
                        {lead.data?.budget ? `$${lead.data.budget.toLocaleString()}` : t('leads.card.noBudget')}
                    </span>
                </div>
                {/* CRM enrichment fields */}
                {(translatedData?.urgency || lead.data?.urgency) && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-neutral-500" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('leads.card.urgency')}:</span>
                        <span className="text-neutral-300">{translatedData?.urgency || lead.data.urgency}</span>
                    </div>
                )}
                {(translatedData?.purpose || lead.data?.purpose) && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-neutral-500">🎯</span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('leads.card.purpose')}:</span>
                        <span className="text-neutral-300">{translatedData?.purpose || lead.data.purpose}</span>
                    </div>
                )}
                {(translatedData?.unit_type || lead.data?.unit_type) && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-neutral-500">🏢</span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{t('leads.card.unitType')}:</span>
                        <span className="text-neutral-300">{translatedData?.unit_type || lead.data.unit_type}</span>
                    </div>
                )}
                {(translatedData?.preferred_areas || (lead.data?.preferred_areas && lead.data.preferred_areas.length > 0)) && (
                    <div className="flex items-start gap-2 text-sm">
                        <span className="text-neutral-500 mt-0.5">📍</span>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">{t('leads.card.area')}:</span>
                        <span className="text-neutral-300">{translatedData?.preferred_areas || lead.data.preferred_areas.join(', ')}</span>
                    </div>
                )}
            </div>

            {/* Primary Interest */}
            {
                focusUnit && (
                    <div className="px-5 py-4 border-b border-neutral-800/50">
                        {/* Goal, Budget & CRM fields */}
                        <div className="flex items-center gap-2 mb-3">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                {t('leads.card.mainInterest')}
                            </span>
                        </div>
                        <div className="space-y-1.5 pl-6">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-400">🏢</span>
                                <span className="text-sm font-semibold text-neutral-100">
                                    {focusUnit.name || t("leads.card.unit")} <span className="text-xs text-neutral-500">(ID: {focusUnit.id.slice(0, 8)})</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                                <span>📍</span>
                                <span>
                                    {focusUnit.city}, {focusUnit.address || t("leads.card.addressToVerify")} | {focusUnit.rooms}+1
                                </span>
                            </div>
                        </div>
                    </div>
                )}

            {/* Manager Hints */}
            {(translatedData?.manager_hints || lead.data?.manager_hints) && (
                <div className={`px-5 py-4 border-b border-neutral-800/50 bg-blue-500/5 ${isTranslating ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            {t('leads.card.managerHints')}
                        </span>
                    </div>
                    <div className="space-y-2 pl-6">
                        <p className="text-sm text-neutral-300 leading-relaxed">
                            {translatedData?.manager_hints || lead.data.manager_hints}
                        </p>
                    </div>
                </div>
            )}

            {/* Conversation Summary */}
            {(translatedData?.ai_summary || lead.data?.ai_summary) && (
                <div className={`px-5 py-4 border-b border-neutral-800/50 bg-neutral-950/30 ${isTranslating ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="h-4 w-4 text-neutral-400" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            {t('leads.card.dialogue')}
                        </span>
                    </div>
                    <div className="pl-6">
                        <p className="text-xs text-neutral-400 italic leading-relaxed">
                            &ldquo;{translatedData?.ai_summary || lead.data.ai_summary}&rdquo;
                        </p>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 bg-neutral-950/20 flex items-center gap-2">
                {/* Sold Button */}
                <button
                    onClick={() => onStatusUpdate(lead.id, "done")}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 text-sm font-bold transition-all"
                    title={t('leads.card.sold')}
                >
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('leads.card.sold')}</span>
                </button>

                {/* In Work Button */}
                <button
                    onClick={() => onStatusUpdate(lead.id, isInWork ? 'new' : 'in_work')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${isInWork
                        ? 'bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_8px_1px_rgba(245,158,11,0.2)]'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                        }`}
                    title={isInWork ? t('leads.card.release') : t('leads.card.inWork')}
                >
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">{isInWork ? t('leads.card.inWorkActive') : t('leads.card.inWork')}</span>
                </button>

                {/* Delete Button */}
                {confirmDelete ? (
                    <button
                        onClick={() => onDelete(lead.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-500 text-sm font-bold transition-all"
                    >
                        <span className="hidden sm:inline">{t('leads.card.confirm')}</span>
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setConfirmDelete(true);
                            setTimeout(() => setConfirmDelete(false), 3000);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 hover:border-red-500/50 text-sm font-bold transition-all"
                        title={t('leads.card.delete')}
                    >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('leads.card.delete')}</span>
                    </button>
                )}

                {/* Snooze 24h Button */}
                <button
                    onClick={async () => {
                        try {
                            const res = await fetch(`/api/leads/${lead.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ snooze: true }),
                            });
                            if (res.ok) {
                                onStatusUpdate(lead.id, lead.status); // Refresh
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 text-sm font-bold transition-all"
                    title={t('leads.card.snooze')}
                >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('leads.card.snooze')}</span>
                </button>

                {/* Details Button */}
                <button
                    onClick={onDetailsClick}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-sm font-bold transition-all border border-neutral-700"
                    title={t('leads.card.details')}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div >
    );
}
