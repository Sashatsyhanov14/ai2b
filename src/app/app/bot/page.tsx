"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    Plus, Trash2, Users, LayoutDashboard, Globe
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n";
import { Loader2 } from "lucide-react";

// --- Types ---

type Lead = {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    status: string | null;
    created_at: string;
};

type TelegramManager = {
    id: string;
    telegram_id: number;
    name: string | null;
    is_active: boolean;
    preferred_lang: string;
    created_at: string;
};

type Tab = "managers" | "faq";

type FAQEntry = {
    id: string;
    question: string;
    answer: string;
    is_active: boolean;
    i18n: {
        ru?: { question: string, answer: string },
        en?: { question: string, answer: string },
        tr?: { question: string, answer: string }
    }
};

export default function UnifiedBotPage() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>("faq");
    const [faqLang, setFaqLang] = useState<"ru" | "en" | "tr">("ru");

    // --- State: Dashboard & Managers ---
    const [, setSessionsCount] = useState<number | null>(null);
    const [, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [managers, setManagers] = useState<TelegramManager[]>([]);
    const [managerName, setManagerName] = useState("");
    const [managerTelegramId, setManagerTelegramId] = useState("");
    const [managersLoading, setManagersLoading] = useState(true);
    const [managerError, setManagerError] = useState<string | null>(null);
    const [managerSaving, setManagerSaving] = useState(false);
    const [managerLang, setManagerLang] = useState("ru");

    // --- State: FAQ ---
    const [faqs, setFaqs] = useState<FAQEntry[]>([]);
    const [loadingFaqs, setLoadingFaqs] = useState(false);
    const [faqSaving, setFaqSaving] = useState(false);

    // --- Load Data ---
    useEffect(() => {
        loadBotData();
    }, []);

    async function loadBotData() {
        setLoadingLeads(true);
        setManagersLoading(true);
        try {
            const [statsRes, leadsRes, managersRes] = await Promise.all([
                fetch("/api/bot/stats"),
                fetch("/api/leads?limit=50"),
                fetch("/api/telegram-managers"),
            ]);
            const statsJson = await statsRes.json().catch(() => ({}));
            const leadsJson = await leadsRes.json().catch(() => ({}));
            const managersJson = await managersRes.json().catch(() => ({}));

            if (statsJson?.ok) setSessionsCount(statsJson.sessionsCount ?? 0);
            if (leadsJson?.ok && Array.isArray(leadsJson.data)) setLeads(leadsJson.data);
            if (managersJson?.ok && Array.isArray(managersJson.data)) setManagers(managersJson.data);
            loadFaqs();
        } finally {
            setLoadingLeads(false);
            setManagersLoading(false);
        }
    }

    // --- Actions: FAQ ---
    async function loadFaqs() {
        setLoadingFaqs(true);
        try {
            const res = await fetch("/api/faq");
            const json = await res.json();
            if (json.ok) setFaqs(json.data);
        } finally {
            setLoadingFaqs(false);
        }
    }

    async function handleAddFaq() {
        setFaqSaving(true);
        try {
            const res = await fetch("/api/faq", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    question: "Новый вопрос", 
                    answer: "Ответ на вопрос",
                    i18n: {
                        ru: { question: "Новый вопрос", answer: "Ответ на вопрос" },
                        en: { question: "New Question", answer: "Answer here" },
                        tr: { question: "Yeni Soru", answer: "Cevap buraya" }
                    }
                })
            });
            const json = await res.json();
            if (json.ok) setFaqs([...faqs, json.data]);
        } finally {
            setFaqSaving(false);
        }
    }

    async function handleUpdateFaq(id: string, updates: any) {
        setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }

    async function handleUpdateFaqI18n(id: string, lang: string, field: string, value: string) {
        setFaqs(prev => prev.map(f => {
            if (f.id !== id) return f;
            const newI18n = { ...f.i18n };
            newI18n[lang as keyof typeof f.i18n] = {
                ...newI18n[lang as keyof typeof f.i18n],
                [field]: value
            };
            return { 
                ...f, 
                i18n: newI18n,
                // Update top level if it's currently active language or default RU
                ...(lang === "ru" || lang === faqLang ? { [field]: value } : {})
            };
        }));
    }

    async function handleSaveFaq(id: string, updates: any) {
        try {
            await fetch(`/api/faq/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
        } catch (e) {
            console.error("Save FAQ error", e);
        }
    }

    async function handleDeleteFaq(id: string) {
        if (!confirm(t("common.delete") + "?")) return;
        try {
            await fetch(`/api/faq/${id}`, { method: "DELETE" });
            setFaqs(prev => prev.filter(f => f.id !== id));
        } catch (e) {
            console.error("Delete FAQ error", e);
        }
    }

    // --- Actions: Managers ---
    async function handleAddManager(e: FormEvent) {
        e.preventDefault();
        const trimmedId = managerTelegramId.trim();
        if (!trimmedId) return;

        setManagerError(null);
        setManagerSaving(true);
        try {
            const res = await fetch("/api/telegram-managers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegram_id: trimmedId,
                    name: managerName.trim() || null,
                    preferred_lang: managerLang
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.ok && json.data) {
                setManagers(prev => [json.data as TelegramManager, ...prev]);
                setManagerName("");
                setManagerTelegramId("");
                setManagerLang("ru");
            } else {
                setManagerError(json?.error || t("common.error"));
            }
        } finally {
            setManagerSaving(false);
        }
    }

    async function handleDeleteManager(id: string) {
        if (!confirm(t("common.delete") + "?")) return;
        try {
            const res = await fetch(`/api/telegram-managers/${id}`, { method: "DELETE" });
            if (res.ok) {
                setManagers(prev => prev.filter(m => m.id !== id));
            } else {
                const json = await res.json().catch(() => ({}));
                alert(t("common.error") + ": " + (json.error || "Error"));
            }
        } catch (err: any) {
            console.error("Delete manager error:", err);
            alert(t("common.error") + ": " + err.message);
        }
    }

    async function handleToggleManager(manager: TelegramManager) {
        try {
            const res = await fetch(`/api/telegram-managers/${manager.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !manager.is_active }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.ok && json.data) {
                setManagers(prev => prev.map(m => m.id === json.data.id ? json.data : m));
            } else {
                const errorText = json?.error || t("common.error");
                alert(errorText);
            }
        } catch (err: any) {
            console.error("Toggle manager error:", err);
            alert(t("common.error") + ": " + err.message);
        }
    }

    async function handleUpdateManagerLang(id: string, lang: string) {
        try {
            const res = await fetch(`/api/telegram-managers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferred_lang: lang }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.ok && json.data) {
                setManagers(prev => prev.map(m => m.id === json.data.id ? json.data : m));
            }
        } catch (err: any) {
            console.error("Update manager lang error:", err);
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-6 py-6 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-50">{t("bot.title")}</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        {t("bot.description")}
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="mb-8 flex flex-wrap gap-1 rounded-xl bg-neutral-900/50 p-1 w-fit border border-neutral-800">
                <button
                    onClick={() => setActiveTab("faq")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "faq" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <LayoutDashboard className="h-4 w-4" /> FAQ
                </button>
                <button
                    onClick={() => setActiveTab("managers")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "managers" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <Users className="h-4 w-4" /> {t("bot.tabs.managers")}
                </button>
            </div>

            {/* Tab: FAQ */}
            {activeTab === "faq" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-100 italic">Часто задаваемые вопросы (FAQ)</h2>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Управляйте списком популярных вопросов и ответов на 3 языках.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {/* Language Selector */}
                                <div className="flex items-center gap-1 rounded-xl bg-neutral-950 p-1 border border-neutral-800">
                                    {(["ru", "en", "tr"] as const).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setFaqLang(lang)}
                                            className={`
                                                px-3 py-1.5 text-xs font-bold rounded-lg transition-all
                                                ${faqLang === lang ? "bg-blue-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"}
                                            `}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleAddFaq}
                                    disabled={faqSaving}
                                    className="gap-2 bg-emerald-600/10 text-emerald-400 border-emerald-600/20 hover:bg-emerald-600/20 h-10 px-4"
                                >
                                    <Plus className="h-4 w-4" /> Добавить FAQ
                                </Button>
                            </div>
                        </div>

                        {loadingFaqs ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {faqs.map((faq) => {
                                    const l = faqLang;
                                    const val = faq.i18n?.[l] || { question: "", answer: "" };

                                    return (
                                        <div key={faq.id} className="group relative rounded-2xl border border-neutral-800 bg-neutral-950 p-6 transition-all hover:border-neutral-700">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                                            {l.toUpperCase()}
                                                        </div>
                                                        <input
                                                            className="flex-1 bg-transparent border-none text-neutral-100 font-bold outline-none placeholder:text-neutral-700 p-0 text-lg"
                                                            value={val.question}
                                                            onChange={(e) => handleUpdateFaqI18n(faq.id, l, "question", e.target.value)}
                                                            onBlur={(e) => handleSaveFaq(faq.id, { i18n: { ...faq.i18n, [l]: { ...val, question: e.target.value } } })}
                                                            placeholder={`Вопрос на ${l.toUpperCase()}...`}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteFaq(faq.id)}
                                                        className="p-2 rounded-lg bg-red-500/5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <textarea
                                                        className="w-full bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-400 leading-relaxed outline-none focus:border-emerald-500/30 transition-all resize-none min-h-[100px]"
                                                        value={val.answer}
                                                        onChange={(e) => handleUpdateFaqI18n(faq.id, l, "answer", e.target.value)}
                                                        onBlur={(e) => handleSaveFaq(faq.id, { i18n: { ...faq.i18n, [l]: { ...val, answer: e.target.value } } })}
                                                        placeholder={`Ответ на ${l.toUpperCase()}...`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {faqs.length === 0 && (
                                    <div className="py-20 text-center text-neutral-600 italic">
                                        Список FAQ пуст. Добавьте первый вопрос.
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Tab: Managers */}
            {activeTab === "managers" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-neutral-50 mb-1">{t("bot.managers.title")}</h2>
                        </div>
                        <form onSubmit={handleAddManager} className="flex flex-col gap-4 md:flex-row md:items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-medium text-neutral-400 ml-1">{t("bot.managers.name")}</label>
                                <input
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-all font-sans"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                    placeholder="Анна"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-medium text-neutral-400 ml-1">{t("bot.managers.tgId")}</label>
                                <input
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-all font-mono"
                                    value={managerTelegramId}
                                    onChange={(e) => setManagerTelegramId(e.target.value)}
                                    placeholder="123456789"
                                />
                            </div>
                            <div className="w-32 space-y-2">
                                <label className="text-xs font-medium text-neutral-400 ml-1">{t("bot.managers.lang")}</label>
                                <select
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    value={managerLang}
                                    onChange={(e) => setManagerLang(e.target.value)}
                                >
                                    <option value="ru">RU</option>
                                    <option value="en">EN</option>
                                    <option value="tr">TR</option>
                                </select>
                            </div>
                            <Button
                                type="submit"
                                disabled={!managerTelegramId.trim() || managerSaving}
                                className="h-[46px] px-8 bg-gradient-to-tr from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 border-0 transition-all active:scale-95"
                            >
                                {managerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("bot.managers.add")}
                            </Button>
                        </form>
                        {managerError && <p className="mt-4 text-xs text-red-400">{managerError}</p>}
                    </section>

                    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm">
                        <table className="w-full text-sm text-neutral-300">
                            <thead className="bg-neutral-900/80 backdrop-blur-md text-xs uppercase tracking-wide text-neutral-500">
                                <tr className="border-b border-neutral-800">
                                    <th className="px-4 py-3 text-left">{t("bot.managers.name")}</th>
                                    <th className="px-4 py-3 text-left font-mono text-[10px] text-neutral-500 uppercase">{t("bot.managers.tgId")}</th>
                                    <th className="px-4 py-3 text-center">{t("bot.managers.lang")}</th>
                                    <th className="px-4 py-3 text-center">{t("bot.managers.status")}</th>
                                    <th className="px-4 py-3 text-right">{t("bot.managers.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {managers.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium">{m.name || "Без имени"}</td>
                                        <td className="px-4 py-3 text-neutral-500 font-mono">{m.telegram_id}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-block relative">
                                                <select
                                                    className="appearance-none bg-neutral-900/50 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] font-bold text-neutral-400 outline-none cursor-pointer hover:text-white hover:border-neutral-700 transition-all pr-6"
                                                    value={m.preferred_lang || "ru"}
                                                    onChange={(e) => handleUpdateManagerLang(m.id, e.target.value)}
                                                >
                                                    <option value="ru" className="bg-neutral-950">RU</option>
                                                    <option value="en" className="bg-neutral-950">EN</option>
                                                    <option value="tr" className="bg-neutral-950">TR</option>
                                                </select>
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                                    <Plus className="h-2 w-2 rotate-45" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleManager(m);
                                                    }}
                                                    className={`
                                                        w-8 h-4 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none
                                                        ${m.is_active ? "bg-emerald-500" : "bg-neutral-600"}
                                                    `}
                                                >
                                                    <div className={`
                                                        bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200
                                                        ${m.is_active ? "translate-x-4" : "translate-x-0"}
                                                    `} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDeleteManager(m.id)}
                                                className="p-1.5 rounded hover:bg-red-900/30 text-neutral-500 hover:text-red-400 transition-colors"
                                            ><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {managers.length === 0 && !managersLoading && (
                                    <tr><td colSpan={5} className="p-8 text-center text-neutral-500 italic">{t("bot.managers.empty")}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
