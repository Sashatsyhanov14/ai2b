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
            .order('sort_order', { ascending: true });
        if (data) setFaqs(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white/[0.02] rounded-[24px] border border-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="px-1">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{t.title}</h2>
                <div className="h-1 w-12 bg-primary rounded-full mt-2" />
            </div>

            {faqs.length === 0 ? (
                <div className="flex flex-col items-center py-24 space-y-4 opacity-20">
                    <span className="material-symbols-outlined text-[64px] font-thin">quiz</span>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t.empty}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {faqs.map(faq => {
                        const isOpen = openId === faq.id;
                        const questions = faq.i18n?.questions || { ru: faq.question };
                        const answers = faq.i18n?.answers || { ru: faq.answer };
                        const question = questions[lang] || questions.en || questions.ru || faq.question;
                        const answer = answers[lang] || answers.en || answers.ru || faq.answer;

                        return (
                            <div
                                key={faq.id}
                                className={`group bg-[#121214] rounded-[32px] border transition-all duration-500 overflow-hidden ${
                                    isOpen ? 'border-primary/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)]' : 'border-white/5 hover:border-white/10'
                                }`}
                            >
                                <button
                                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <h3 className={`text-sm font-black tracking-tight leading-snug transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-zinc-100'}`}>
                                        {question}
                                    </h3>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-primary text-black rotate-180' : 'bg-white/5 text-zinc-500'}`}>
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </div>
                                </button>
                                
                                <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-6 pb-6 space-y-4">
                                        <div className="h-[1px] w-full bg-white/5" />
                                        
                                        {/* Photos Grid */}
                                        {faq.photos && faq.photos.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {faq.photos.map((photo: string, idx: number) => (
                                                    <div key={idx} className="flex-shrink-0 w-48 aspect-video rounded-2xl overflow-hidden border border-white/10">
                                                        <img src={photo} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <p className="text-sm text-zinc-400 leading-relaxed font-medium whitespace-pre-wrap">
                                            {answer}
                                        </p>
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
