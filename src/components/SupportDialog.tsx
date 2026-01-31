"use client";

import { Dialog } from "@headlessui/react";
import { useI18n } from "@/i18n";

export default function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xl"
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900/80 p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-semibold mb-2">{t('support.title')}</Dialog.Title>
          <p className="text-muted-foreground">{t('support.description')}</p>
          <p className="mt-2">
            Email: <a className="text-[var(--brand)] hover:underline" href="mailto:support@example.com">support@example.com</a>
          </p>
          <p>
            Telegram: {" "}
            <a className="text-[var(--brand)] hover:underline" href="https://t.me/estateai_support" target="_blank" rel="noreferrer">
              @estateai_support
            </a>
          </p>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-primary btn--sm" onClick={onClose}>{t('support.ok')}</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
