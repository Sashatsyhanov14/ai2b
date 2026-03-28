"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Users, LifeBuoy } from "lucide-react";
import SupportDialog from "@/components/SupportDialog";
import { useState } from "react";
import { useI18n } from "@/i18n";

function SidebarLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = href ? pathname?.startsWith(href) : false;
  const cls = `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active
    ? "bg-zinc-800 text-white light:bg-zinc-200 light:text-zinc-900"
    : "text-zinc-400 hover:text-white hover:bg-zinc-900 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-100"
    }`;
  return href ? (
    <Link href={href} className={cls}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MobileSidebarLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const pathname = usePathname();
  const active = pathname?.startsWith(href) ?? false;
  const cls = `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95 ${active 
    ? "text-white light:text-zinc-900" 
    : "text-zinc-500 hover:text-white light:text-zinc-400 light:hover:text-zinc-900"
  }`;
  return (
    <Link href={href} className={cls}>
      <Icon className={`w-5 h-5 ${active ? "opacity-100" : "opacity-70"}`} />
      <span className={`text-[10px] uppercase font-semibold text-center leading-none ${active ? "opacity-100" : "opacity-70"}`}>
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const { t } = useI18n();
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 light:border-zinc-200 light:bg-white min-h-screen">
        <div className="p-4 text-zinc-300 light:text-zinc-700 font-semibold tracking-wide">
          Estate AI
        </div>
        <div className="flex-1 flex flex-col justify-between border-t border-zinc-800 light:border-zinc-200">
          <nav className="px-2 pt-2 pb-4 space-y-1">
            <SidebarLink href="/app/properties" label={t("nav.properties") || "Объекты"} icon={Home} />
            <SidebarLink href="/app/leads" label={t("nav.leads")} icon={Users} />
            <SidebarLink href="/app/bot" label={t("nav.bots")} icon={Bot} />
          </nav>

          <div className="px-2 pt-2 pb-4 space-y-1 border-t border-zinc-800 light:border-zinc-200">
            <SidebarLink
              label={t("nav.support")}
              icon={LifeBuoy}
              onClick={() => setSupportOpen(true)}
            />

            <div className="text-xs text-zinc-500 light:text-zinc-400 px-3 py-2 select-none">
              v0.4 beta
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 light:bg-white/90 light:border-zinc-200 pb-safe">
        <MobileSidebarLink href="/app/properties" label={t("nav.properties") || "Объекты"} icon={Home} />
        <MobileSidebarLink href="/app/leads" label={t("nav.leads")} icon={Users} />
        <MobileSidebarLink href="/app/bot" label={t("nav.bots")} icon={Bot} />
        <button onClick={() => setSupportOpen(true)} className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95 text-zinc-500 hover:text-white light:text-zinc-400 light:hover:text-zinc-900">
          <LifeBuoy className="w-5 h-5 opacity-70" />
          <span className="text-[10px] uppercase font-semibold text-center leading-none opacity-70">
            {t("nav.support") || "Поддержка"}
          </span>
        </button>
      </nav>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
