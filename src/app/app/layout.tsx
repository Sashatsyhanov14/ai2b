import Sidebar from '@/components/Sidebar';
import '@/styles/globals.css';
import Header from '@/components/Header';
import ThemeProvider from '@/components/ThemeProvider';
import { I18nProvider } from '@/i18n';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex light:bg-zinc-50 light:text-zinc-900">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="relative z-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
          </div>
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
