import '@/styles/globals.css';
import { I18nProvider } from '@/i18n';

import Script from 'next/script';

export const metadata = { title: 'AI2B — Real Estate Mini App' };

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="min-h-screen bg-[#0a0a0c] text-zinc-100">
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </div>
    </I18nProvider>
  );
}
