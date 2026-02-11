"use client";

import { Menu } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useI18n } from "@/i18n";

function cx(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function getInitials(name: string, fallback: string = "G") {
  if (!name) return fallback.toLocaleUpperCase(undefined);
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || fallback).toLocaleUpperCase(undefined);
  const second = (parts[1]?.[0] || "").toLocaleUpperCase(undefined);
  return `${first}${second}`;
}

export default function HeaderRight() {
  const { t } = useI18n();
  const router = useRouter();

  const goSubscription = () => router.push("/app/subscription");

  return (
    <div className="flex items-center gap-2">
      <Menu as="div" className="relative">
        <Menu.Button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 light:border-zinc-300 light:bg-white light:text-zinc-700 light:hover:bg-zinc-100"
          aria-label={t('header.account')}
          title={t('header.account')}
        >
          <span className="text-[11px] font-semibold select-none">
            {typeof window !== 'undefined' ? getInitials(localStorage.getItem('dev_name') || t('common.guest'), t('common.guest')[0]) : t('common.guest')[0].toLocaleUpperCase(undefined)}
          </span>
        </Menu.Button>

        <Menu.Items>
          <div className="absolute right-0 mt-2 z-50 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur shadow-xl ring-1 ring-black/5 p-1 light:border-zinc-200 light:bg-white">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={goSubscription}
                  className={cx(
                    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-200 light:text-zinc-700",
                    active && "bg-zinc-800/70 light:bg-zinc-100"
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                  {t('header.subscription')}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </div>
  );
}
