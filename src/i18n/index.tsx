"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { tr } from './locales/tr';

type Messages = Record<string, any>;
type Locale = 'ru' | 'en' | 'tr';

const dictionaries: Record<Locale, Partial<Messages>> = {
  ru,
  en,
  tr,
};

type I18nContextValue = {
  locale: Locale;
  t: (path: string) => string;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function get(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'ru';
    return (localStorage.getItem('locale') as Locale) || 'ru';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
    if (typeof window !== 'undefined') localStorage.setItem('locale', locale);
  }, [locale]);

  const t = useMemo(() => {
    const current = dictionaries[locale] || {};
    const fallback = ru;
    return (path: string) => {
      const val = get(current, path) ?? get(fallback, path);
      return typeof val === 'string' ? val : path;
    };
  }, [locale]);

  const value: I18nContextValue = { locale, t, setLocale };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
