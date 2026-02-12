"use client";

import { useState, useEffect } from "react";
import { Phone, MessageSquare, ChevronRight, Eye, Target, DollarSign, Heart, Lightbulb, MessageCircle, Clock, CheckCircle, X } from "lucide-react";

interface LeadCardProps {
    lead: any;
    onDetailsClick: () => void;
    onStatusUpdate: (id: string, status: string) => void;
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
const TEMP_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
    "горячий": { emoji: "🔥", label: "HOT", color: "text-red-500" },
    "теплый": { emoji: "⚡", label: "WARM", color: "text-orange-500" },
    "холодный": { emoji: "❄️", label: "COLD", color: "text-blue-400" },
};

export default function LeadCard({ lead, onDetailsClick, onStatusUpdate }: LeadCardProps) {
    const [focusUnit, setFocusUnit] = useState<any>(null);
    const [loading, setLoading] = useState(false);

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

    // Determine language flag
    const lang = lead.data?.lang || "en";
    const flag = LANG_FLAGS[lang] || "🌐";

    // Determine temperature
    const urgency = lead.data?.urgency || "холодный";
    const tempConfig = TEMP_CONFIG[urgency] || TEMP_CONFIG["холодный"];

    // Score and stage from scoring system
    const score = lead.data?.score || 0;
    const stage = lead.data?.stage || "sandbox";

    // Stage config
    const stageConfig: Record<string, { label: string; color: string; emoji: string }> = {
        sandbox: { label: "Песочница", color: "text-gray-500 bg-gray-500/10 border-gray-500/20", emoji: "🏖️" },
        warmup: { label: "Прогрев", color: "text-orange-500 bg-orange-500/10 border-orange-500/20", emoji: "⚡" },
        handoff: { label: "Готов", color: "text-red-500 bg-red-500/10 border-red-500/20", emoji: "🔥" },
        reactivation: { label: "Реактивация", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", emoji: "🔄" },
    };

    const currentStage = stageConfig[stage] || stageConfig.sandbox;

    // Format last active time
    const lastActive = new Date(lead.created_at);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
    const timeAgo =
        diffMinutes < 60
            ? `${diffMinutes} мин назад`
            : diffMinutes < 1440
                ? `${Math.floor(diffMinutes / 60)} ч назад`
                : `${Math.floor(diffMinutes / 1440)} дн назад`;

    // WhatsApp link
    const whatsappLink = lead.phone
        ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`
        : null;

    return (
        <div className="group relative flex flex-col bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden transition-all hover:border-neutral-700 hover:bg-neutral-900/60">
            {/* Header */}
            <div className="p-5 border-b border-neutral-800/50">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-neutral-950 flex items-center justify-center text-lg font-bold border border-neutral-800/50">
                            {lead.name ? lead.name[0].toUpperCase() : "?"}
                        </div>
                        <div>
                            <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                                {flag} {lead.name || "Аноним"}
                            </h3>
                            <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                                🕒 {timeAgo}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Score Badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${currentStage.color}`}>
                            <span className="text-sm">{currentStage.emoji}</span>
                            <span className="text-xs font-bold">{score} pts</span>
                        </div>
                        {/* Stage Label */}
                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${currentStage.color}`}>
                            {currentStage.label}
                        </div>
                    </div>
                </div>

                {/* Score Progress Bar */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 mb-1.5">
                        <span>Прогресс:</span>
                        <span className="font-bold">{Math.min(score, 10)}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${score >= 5 ? "bg-gradient-to-r from-orange-500 to-red-500" :
                                score >= 3 ? "bg-gradient-to-r from-blue-500 to-orange-500" :
                                    "bg-neutral-600"
                                }`}
                            style={{ width: `${Math.min((score / 10) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Goal & Budget */}
            <div className="px-5 py-4 space-y-2 border-b border-neutral-800/50 bg-neutral-950/20">
                <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-neutral-500" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">ЦЕЛЬ:</span>
                    <span className="text-neutral-200 font-medium">
                        {lead.data?.type || "Не указано"}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-neutral-500" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">БЮДЖЕТ:</span>
                    <span className="text-neutral-200 font-medium">
                        {lead.data?.budget || "Не указан"}
                    </span>
                </div>
            </div>

            {/* Primary Interest */}
            {focusUnit && (
                <div className="px-5 py-4 border-b border-neutral-800/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            ГЛАВНЫЙ ИНТЕРЕС:
                        </span>
                    </div>
                    <div className="space-y-1.5 pl-6">
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-400">🏢</span>
                            <span className="text-sm font-semibold text-neutral-100">
                                {focusUnit.name || "Unit"} <span className="text-xs text-neutral-500">(ID: {focusUnit.id.slice(0, 8)})</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span>📍</span>
                            <span>
                                {focusUnit.city}, {focusUnit.address || "Адрес уточняется"} | {focusUnit.rooms}+1
                            </span>
                        </div>
                        {lead.data?.view_count && (
                            <div className="flex items-center gap-2 text-xs">
                                <Eye className="h-3 w-3 text-blue-400" />
                                <span className="text-neutral-400">
                                    Смотрел <span className="font-bold text-blue-400">{lead.data.view_count} раза</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manager Hints from AI */}
            {lead.data?.manager_hints && (
                <div className="px-5 py-4 border-b border-neutral-800/50 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            ПОДСКАЗКИ МЕНЕДЖЕРУ:
                        </span>
                    </div>
                    <div className="space-y-2 pl-6">
                        <p className="text-sm text-neutral-300 leading-relaxed">
                            {lead.data.manager_hints}
                        </p>
                    </div>
                </div>
            )}

            {/* Conversation Summary */}
            {lead.data?.ai_summary && (
                <div className="px-5 py-4 border-b border-neutral-800/50 bg-neutral-950/30">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle className="h-4 w-4 text-neutral-400" />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            ОПИСАНИЕ ДИАЛОГА:
                        </span>
                    </div>
                    <div className="pl-6">
                        <p className="text-xs text-neutral-400 italic leading-relaxed">
                            &ldquo;{lead.data.ai_summary}&rdquo;
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
                    title="Продано"
                >
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Продано</span>
                </button>

                {/* Delete Button */}
                <button
                    onClick={() => {
                        if (confirm('Удалить этот лид?')) {
                            onStatusUpdate(lead.id, "spam");
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 hover:border-red-500/50 text-sm font-bold transition-all"
                    title="Удалить"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Удалить</span>
                </button>

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
                                alert('✓ Лид отложен на 24 часа. Вернётся в топ автоматически.');
                                onStatusUpdate(lead.id, lead.status); // Refresh
                            }
                        } catch (e) {
                            alert('Ошибка при отложении лида');
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 text-sm font-bold transition-all"
                    title="Отложить на 24ч"
                >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">24ч</span>
                </button>

                {/* Details Button */}
                <button
                    onClick={onDetailsClick}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-sm font-bold transition-all border border-neutral-700"
                    title="Подробнее"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
