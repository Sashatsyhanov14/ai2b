"use client";
import { useI18n } from '@/i18n';

export default function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      aria-label="Language"
      className="h-9 px-2 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 light:border-zinc-300 light:bg-white light:text-zinc-700"
      value={locale}
      onChange={(e) => setLocale(e.target.value as any)}
    >
      <option value="ru">RU</option>
      <option value="en">EN</option>
      <option value="tr">TR</option>
      <option value="pl">PL</option>
    </select>
  );
}

