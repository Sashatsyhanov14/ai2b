"use client";
import { Menu } from "@headlessui/react";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n";

const locales = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
] as const;

export default function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const current = locales.find(l => l.code === locale) || locales[0];

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="btn btn-ghost btn--sm px-2 flex items-center gap-1"
        aria-label="Language"
        title={current.label}
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-semibold">{current.code.toUpperCase()}</span>
      </Menu.Button>
      <Menu.Items>
        <div className="absolute right-0 mt-2 z-50 w-40 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur shadow-xl ring-1 ring-black/5 p-1 light:border-zinc-200 light:bg-white">
          {locales.map((l) => (
            <Menu.Item key={l.code}>
              {({ active }) => (
                <button
                  onClick={() => setLocale(l.code as any)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg ${active ? 'bg-zinc-800/70 light:bg-zinc-100' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{l.label}</span>
                    <span className="text-xs opacity-70">{l.code.toUpperCase()}</span>
                  </div>
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  );
}
