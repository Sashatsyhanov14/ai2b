"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    Plus, Trash2, FileText, Image as ImageIcon, Video, File,
    Pencil, Users, BarChart3, Settings as SettingsIcon, Database,
    LayoutDashboard, Building2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import UploadImage from "@/components/UploadImage";
import { useI18n } from "@/i18n";

// --- Types ---
type CompanyFile = {
    id: string;
    name: string;
    description: string | null;
    file_type: string | null;
    url: string;
    category: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    content_text?: string;
};

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
    created_at: string;
};

type Tab = "dashboard" | "knowledge" | "company" | "managers";

const CATEGORIES = [
    { value: "about", label: "О компании" },
    { value: "general", label: "Знания" },
    { value: "license", label: "Лицензии" },
    { value: "certificate", label: "Сертификаты" },
    { value: "presentation", label: "Презентации" },
];

function getFileIcon(type: string | null) {
    if (type === "image") return ImageIcon;
    if (type === "video") return Video;
    if (type === "document") return FileText;
    return File;
}

export default function UnifiedBotPage() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");

    // --- State: Knowledge Base ---
    const [files, setFiles] = useState<CompanyFile[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingContent, setEditingContent] = useState<{ id: string; name: string; content: string } | null>(null);
    const [form, setForm] = useState({ name: "", description: "", file_type: "document", url: "", category: "about" });

    // --- State: Dashboard & Managers ---
    const [sessionsCount, setSessionsCount] = useState<number | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [managers, setManagers] = useState<TelegramManager[]>([]);
    const [managerName, setManagerName] = useState("");
    const [managerTelegramId, setManagerTelegramId] = useState("");
    const [managersLoading, setManagersLoading] = useState(true);
    const [managerError, setManagerError] = useState<string | null>(null);
    const [managerSaving, setManagerSaving] = useState(false);

    // --- Load Data ---
    useEffect(() => {
        loadKnowledge();
        loadBotData();
    }, []);

    async function loadKnowledge() {
        setLoadingFiles(true);
        try {
            const { data, error } = await supabase
                .from("company_files")
                .select("*, content_text")
                .order("category")
                .order("sort_order");
            if (error) throw error;
            setFiles(data || []);
        } finally {
            setLoadingFiles(false);
        }
    }

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
        } finally {
            setLoadingLeads(false);
            setManagersLoading(false);
        }
    }

    // --- Actions: Knowledge ---
    async function handleQuickUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const filesToUpload = Array.from(e.target.files || []);
        if (filesToUpload.length === 0) return;

        setSaving(true);
        try {
            for (const file of filesToUpload) {
                const ts = Date.now();
                const ext = file.name.split('.').pop() || 'bin';
                const safeName = `${ts}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
                const key = `public/company/files/${safeName}`;

                const { error: uploadError } = await supabase.storage
                    .from("property-images")
                    .upload(key, file, { upsert: true });

                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from("property-images").getPublicUrl(key);

                let type = 'document';
                const lowerExt = ext.toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(lowerExt)) type = 'image';
                if (['mp4', 'mov', 'avi'].includes(lowerExt)) type = 'video';

                const { data: inserted, error: dbError } = await supabase.from("company_files").insert({
                    name: file.name,
                    url: publicUrl,
                    file_type: type,
                    category: form.category || 'general',
                    is_active: true,
                    sort_order: 0
                }).select().single();

                if (dbError) throw dbError;
                if (inserted) {
                    fetch('/api/company/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: inserted.id })
                    }).catch(console.error);
                }
            }
            loadKnowledge();
        } finally {
            setSaving(false);
            e.target.value = '';
        }
    }

    async function saveContent() {
        if (!editingContent) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("company_files")
                .update({ content_text: editingContent.content })
                .eq("id", editingContent.id);
            if (error) throw error;
            setFiles(prev => prev.map(f => f.id === editingContent.id ? { ...f, content_text: editingContent.content } : f));
            setEditingContent(null);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteFile(id: string) {
        if (!confirm("Удалить файл?")) return;
        try {
            const { error } = await supabase.from("company_files").delete().eq("id", id);
            if (error) throw error;
            setFiles(prev => prev.filter(f => f.id !== id));
        } catch (e: any) {
            alert(e.message);
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
                body: JSON.stringify({ telegram_id: trimmedId, name: managerName.trim() || null }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.ok && json.data) {
                setManagers(prev => [json.data as TelegramManager, ...prev]);
                setManagerName("");
                setManagerTelegramId("");
            } else {
                setManagerError(json?.error || "Не удалось добавить менеджера.");
            }
        } finally {
            setManagerSaving(false);
        }
    }

    async function handleDeleteManager(id: string) {
        if (!confirm("Удалить менеджера?")) return;
        try {
            const res = await fetch(`/api/telegram-managers/${id}`, { method: "DELETE" });
            if (res.ok) setManagers(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error(err);
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
            }
        } catch (err) {
            console.error(err);
        }
    }

    const groupedFiles = CATEGORIES.map((cat) => ({
        ...cat,
        files: files.filter((f) => f.category === cat.value || (cat.value === 'general' && !f.category)),
    })).filter((cat) => cat.files.length > 0 || cat.value === 'general');

    return (
        <div className="mx-auto max-w-6xl px-6 py-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-50">Настройки бота</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Управление знаниями бота, статистика и менеджеры.
                    </p>
                </div>
            </header>

            {/* Tabs */}
            <div className="mb-8 flex flex-wrap gap-1 rounded-xl bg-neutral-900/50 p-1 w-fit border border-neutral-800">
                <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <LayoutDashboard className="h-4 w-4" /> Главная
                </button>
                <button
                    onClick={() => setActiveTab("company")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "company" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <Building2 className="h-4 w-4" /> О компании
                </button>
                <button
                    onClick={() => setActiveTab("knowledge")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "knowledge" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <Database className="h-4 w-4" /> База знаний
                </button>
                <button
                    onClick={() => setActiveTab("managers")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "managers" ? "bg-zinc-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
                        }`}
                >
                    <SettingsIcon className="h-4 w-4" /> Менеджеры
                </button>
            </div>

            {/* Tab: Dashboard */}
            {activeTab === "dashboard" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <section className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500 mb-4">
                                <BarChart3 className="h-3 w-3" /> Диалогов в Telegram
                            </div>
                            <div className="text-4xl font-bold text-neutral-50">
                                {sessionsCount ?? "0"}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500 mb-4">
                                <Users className="h-3 w-3" /> Лидов за всё время
                            </div>
                            <div className="text-4xl font-bold text-neutral-50">
                                {leads.length}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-neutral-200">Последние лиды</h2>
                        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm">
                            <div className="max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm text-neutral-300">
                                    <thead className="sticky top-0 bg-neutral-900/80 backdrop-blur-md text-xs uppercase tracking-wide text-neutral-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Имя</th>
                                            <th className="px-4 py-3 text-left font-semibold">Телефон</th>
                                            <th className="px-4 py-3 text-left font-semibold">Email</th>
                                            <th className="px-4 py-3 text-left font-semibold">Создан</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {leads.map((l) => (
                                            <tr key={l.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3">{l.name ?? "—"}</td>
                                                <td className="px-4 py-3 text-neutral-400 font-mono">{l.phone ?? "—"}</td>
                                                <td className="px-4 py-3 text-neutral-400">{l.email ?? "—"}</td>
                                                <td className="px-4 py-3 text-neutral-500 text-xs">
                                                    {new Date(l.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {leads.length === 0 && !loadingLeads && (
                                            <tr><td colSpan={4} className="p-8 text-center text-neutral-500 italic">Пока нет лидов.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* Tab: Company or Knowledge Base */}
            {(activeTab === "company" || activeTab === "knowledge") && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`
                            flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                            ${saving ? 'border-neutral-700 bg-neutral-900/50 opacity-50' : 'border-neutral-700 hover:border-blue-500 hover:bg-blue-500/5 bg-neutral-900'}
                        `}>
                            <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                                {saving ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div> : <Plus className="h-6 w-6 text-neutral-400" />}
                            </div>
                            <span className="font-medium text-neutral-200">Загрузить файлы</span>
                            <span className="text-xs text-neutral-500 mt-1">PDF, DOCX, TXT, Images</span>
                            <input type="file" multiple className="hidden"
                                onChange={(e) => {
                                    // Set category based on active tab
                                    setForm(prev => ({ ...prev, category: activeTab === 'company' ? 'about' : 'general' }));
                                    handleQuickUpload(e);
                                }}
                                disabled={saving}
                            />
                        </label>

                        <button
                            onClick={() => {
                                setForm({ name: "", description: "", file_type: "text", url: "text-note", category: activeTab === 'company' ? 'about' : 'general' });
                                setEditingContent({ id: "new", name: "Новая заметка", content: "" });
                            }}
                            disabled={saving}
                            className="flex flex-col items-center justify-center p-8 border border-neutral-800 bg-neutral-900 rounded-2xl hover:bg-neutral-800 transition-all text-left group"
                        >
                            <div className="h-12 w-12 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center mb-3 transition-colors">
                                <FileText className="h-6 w-6 text-neutral-400" />
                            </div>
                            <span className="font-medium text-neutral-200">Написать замеку</span>
                            <span className="text-xs text-neutral-500 mt-1">
                                {activeTab === 'company' ? 'История компании, описание услуг...' : 'Инструкции, ответы на вопросы...'}
                            </span>
                        </button>
                    </section>

                    <div className="space-y-6">
                        {groupedFiles
                            .filter(g => activeTab === 'company' ? g.value === 'about' : g.value !== 'about')
                            .map((group) => (
                                <div key={group.value}>
                                    {group.files.length > 0 && <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">{group.label}</h3>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {group.files.map((file) => {
                                            const Icon = getFileIcon(file.file_type);
                                            return (
                                                <div key={file.id} className="group relative rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 hover:bg-neutral-900 transition-all">
                                                    <div className="flex gap-3 mb-3">
                                                        <div className="shrink-0">
                                                            {file.file_type === "image" ? (
                                                                <img src={file.url} alt="" className="w-12 h-12 rounded object-cover" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center text-neutral-500">
                                                                    <Icon className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 pr-12">
                                                            <div className="font-medium text-neutral-200 truncate text-sm">{file.name}</div>
                                                            <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-tighter">
                                                                {file.file_type === 'text' ? 'Заметка' : 'Файл'}
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setEditingContent({ id: file.id, name: file.name, content: file.content_text || "" })}
                                                                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-blue-400"
                                                            ><Pencil className="h-3.5 w-3.5" /></button>
                                                            <button
                                                                onClick={() => handleDeleteFile(file.id)}
                                                                className="p-1.5 rounded hover:bg-red-900/30 text-neutral-500 hover:text-red-400"
                                                            ><Trash2 className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    </div>
                                                    {file.content_text && (
                                                        <div className="mt-2 p-2 bg-neutral-950/50 rounded text-[10px] text-neutral-500 font-mono line-clamp-2 border border-neutral-800/30 leading-relaxed">
                                                            {file.content_text}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Tab: Managers */}
            {activeTab === "managers" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
                        <h2 className="text-lg font-semibold text-neutral-200 mb-6">Telegram‑менеджеры</h2>
                        <form onSubmit={handleAddManager} className="flex flex-col gap-4 md:flex-row md:items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-medium text-neutral-400 ml-1">Имя</label>
                                <input
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-all"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                    placeholder="Анна"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-medium text-neutral-400 ml-1">Telegram ID</label>
                                <input
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-all"
                                    value={managerTelegramId}
                                    onChange={(e) => setManagerTelegramId(e.target.value)}
                                    placeholder="123456789"
                                />
                            </div>
                            <Button type="submit" disabled={!managerTelegramId.trim() || managerSaving} className="h-[46px] px-8">
                                Добавить
                            </Button>
                        </form>
                        {managerError && <p className="mt-4 text-xs text-red-400">{managerError}</p>}
                    </section>

                    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm">
                        <table className="w-full text-sm text-neutral-300">
                            <thead className="bg-neutral-900/80 backdrop-blur-md text-xs uppercase tracking-wide text-neutral-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Имя</th>
                                    <th className="px-4 py-3 text-left">ID</th>
                                    <th className="px-4 py-3 text-left">Статус</th>
                                    <th className="px-4 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {managers.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 font-medium">{m.name || "Без имени"}</td>
                                        <td className="px-4 py-3 text-neutral-500 font-mono">{m.telegram_id}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggleManager(m)}
                                                className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all ${m.is_active ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-neutral-800 text-neutral-500 border border-neutral-700"
                                                    }`}
                                            >
                                                {m.is_active ? "Активен" : "Отключен"}
                                            </button>
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
                                    <tr><td colSpan={4} className="p-8 text-center text-neutral-500 italic">Нет зарегистрированных менеджеров.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Editing Modal */}
            {editingContent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {editingContent?.id === "new" ? "Новая заметка" : `Редактирование: ${editingContent?.name}`}
                            </h3>
                            <button onClick={() => setEditingContent(null)} className="rounded p-1 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors">
                                Закрыть
                            </button>
                        </div>

                        {editingContent?.id === "new" && (
                            <div className="mb-4">
                                <input
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                                    placeholder="Заголовок заметки"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <textarea
                                className="w-full h-96 bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 text-sm font-mono text-neutral-300 leading-relaxed outline-none focus:border-blue-900 transition-colors resize-none"
                                value={editingContent?.content || ""}
                                onChange={e => setEditingContent(prev => prev ? { ...prev, content: e.target.value } : null)}
                                placeholder="Текст, который должен знать бот..."
                            />
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setEditingContent(null)}>Отмена</Button>
                            <Button
                                onClick={async () => {
                                    if (editingContent?.id === "new") {
                                        if (!form.name) return alert("Введите название");
                                        setSaving(true);
                                        const { error } = await supabase.from("company_files").insert({
                                            name: form.name,
                                            file_type: "text",
                                            url: "manual-entry",
                                            category: "general",
                                            content_text: editingContent?.content,
                                            is_active: true
                                        });
                                        setSaving(false);
                                        if (!error) {
                                            setEditingContent(null);
                                            loadKnowledge();
                                        } else {
                                            alert(error.message);
                                        }
                                    } else {
                                        saveContent();
                                    }
                                }}
                                disabled={saving}
                            >
                                {saving ? "Сохранение..." : "Сохранить изменения"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
