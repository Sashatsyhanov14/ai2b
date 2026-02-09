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

    async function handleQuickUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setSaving(true);
        try {
            for (const file of files) {
                // Upload to Supabase Storage
                const ts = Date.now();
                const ext = file.name.split('.').pop() || 'bin';
                const safeName = `${ts}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
                const key = `public/company/files/${safeName}`;

                const { error: uploadError } = await supabase.storage
                    .from("property-images") // reusing existing bucket
                    .upload(key, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from("property-images").getPublicUrl(key);

                // Determine type
                let type = 'document';
                const lowerExt = ext.toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(lowerExt)) type = 'image';
                if (['mp4', 'mov', 'avi'].includes(lowerExt)) type = 'video';

                // Insert into DB
                const { data: inserted, error: dbError } = await supabase.from("company_files").insert({
                    name: file.name,
                    url: publicUrl,
                    file_type: type,
                    category: 'general', // default
                    is_active: true,
                    sort_order: 0
                }).select().single();

                if (dbError) throw dbError;

                // Process
                if (inserted) {
                    fetch('/api/company/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: inserted.id })
                    }).catch(console.error);
                }
            }
            loadFiles();
        } catch (e: any) {
            alert("Upload failed: " + e.message);
        } finally {
            setSaving(false);
            e.target.value = ''; // reset input
        }
    }

    async function handleQuickNote() {
        // Just trigger the new note modal (reusing editingContent state)
        setForm({ name: "", description: "", file_type: "text", url: "text-note", category: "general" });
        setEditingContent({ id: "new", name: "Новая заметка", content: "" });
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
        <div className="mx-auto max-w-5xl px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-50 mb-2">База знаний</h1>
                <p className="text-neutral-400 mb-6 max-w-2xl">
                    Загружайте любые файлы или пишите заметки. Бот автоматически изучит их и будет использовать эту информацию для ответов.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quick File Upload */}
                    <label className={`
                        flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                        ${saving ? 'border-neutral-700 bg-neutral-900/50 opacity-50' : 'border-neutral-700 hover:border-blue-500 hover:bg-blue-500/5 bg-neutral-900'}
                    `}>
                        <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                            {saving ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div> : <Plus className="h-6 w-6 text-neutral-400" />}
                        </div>
                        <span className="font-medium text-neutral-200">Загрузить файлы</span>
                        <span className="text-xs text-neutral-500 mt-1">PDF, DOCX, TXT, Images</span>
                        <input type="file" multiple className="hidden" onChange={handleQuickUpload} disabled={saving} />
                    </label>

                    {/* Quick Note */}
                    <button
                        onClick={handleQuickNote}
                        disabled={saving}
                        className="flex flex-col items-center justify-center p-8 border border-neutral-800 bg-neutral-900 rounded-2xl hover:bg-neutral-800 transition-all text-left group"
                    >
                        <div className="h-12 w-12 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center mb-3 transition-colors">
                            <FileText className="h-6 w-6 text-neutral-400" />
                        </div>
                        <span className="font-medium text-neutral-200">Написать заметку</span>
                        <span className="text-xs text-neutral-500 mt-1">Инструкции, ответы на вопросы</span>
                    </button>
                </div>
            </div>

            {/* Edit Content Modal (Kept for editing existing or new notes) */}
            {(editingContent) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {editingContent?.id === "new" ? "Новая заметка" : `Редактирование: ${editingContent?.name}`}
                            </h3>
                            <button
                                onClick={() => { setEditingContent(null); }}
                                className="rounded px-2 py-1 text-neutral-400 hover:bg-neutral-900"
                            >
                                Закрыть
                            </button>
                        </div>

                        {editingContent?.id === "new" && (
                            <div className="mb-4">
                                <input
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm"
                                    placeholder="Заголовок (например: График работы)"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <textarea
                                className="w-full h-96 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-sm font-mono text-neutral-300 leading-relaxed outline-none focus:border-blue-900 transition-colors resize-none"
                                value={editingContent?.content || ""}
                                onChange={e => setEditingContent(prev => prev ? { ...prev, content: e.target.value } : null)}
                                placeholder="Текст заметки..."
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => { setEditingContent(null); }}
                            >
                                Отмена
                            </Button>
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
                                Сохранить
                            </Button>
                        </div>
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
