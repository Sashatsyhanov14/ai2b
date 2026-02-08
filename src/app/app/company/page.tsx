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

    async function loadFiles() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("company_files")
                .select("*")
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

    async function handleSave() {
        if (!form.name || !form.url) {
            alert("Укажите название и файл/ссылку");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("company_files").insert({
                name: form.name,
                description: form.description || null,
                file_type: form.file_type,
                url: form.url,
                category: form.category,
                sort_order: files.length,
                is_active: true,
            });

            if (error) throw error;

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
                    <h1 className="text-2xl font-semibold text-neutral-50">О компании</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Документы, лицензии, презентации и другие файлы компании
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Добавить файл
                </Button>
            </div>

            {/* Add Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="w-[500px] rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Добавить файл</h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900"
                            >
                                Закрыть
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Название</label>
                                <input
                                    className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Например: Лицензия на деятельность"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Категория</label>
                                <select
                                    className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Тип файла</label>
                                <select
                                    className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
                                    value={form.file_type}
                                    onChange={(e) => setForm({ ...form, file_type: e.target.value })}
                                >
                                    <option value="document">Документ</option>
                                    <option value="image">Изображение</option>
                                    <option value="video">Видео</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Описание (опционально)</label>
                                <textarea
                                    className="w-full h-20 rounded border border-neutral-700 bg-neutral-900 p-2"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Файл</label>
                                <UploadImage
                                    ownerUid="public"
                                    entity="company"
                                    entityId="files"
                                    onUploaded={(url) => setForm({ ...form, url })}
                                />
                                {form.url && (
                                    <div className="mt-2 text-xs text-emerald-400 truncate">{form.url}</div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowForm(false)}
                                className="rounded px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-900"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
                            >
                                {saving ? "Сохранение…" : "Сохранить"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Files List */}
            {loading ? (
                <div className="text-center text-neutral-400 py-10">Загрузка...</div>
            ) : files.length === 0 ? (
                <div className="text-center text-neutral-400 py-10">
                    Пока нет файлов. Добавьте первый.
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
                                            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex gap-3"
                                        >
                                            <div className="shrink-0">
                                                {file.file_type === "image" ? (
                                                    <img
                                                        src={file.url}
                                                        alt={file.name}
                                                        className="w-16 h-16 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded bg-neutral-800 flex items-center justify-center">
                                                        <Icon className="h-8 w-8 text-neutral-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-neutral-100 hover:text-blue-400 truncate block"
                                                >
                                                    {file.name}
                                                </a>
                                                {file.description && (
                                                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                                                        {file.description}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="shrink-0 p-1.5 rounded-full border border-red-700 bg-red-900/20 text-red-300 hover:bg-red-900/40"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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
