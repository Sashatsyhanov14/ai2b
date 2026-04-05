'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/i18n';

export default function FaqView() {
    const { t } = useI18n();
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingFaq, setEditingFaq] = useState<any>(null);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '', i18n: {} });

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

    const handleSave = async () => {
        if (!newFaq.question || !newFaq.answer) return;

        const payload = {
            question: newFaq.question,
            answer: newFaq.answer,
            i18n: { 
                ru: { question: newFaq.question, answer: newFaq.answer },
                // ... potentially other languages
            }
        };

        if (editingFaq) {
            await supabase.from('faq').update(payload).eq('id', editingFaq.id);
        } else {
            await supabase.from('faq').insert(payload);
        }

        setEditingFaq(null);
        setNewFaq({ question: '', answer: '', i18n: {} });
        fetchFaqs();
    };

    const deleteFaq = async (id: number) => {
        if (!window.confirm('Delete this FAQ record?')) return;
        await supabase.from('faq').delete().eq('id', id);
        fetchFaqs();
    };

    return (
        <div className="p-4 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">help</span>
                    FAQ Manager
                </h1>
                <button 
                    onClick={() => { setEditingFaq(null); setNewFaq({ question: '', answer: '', i18n: {} }); }}
                    className="bg-primary/20 text-primary p-2 rounded-xl border border-primary/30"
                >
                    <span className="material-symbols-outlined">add</span>
                </button>
            </header>

            {/* Form */}
            {(editingFaq || !loading) && (
                <div className="glass-card p-4 rounded-2xl bg-[#121214] border border-white/10 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Question</label>
                        <input 
                            value={newFaq.question}
                            onChange={e => setNewFaq({...newFaq, question: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50"
                            placeholder="e.g. How to pay?"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Answer (RU)</label>
                        <textarea 
                            value={newFaq.answer}
                            onChange={e => setNewFaq({...newFaq, answer: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 min-h-[100px]"
                            placeholder="Ответ на русском..."
                        />
                    </div>
                    <button 
                        onClick={handleSave}
                        className="w-full bg-primary text-black font-bold py-3 rounded-xl transition-all active:scale-95 shadow-[0_5px_15px_rgba(208,188,255,0.2)]"
                    >
                        {editingFaq ? 'UPDATE RECORD' : 'CREATE RECORD'}
                    </button>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {faqs.map(f => (
                    <div key={f.id} className="bg-[#121214]/60 p-4 rounded-2xl border border-white/5 flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-1">
                            <h3 className="text-sm font-bold text-white uppercase tracking-tight">{f.question}</h3>
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{f.answer}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { setEditingFaq(f); setNewFaq(f); }} className="p-2 bg-white/5 rounded-lg border border-white/10 text-zinc-400 hover:text-white">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onClick={() => deleteFaq(f.id)} className="p-2 bg-error/10 rounded-lg border border-error/20 text-error/80 hover:text-error">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
