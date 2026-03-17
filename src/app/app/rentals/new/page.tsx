"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, DollarSign } from "lucide-react";
import UploadImage from "@/components/UploadImage";
import { Button } from "@/components/ui/Button";

const RENTAL_TAGS = [
    "near_sea",
    "sea_view",
    "pool",
    "parking",
    "security",
    "fitness",
    "sauna",
    "furnished",
    "wi_fi",
    "air_conditioning",
    "pet_friendly"
];

export default function NewRentalPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        title: "",
        city: "Antalya",
        address: "",
        description: "",
        price_per_day: "",
        price_per_month: "",
        bedrooms: "1",
        bathrooms: "1",
        max_guests: "2",
        ai_instructions: "",
    });

    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function update(key: string, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function toggleTag(tag: string) {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    }

    async function handleRemovePhoto(url: string) {
        try {
            setPhotos((prev) => prev.filter((p) => p !== url));
            await fetch("/api/storage/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
        } catch (e) {
            console.error("Failed to delete photo from storage", e);
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const payload = {
                title: form.title.trim() || null,
                city: form.city.trim() || null,
                address: form.address.trim() || null,
                description: form.description.trim() || null,
                price_per_day: form.price_per_day ? Number(form.price_per_day) : null,
                price_per_month: form.price_per_month ? Number(form.price_per_month) : null,
                bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
                bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
                max_guests: form.max_guests ? Number(form.max_guests) : null,
                features: selectedTags,
                ai_instructions: form.ai_instructions.trim() || null,
                photos: photos.length ? photos : undefined,
            };

            const res = await fetch("/api/rentals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error);

            router.push("/app/rentals");
        } catch (err: any) {
            setError(err.message ?? "Ошибка при сохранении");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-3xl pb-24 md:pb-10">
            <div className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 py-4 md:px-6 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-neutral-400" />
                    </button>
                    <h1 className="text-lg md:text-xl font-semibold text-white">Новый объект аренды</h1>
                </div>
            </div>

            <div className="px-4 md:px-6 space-y-8">
                <form onSubmit={submit} className="space-y-8">

                    {/* 1. PHOTOS */}
                    <section>
                        <div className="bg-neutral-900/40 rounded-2xl border border-neutral-800 p-4 transition-all hover:border-neutral-700 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                    Фотографии
                                </h2>
                                <span className="text-[10px] text-neutral-500">{photos.length} фото</span>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                {photos.map((url, i) => (
                                    <div key={i} className="relative aspect-square group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                                        <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(url)}
                                            className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 backdrop-blur-sm"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                ))}
                                <div className="aspect-square">
                                    <UploadImage
                                        ownerUid="public"
                                        entity="rentals"
                                        entityId="new"
                                        onUploaded={(url) => setPhotos((p) => [...p, url])}
                                        multiple
                                        label="+"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. MAIN INFO */}
                    <section>
                        <h2 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">
                            Основная информация
                        </h2>
                        <div className="rounded-2xl border border-neutral-700 overflow-hidden bg-neutral-900/30 shadow-sm">

                            <div className="border-b border-neutral-800 bg-neutral-900/60 p-4 relative group focus-within:bg-neutral-900 transition-colors">
                                <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Название / Заголовок</label>
                                <input
                                    className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                    placeholder="Например: Уютная студия у моря"
                                    value={form.title}
                                    onChange={(e) => update("title", e.target.value)}
                                />
                            </div>

                            {/* Row: Prices */}
                            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-neutral-800 bg-neutral-900/60 p-4">
                                <div className="flex items-center flex-1 border-b md:border-b-0 md:border-r border-neutral-800 pb-2 md:pb-0 md:pr-4 group focus-within:bg-neutral-900 transition-colors">
                                    <div className="w-full">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Цена в сутки (€)</label>
                                        <div className="flex items-center">
                                            <DollarSign className="h-5 w-5 mr-2 shrink-0 text-emerald-500" />
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-2xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none tabular-nums"
                                                placeholder="0"
                                                value={form.price_per_day}
                                                onChange={(e) => update("price_per_day", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center flex-1 pt-2 md:pt-0 md:pl-4 group focus-within:bg-neutral-900 transition-colors">
                                    <div className="w-full">
                                        <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Цена в месяц (€)</label>
                                        <div className="flex items-center">
                                            <DollarSign className="h-5 w-5 mr-2 shrink-0 text-emerald-500" />
                                            <input
                                                type="number"
                                                className="w-full bg-transparent text-2xl font-bold text-emerald-400 placeholder:text-neutral-700 outline-none tabular-nums"
                                                placeholder="0"
                                                value={form.price_per_month}
                                                onChange={(e) => update("price_per_month", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Location */}
                            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-neutral-800">
                                <div className="md:col-span-4 p-3 border-b md:border-b-0 md:border-r border-neutral-800 relative group focus-within:bg-neutral-900/50 transition-colors">
                                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Город</label>
                                    <input
                                        className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                        placeholder="Antalya"
                                        value={form.city}
                                        onChange={(e) => update("city", e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-8 p-3 relative group focus-within:bg-neutral-900/50 transition-colors">
                                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Адрес / Район</label>
                                    <input
                                        className="w-full bg-transparent text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                        placeholder="Liman Mah., 25. Sk"
                                        value={form.address}
                                        onChange={(e) => update("address", e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Specs */}
                            <div className="grid grid-cols-3 divide-x divide-neutral-800">
                                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Спален (Bedrooms)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                        placeholder="1"
                                        value={form.bedrooms}
                                        onChange={(e) => update("bedrooms", e.target.value)}
                                    />
                                </div>
                                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Ванных (Bathrooms)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                        placeholder="1"
                                        value={form.bathrooms}
                                        onChange={(e) => update("bathrooms", e.target.value)}
                                    />
                                </div>
                                <div className="p-3 text-center group focus-within:bg-neutral-900/50 transition-colors">
                                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-semibold">Макс. гостей</label>
                                    <input
                                        type="number"
                                        className="w-full bg-transparent text-center text-neutral-200 placeholder:text-neutral-700 outline-none text-sm font-medium"
                                        placeholder="2"
                                        value={form.max_guests}
                                        onChange={(e) => update("max_guests", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TAGS */}
                    <section>
                        <h2 className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider ml-1">
                            Удобства / Теги
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {RENTAL_TAGS.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all transform active:scale-95 border ${isSelected
                                            ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-500"
                                            : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                                            }`}
                                    >
                                        {isSelected ? "✓ " : ""}{tag.replace(/_/g, ' ')}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* 3. OPTIONAL DESCRIPTION */}
                    <section className="space-y-4">
                        <details className="group" open>
                            <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1 hover:text-neutral-300 transition-colors">
                                <span className="group-open:rotate-90 transition-transform text-neutral-600">▸</span>
                                Подробное описание
                            </summary>
                            <div className="mt-3">
                                <textarea
                                    className="w-full h-32 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-neutral-200 outline-none focus:border-neutral-700 transition-all text-sm resize-none placeholder:text-neutral-700"
                                    placeholder="Опишите правила дома, удобства и т.д."
                                    value={form.description}
                                    onChange={(e) => update("description", e.target.value)}
                                />
                            </div>
                        </details>

                        <details className="group">
                            <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-semibold text-rose-500/80 uppercase tracking-wider ml-1 hover:text-rose-400 transition-colors">
                                <span className="group-open:rotate-90 transition-transform text-rose-600">▸</span>
                                Секретная информация (для менеджеров / ИИ)
                            </summary>
                            <div className="mt-3">
                                <textarea
                                    className="w-full h-24 rounded-xl border border-rose-900/20 bg-rose-900/5 p-4 text-neutral-200 outline-none focus:border-rose-800/40 transition-all text-sm resize-none placeholder:text-neutral-700"
                                    placeholder="Инструкции для ИИ (например: 'Аренда минимум на неделю', 'Скидка при оплате за год')"
                                    value={form.ai_instructions}
                                    onChange={(e) => update("ai_instructions", e.target.value)}
                                />
                                <p className="mt-2 text-[10px] text-neutral-500 ml-1 italic">
                                    Эта информация не показывается напрямую в карточке, но будет использована ИИ для ответов на вопросы клиентов.
                                </p>
                            </div>
                        </details>
                    </section>

                    <div className="h-24 md:hidden"></div>

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-800 md:static md:bg-transparent md:border-0 md:p-0 z-40">
                        {error && (
                            <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/50 text-red-200 text-xs text-center">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            disabled={loading || !form.city || !form.address}
                            className={`w-full py-4 text-base font-semibold shadow-xl transition-all ${loading || !form.city || !form.address
                                ? "opacity-50 grayscale"
                                : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30"
                                }`}
                        >
                            {loading ? "Сохранение..." : "Сохранить объект аренды"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
