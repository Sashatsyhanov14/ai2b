"use client";
import { useI18n } from "@/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-6">
      <h1 className="text-xl font-semibold">{t("settings.title")}</h1>

      <section className="panel p-5">
        <h2 className="mb-3 font-medium">{t("settings.profile")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">{t("settings.name")}</label>
            <input
              className="form-control"
              placeholder={t("settings.name")}
            />
          </div>
          <div>
            <label className="form-label">{t("settings.email")}</label>
            <input className="form-control" placeholder="Email" />
          </div>
        </div>
        <div className="mt-3">
          <button className="btn btn-primary btn--sm">
            {t("settings.saveProfile")}
          </button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 font-medium">{t("settings.branding")}</h2>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg border panel-border bg-neutral-900/60" />
          <button className="btn btn-ghost btn--sm">
            {t("settings.uploadLogo")}
          </button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-3 font-medium">{t("settings.theme")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.dark")} (по умолчанию).
        </p>
      </section>
    </div>
  );
}

