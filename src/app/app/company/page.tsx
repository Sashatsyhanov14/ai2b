"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, FileText, Image, Video, File } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import UploadImage from "@/components/UploadImage";

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
};

const CATEGORIES = [
    { value: "about", label: "О компании" },
    { value: "license", label: "Лицензии" },
    { value: "certificate", label: "Сертификаты" },
    { value: "presentation", label: "Презентации" },
    { value: "general", label: "Прочее" },
];

function getFileIcon(type: string | null) {
    if (type === "image") return Image;
    if (type === "video") return Video;
    if (type === "document") return FileText;
    return File;
}

export default function CompanyPage() {
    const [files, setFiles] = useState<CompanyFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        file_type: "document",
        url: "",
        category: "about",
    });

    const [editingContent, setEditingContent] = useState<{ id: string; name: string; content: string } | null>(null);

    async function loadFiles() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("company_files")
                .select("*, content_text") // ensure content_text is fetched
                .order("category")
                .order("sort_order");

            if (error) throw error;
            setFiles(data || []);
        } catch (e: any) {
            console.error("Load files error:", e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFiles();
    }, []);

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
        } catch (e: any) {
            alert("Ошибка сохранения: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleSave() {
        if (!form.name || !form.url) {
            alert("Укажите название и файл/ссылку");
            return;
        }

        setSaving(true);
        try {
            const { data: inserted, error } = await supabase.from("company_files").insert({
                name: form.name,
                description: form.description || null,
                file_type: form.file_type,
                url: form.url,
                category: form.category,
                sort_order: files.length,
                is_active: true,
            }).select().single();

            if (error) throw error;

            // Trigger AI processing
            if (inserted) {
                fetch('/api/company/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: inserted.id })
                }).catch(console.error); // don't block UI
            }

            setForm({ name: "", description: "", file_type: "document", url: "", category: "about" });
            setShowForm(false);
            loadFiles();
        } catch (e: any) {
            alert("Ошибка сохранения: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Удалить файл?")) return;

        try {
            const { error } = await supabase.from("company_files").delete().eq("id", id);
            if (error) throw error;
            setFiles((prev) => prev.filter((f) => f.id !== id));
        } catch (e: any) {
            alert("Ошибка удаления: " + e.message);
        }
    }

    const groupedFiles = CATEGORIES.map((cat) => ({
        ...cat,
        files: files.filter((f) => f.category === cat.value),
    })).filter((cat) => cat.files.length > 0);

    return (
        <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-50">База знаний (О компании)</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Файлы и тексты, которые бот использует для ответов на вопросы.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {
                        setForm({ name: "", description: "", file_type: "text", url: "text-note", category: "about" });
                        setEditingContent({ id: "new", name: "Новая заметка", content: "" });
                    }}>
                        <FileText className="h-4 w-4 mr-1" /> Добавить текст
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Загрузить файл
                    </Button>
                </div>
            </div>

            {/* Edit Content Modal */}
            {(editingContent || (showForm && form.file_type === 'text')) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {editingContent?.id === "new" ? "Создание текстовой заметки" : `Редактирование: ${editingContent?.name}`}
                            </h3>
                            <button
                                onClick={() => { setEditingContent(null); setShowForm(false); }}
                                className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900"
                            >
                                Закрыть
                            </button>
                        </div>

                        {editingContent?.id === "new" && (
                            <div className="mb-4 space-y-3">
                                <input
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                                    placeholder="Название заметки (например: Частые вопросы)"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                                <select
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-500 uppercase font-semibold">
                                {editingContent?.id === "new" ? "Текст заметки" : "Распознанный текст (контекст для бота)"}
                            </label>
                            <textarea
                                className="w-full h-96 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-sm font-mono text-neutral-300 leading-relaxed outline-none focus:border-blue-900 transition-colors resize-none"
                                value={editingContent?.content || ""}
                                onChange={e => setEditingContent(prev => prev ? { ...prev, content: e.target.value } : null)}
                                placeholder="Введите текст, который бот должен знать..."
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => { setEditingContent(null); setShowForm(false); }}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (editingContent?.id === "new") {
                                        // Save new text note
                                        if (!form.name) return alert("Введите название");
                                        setSaving(true);
                                        const { error } = await supabase.from("company_files").insert({
                                            name: form.name,
                                            file_type: "text",
                                            url: "manual-entry",
                                            category: form.category,
                                            content_text: editingContent?.content,
                                            is_active: true
                                        });
                                        setSaving(false);
                                        if (!error) {
                                            setEditingContent(null);
                                            loadFiles();
                                        } else {
                                            alert(error.message);
                                        }
                                    } else {
                                        saveContent();
                                    }
                                }}
                                disabled={saving}
                            >
                                {saving ? "Сохранение..." : "Сохранить"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}


            {/* Upload Form Modal */}
            {showForm && form.file_type !== 'text' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    {/* ... unchanged upload form ... */}
                    {/* Use the implementation from previous file but keep it concise here in replacing */}
                    <div className="w-[500px] rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                        {/* ... same header ... */}
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Добавить файл</h3>
                            <button onClick={() => setShowForm(false)} className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900">Закрыть</button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-xs text-zinc-400 mb-1">Название</label><input className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например: Прайс-лист" /></div>
                            <div><label className="block text-xs text-zinc-400 mb-1">Категория</label><select className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}</select></div>
                            <div><label className="block text-xs text-zinc-400 mb-1">Тип файла</label><select className="w-full rounded border border-neutral-700 bg-neutral-900 p-2" value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}><option value="document">Документ</option><option value="image">Изображение</option><option value="video">Видео</option></select></div>
                            <div><label className="block text-xs text-zinc-400 mb-1">Файл</label><UploadImage ownerUid="public" entity="company" entityId="files" onUploaded={(url) => setForm({ ...form, url })} /></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-900">Отмена</button><button onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60">{saving ? "Сохранение…" : "Сохранить"}</button></div>
                    </div>
                </div>
            )}

            {/* Files List */}
            {loading ? (
                <div className="text-center text-neutral-400 py-10">Загрузка...</div>
            ) : files.length === 0 ? (
                <div className="text-center text-neutral-400 py-10">
                    Пока нет данных.
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedFiles.map((group) => (
                        <div key={group.value}>
                            <h2 className="text-lg font-medium text-neutral-200 mb-3">{group.label}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.files.map((file) => {
                                    const Icon = getFileIcon(file.file_type);
                                    return (
                                        <div
                                            key={file.id}
                                            className="group relative rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:bg-neutral-900 hover:border-neutral-700"
                                        >
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
                                                <div className="min-w-0 pr-6">
                                                    <div className="font-medium text-neutral-200 truncate">{file.name}</div>
                                                    <div className="text-xs text-neutral-500 mt-0.5 truncate">
                                                        {file.file_type === 'text' ? 'Текстовая заметка' : 'Файл'}
                                                    </div>
                                                </div>

                                                <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingContent({ id: file.id, name: file.name, content: (file as any).content_text || "" })}
                                                        title="Редактировать данные для ИИ"
                                                        className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-blue-400"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(file.id)}
                                                        className="p-1.5 rounded hover:bg-red-900/30 text-neutral-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {(file as any).content_text && (
                                                <div className="mt-2 p-2 bg-neutral-950/50 rounded text-[10px] text-neutral-500 font-mono leading-relaxed line-clamp-3 border border-neutral-800/50">
                                                    {(file as any).content_text}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
