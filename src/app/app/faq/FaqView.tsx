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
    const [langTab, setLangTab] = useState('ru');
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingFaq, setEditingFaq] = useState<any>(null);
    const [form, setForm] = useState<any>({
        question: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
        answer: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' }
    });
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => { fetchFaqs(); }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        const { data } = await supabase.from('faq').select('*').order('sort_order', { ascending: true });
        if (data) setFaqs(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.question.ru || !form.answer.ru) return;
        const payload = {
            question: form.question.ru,
            answer: form.answer.ru,
            i18n: {
                ...form.question, // This will have ru, en, etc keys
                questions: form.question,
                answers: form.answer
            }
        };

        if (editingFaq) {
            await supabase.from('faq').update(payload).eq('id', editingFaq.id);
        } else {
            await supabase.from('faq').insert(payload);
        }

        resetForm();
        fetchFaqs();
    };

    const handleEdit = (faq: any) => {
        setEditingFaq(faq);
        const questions = faq.i18n?.questions || { ru: faq.question };
        const answers = faq.i18n?.answers || { ru: faq.answer };
        
        setForm({
            question: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '', ...questions },
            answer: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '', ...answers }
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
            question: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' },
            answer: { ru: '', en: '', tr: '', de: '', es: '', ar: '', fr: '' }
        });
        setIsFormOpen(false);
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
                    {/* Lang Tabs for Form */}
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide border-b border-white/5">
                        {['ru', 'en', 'tr', 'de', 'es', 'ar', 'fr'].map(l => (
                            <button
                                key={l}
                                onClick={() => setLangTab(l)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${langTab === l ? 'bg-violet-500 text-white' : 'bg-white/5 text-zinc-500'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{t.question} ({langTab.toUpperCase()})</label>
                        <input
                            value={form.question[langTab] || ''}
                            onChange={e => setForm({ ...form, question: { ...form.question, [langTab]: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                            placeholder="e.g. Как оформить ВНЖ?"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">{t.answer} ({langTab.toUpperCase()})</label>
                        <textarea
                            value={form.answer[langTab] || ''}
                            onChange={e => setForm({ ...form, answer: { ...form.answer, [langTab]: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 min-h-[120px] resize-y placeholder:text-zinc-600"
                            placeholder={t.answer}
                        />
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
                <div className="flex flex-col items-center py-16 space-y-4">
                    <span className="material-symbols-outlined text-zinc-700 text-[48px]">quiz</span>
                    <p className="text-sm text-zinc-600 font-medium">{t.empty}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {faqs.map(faq => (
                        <div key={faq.id} className="bg-[#121214]/60 p-4 rounded-2xl border border-white/5 flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-1 min-w-0">
                                <h3 className="text-sm font-bold text-white leading-snug">{faq.question}</h3>
                                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{faq.answer}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <button onClick={() => handleEdit(faq)} className="p-2 bg-white/5 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button onClick={() => handleDelete(faq.id)} className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
