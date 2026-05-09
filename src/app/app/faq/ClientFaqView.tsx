'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const i18n: Record<string, Record<string, string>> = {
    ru: { title: 'Часто задаваемые вопросы', empty: 'Вопросов пока нет', loading: 'Загрузка...', readMore: 'Читать далее' },
    en: { title: 'Frequently Asked Questions', empty: 'No questions yet', loading: 'Loading...', readMore: 'Read more' },
    tr: { title: 'Sık Sorulan Sorular', empty: 'Henüz soru yok', loading: 'Yükleniyor...', readMore: 'Devamını oku' },
    de: { title: 'Häufig gestellte Fragen', empty: 'Noch keine Fragen', loading: 'Lade...', readMore: 'Mehr lesen' },
    es: { title: 'Preguntas Frecuentes', empty: 'Aún no hay preguntas', loading: 'Cargando...', readMore: 'Leer más' },
    ar: { title: 'الأسئلة الشائعة', empty: 'لا توجد أسئلة بعد', loading: 'جاري التحميل...', readMore: 'اقرأ المزيد' },
    fr: { title: 'Foire Aux Questions', empty: 'Pas encore de questions', loading: 'Chargement...', readMore: 'Lire la suite' },
};

export default function ClientFaqView({ lang = 'ru' }: { lang?: string }) {
    const t = i18n[lang] || i18n['ru'];
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('faq')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (data) setFaqs(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white/[0.03] rounded-2xl border border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 px-1">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <span className="material-symbols-outlined text-emerald-400 text-[20px]">help</span>
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">{t.title}</h2>
            </div>

            {faqs.length === 0 ? (
                <div className="flex flex-col items-center py-16 space-y-4">
                    <span className="material-symbols-outlined text-zinc-700 text-[48px]">quiz</span>
                    <p className="text-sm text-zinc-600 font-medium">{t.empty}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {faqs.map(faq => {
                        const isOpen = openId === faq.id;
                        const question = faq.i18n?.[lang]?.question || faq.question;
                        const answer = faq.i18n?.[lang]?.answer || faq.answer;

                        return (
                            <div
                                key={faq.id}
                                className={`bg-[#121214] rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    isOpen ? 'border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'border-white/5'
                                }`}
                            >
                                <button
                                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                                    className="w-full flex items-center justify-between p-4 text-left"
                                >
                                    <h3 className="text-sm font-bold text-white pr-4 leading-snug">{question}</h3>
                                    <span className={`material-symbols-outlined text-zinc-500 text-[20px] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                <div className={`transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-4 pb-4 pt-0">
                                        <div className="border-t border-white/5 pt-3">
                                            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{answer}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
