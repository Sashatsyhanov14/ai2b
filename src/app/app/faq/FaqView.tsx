'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: { title: 'Управление FAQ', add: 'Добавить', question: 'Вопрос', answer: 'Ответ...', save: 'Сохранить', cancel: 'Отмена', deleteConfirm: 'Удалить этот вопрос?', empty: 'FAQ пуст. Добавьте первый вопрос.' },
    en: { title: 'FAQ Manager', add: 'Add', question: 'Question', answer: 'Answer...', save: 'Save', cancel: 'Cancel', deleteConfirm: 'Delete this question?', empty: 'FAQ is empty. Add the first question.' },
    tr: { title: 'SSS Yönetimi', add: 'Ekle', question: 'Soru', answer: 'Cevap...', save: 'Kaydet', cancel: 'İptal', deleteConfirm: 'Bu soruyu silmek istiyor musunuz?', empty: 'SSS boş. İlk soruyu ekleyin.' },
    de: { title: 'FAQ-Verwaltung', add: 'Hinzufügen', question: 'Frage', answer: 'Antwort...', save: 'Speichern', cancel: 'Abbrechen', deleteConfirm: 'Diese Frage löschen?', empty: 'FAQ ist leer. Fügen Sie die erste Frage hinzu.' },
    es: { title: 'Gestor de FAQ', add: 'Añadir', question: 'Pregunta', answer: 'Respuesta...', save: 'Guardar', cancel: 'Cancelar', deleteConfirm: '¿Eliminar esta pregunta?', empty: 'El FAQ está vacío. Añade la primera pregunta.' },
    ar: { title: 'إدارة الأسئلة الشائعة', add: 'إضافة', question: 'السؤال', answer: 'الإجابة...', save: 'حفظ', cancel: 'إلغاء', deleteConfirm: 'حذف هذا السؤال؟', empty: 'الأسئلة الشائعة فارغة. أضف السؤال الأول.' },
    fr: { title: 'Gestion FAQ', add: 'Ajouter', question: 'Question', answer: 'Réponse...', save: 'Sauvegarder', cancel: 'Annuler', deleteConfirm: 'Supprimer cette question ?', empty: 'La FAQ est vide. Ajoutez la première question.' },
};

export default function FaqView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingFaq, setEditingFaq] = useState<any>(null);
    const [form, setForm] = useState<any>({
        question: '',
        answer: '',
        photos: []
    });
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [translating, setTranslating] = useState(false);

    useEffect(() => { fetchFaqs(); }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        const { data } = await supabase.from('faq').select('*').order('sort_order', { ascending: true });
        if (data) setFaqs(data);
        setLoading(false);
    };



    const handleSave = async () => {
        if (!form.question || !form.answer) return;
        
        setTranslating(true);
        try {
            // Auto translate question and answer in parallel
            const [transQ, transA] = await Promise.all([
                fetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: form.question }) }).then(r => r.json()),
                fetch('/api/translate', { method: 'POST', body: JSON.stringify({ text: form.answer }) }).then(r => r.json())
            ]);

            const payload = {
                question: transQ.ru || form.question,
                answer: transA.ru || form.answer,
                i18n: {
                    questions: transQ,
                    answers: transA
                },
                photos: form.photos
            };

            if (editingFaq) {
                await supabase.from('faq').update(payload).eq('id', editingFaq.id);
            } else {
                await supabase.from('faq').insert(payload);
            }

            resetForm();
            fetchFaqs();
        } catch (e) {
            console.error('FAQ Save Error:', e);
            alert('Error saving FAQ');
        }
        setTranslating(false);
    };

    const handleEdit = (faq: any) => {
        setEditingFaq(faq);
        const questions = faq.i18n?.questions || { ru: faq.question };
        const answers = faq.i18n?.answers || { ru: faq.answer };
        
        setForm({
            question: questions.ru || faq.question,
            answer: answers.ru || faq.answer,
            photos: faq.photos || []
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t.deleteConfirm)) return;
        await supabase.from('faq').delete().eq('id', id);
        fetchFaqs();
    };

    const resetForm = () => {
        setEditingFaq(null);
        setForm({
            question: '',
            answer: '',
            photos: []
        });
        setIsFormOpen(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setTranslating(true);
        const newPhotos = [...form.photos];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `faq/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            newPhotos.push(publicUrl);
        }

        setForm({ ...form, photos: newPhotos });
        setTranslating(false);
    };

    const removePhoto = (url: string) => {
        setForm({ ...form, photos: form.photos.filter((p: string) => p !== url) });
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400">help</span>
                    {t.title}
                </h2>
                <button
                    onClick={() => { resetForm(); setIsFormOpen(!isFormOpen); }}
                    className="bg-violet-500/20 text-violet-400 p-2.5 rounded-xl border border-violet-500/30 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">{isFormOpen ? 'close' : 'add'}</span>
                </button>
            </div>

            {/* Form */}
            {isFormOpen && (
                <div className="bg-[#121214] p-5 rounded-2xl border border-violet-500/20 space-y-4 animate-in slide-in-from-top duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{t.question}</label>
                        <input
                            value={form.question}
                            onChange={e => setForm({ ...form, question: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                            placeholder="e.g. Как оформить ВНЖ?"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{t.answer}</label>
                        <textarea
                            value={form.answer}
                            onChange={e => setForm({ ...form, answer: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 min-h-[120px] resize-y placeholder:text-zinc-600"
                            placeholder={t.answer}
                        />
                    </div>

                    
                    {/* Photo Upload Section */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Фото к ответу</label>
                        <div className="grid grid-cols-4 gap-2">
                            {form.photos.map((p: string) => (
                                <div key={p} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                                    <img src={p} className="w-full h-full object-cover" alt="" />
                                    <button 
                                        onClick={() => removePhoto(p)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                <span className="material-symbols-outlined text-zinc-500 text-[20px]">add_a_photo</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-violet-500 text-black font-bold py-3 rounded-xl transition-all active:scale-95 shadow-[0_5px_15px_rgba(139,92,246,0.2)]"
                        >
                            {t.save}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-6 bg-white/5 text-zinc-400 border border-white/10 py-3 rounded-xl font-bold transition-all active:scale-95"
                        >
                            {t.cancel}
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {faqs.length === 0 && !loading ? (
                <div className="flex flex-col items-center py-24 space-y-4 opacity-20">
                    <span className="material-symbols-outlined text-[64px] font-thin">quiz</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t.empty}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {faqs.map(faq => (
                        <div key={faq.id} className="glass-card bg-[#121214] p-3 rounded-3xl border border-white/5 flex items-center gap-4 group hover:border-violet-500/20 transition-all">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0">
                                {faq.photos?.[0] ? (
                                    <img src={faq.photos[0]} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <span className="material-symbols-outlined text-zinc-700 text-[24px]">quiz</span>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black text-zinc-100 truncate tracking-tight">{faq.question}</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5 line-clamp-1">{faq.answer}</p>
                            </div>
                            
                            <div className="flex flex-col gap-2 flex-shrink-0 pr-1">
                                <button 
                                    onClick={() => handleEdit(faq)} 
                                    className="w-9 h-9 flex items-center justify-center bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-400/60 hover:text-violet-400 transition-all active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button 
                                    onClick={() => handleDelete(faq.id)} 
                                    className="w-9 h-9 flex items-center justify-center bg-red-500/10 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 transition-all active:scale-90"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
