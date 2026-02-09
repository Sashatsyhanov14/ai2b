"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, DollarSign, Home, Settings, Users, LifeBuoy, Building2 } from "lucide-react";
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

export default function Sidebar() {
  const { t } = useI18n();
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 light:border-zinc-200 light:bg-white flex flex-col min-h-screen">
      <div className="p-4 text-zinc-300 light:text-zinc-700 font-semibold tracking-wide">
        Estate AI
      </div>
      <div className="flex-1 flex flex-col justify-between border-t border-zinc-800 light:border-zinc-200">
        <nav className="px-2 pt-2 pb-4 space-y-1">
          <SidebarLink href="/app/sales" label={t("nav.sales")} icon={DollarSign} />
          {/* Developer Projects link removed */}
          <SidebarLink href="/app/leads" label={t("nav.leads")} icon={Users} />
          <SidebarLink href="/app/company" label="О компании" icon={Home} />
          <SidebarLink href="/app/bots" label={t("nav.bots")} icon={Bot} />
        </nav>

        <div className="px-2 pt-2 pb-4 space-y-1 border-t border-zinc-800 light:border-zinc-200">
          <SidebarLink href="/app/settings" label={t("nav.settings")} icon={Settings} />
          <SidebarLink
            label={t("nav.support")}
            icon={LifeBuoy}
            onClick={() => setSupportOpen(true)}
          />
          <div className="text-xs text-zinc-500 light:text-zinc-400 px-3 py-2 select-none">
            v0.3 beta
          </div>
        </div>
      </div>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </aside>
  );
}

