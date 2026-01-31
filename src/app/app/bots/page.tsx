"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
};

type TelegramManager = {
  id: string;
  telegram_id: number;
  name: string | null;
  is_active: boolean;
  created_at: string;
};

export default function BotsPage() {
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [managers, setManagers] = useState<TelegramManager[]>([]);
  const [managerName, setManagerName] = useState("");
  const [managerTelegramId, setManagerTelegramId] = useState("");
  const [managersLoading, setManagersLoading] = useState(true);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [managerSaving, setManagerSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingLeads(true);
      setManagersLoading(true);
      try {
        const [statsRes, leadsRes, managersRes] = await Promise.all([
          fetch("/api/bot/stats"),
          fetch("/api/leads?limit=50"),
          fetch("/api/telegram-managers"),
        ]);
        const statsJson = await statsRes.json().catch(() => ({}));
        const leadsJson = await leadsRes.json().catch(() => ({}));
        const managersJson = await managersRes.json().catch(() => ({}));

        if (statsJson?.ok) {
          setSessionsCount(statsJson.sessionsCount ?? 0);
        }
        if (leadsJson?.ok && Array.isArray(leadsJson.data)) {
          setLeads(leadsJson.data);
        }
        if (managersJson?.ok && Array.isArray(managersJson.data)) {
          setManagers(managersJson.data);
        }
      } finally {
        setLoadingLeads(false);
        setManagersLoading(false);
      }
    }
    load();
  }, []);

  async function handleAddManager(e: FormEvent) {
    e.preventDefault();
    const trimmedId = managerTelegramId.trim();
    if (!trimmedId) return;

    setManagerError(null);
    setManagerSaving(true);

    const payload = {
      telegram_id: trimmedId,
      name: managerName.trim() || null,
    };

    try {
      const res = await fetch("/api/telegram-managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok && json.data) {
        setManagers((prev) => [json.data as TelegramManager, ...prev]);
        setManagerName("");
        setManagerTelegramId("");
      } else {
        const message =
          (json && json.error) ||
          (res.status === 404
            ? "API /api/telegram-managers не найдено после деплоя."
            : "Не удалось добавить менеджера.");
        setManagerError(message);
      }
    } catch (err) {
      setManagerError(
        (err as any)?.message ||
          "Не удалось добавить менеджера (ошибка сети).",
      );
    } finally {
      setManagerSaving(false);
    }
  }

  async function handleDeleteManager(id: string) {
    try {
      const res = await fetch(`/api/telegram-managers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setManagers((prev) => prev.filter((m) => m.id !== id));
      } else {
        const json = await res.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.error("Failed to delete manager:", json?.error || res.status);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete manager:", (err as any)?.message || err);
    }
  }

  async function handleToggleActive(manager: TelegramManager) {
    try {
      const res = await fetch(`/api/telegram-managers/${manager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !manager.is_active }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok && json.data) {
        const updated = json.data as TelegramManager;
        setManagers((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to toggle manager:", json?.error || res.status);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to toggle manager:", (err as any)?.message || err);
    }
  }

  async function handleRenameManager(manager: TelegramManager) {
    if (typeof window === "undefined") return;
    const nextName = window.prompt(
      "Имя менеджера",
      manager.name ?? "",
    );
    if (nextName === null) return;
    const trimmed = nextName.trim();

    try {
      const res = await fetch(`/api/telegram-managers/${manager.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok && json.data) {
        const updated = json.data as TelegramManager;
        setManagers((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to rename manager:", json?.error || res.status);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to rename manager:", (err as any)?.message || err);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-50">Бот и лиды</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Статистика работы Telegram‑бота, список лидов и Telegram‑менеджеров.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs uppercase text-neutral-500">
            Диалогов в Telegram
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-50">
            {sessionsCount ?? (loadingLeads ? "…" : 0)}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Количество уникальных чатов, с которыми общался бот.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs uppercase text-neutral-500">
            Лидов за всё время
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-50">
            {leads.length}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Отображаются последние 50 лидов из Supabase.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-xs uppercase text-neutral-500">
            Настройка Telegram‑бота
          </div>
          <div className="mt-2 text-sm text-neutral-50">
            Убедитесь, что TELEGRAM_BOT_TOKEN и OPENROUTER_API_KEY заданы в
            переменных окружения.
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Все заявки и диалоги сохраняются в Supabase, бот работает через
            вебхук.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-200">Последние лиды</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm text-neutral-200">
              <thead className="bg-neutral-900/70 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">Имя</th>
                  <th className="px-3 py-2 text-left">Телефон</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Источник</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Создан</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeads && (
                  <tr>
                    <td
                      className="px-3 py-4 text-neutral-400"
                      colSpan={6}
                    >
                      Загрузка лидов...
                    </td>
                  </tr>
                )}
                {!loadingLeads && leads.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-4 text-neutral-400"
                      colSpan={6}
                    >
                      Пока нет лидов.
                    </td>
                  </tr>
                )}
                {!loadingLeads &&
                  leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-neutral-800"
                    >
                      <td className="px-3 py-2">{l.name ?? "—"}</td>
                      <td className="px-3 py-2">{l.phone ?? "—"}</td>
                      <td className="px-3 py-2">{l.email ?? "—"}</td>
                      <td className="px-3 py-2">{l.source ?? "telegram"}</td>
                      <td className="px-3 py-2">{l.status ?? "new"}</td>
                      <td className="px-3 py-2">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-200">
          Telegram‑менеджеры
        </h2>
        <form
          onSubmit={handleAddManager}
          className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-neutral-400">
              Имя менеджера (опционально)
            </label>
            <input
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Например: Анна"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-neutral-400">
              Telegram ID менеджера
            </label>
            <input
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
              value={managerTelegramId}
              onChange={(e) => setManagerTelegramId(e.target.value)}
              placeholder="Например: 123456789"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-60"
            disabled={!managerTelegramId.trim() || managerSaving}
          >
            Добавить
          </button>
        </form>
        {managerError && (
          <p className="text-xs text-red-400">{managerError}</p>
        )}

        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
          <div className="max-h-[40vh] overflow-y-auto">
            <table className="min-w-full text-sm text-neutral-200">
              <thead className="bg-neutral-900/70 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">Имя</th>
                  <th className="px-3 py-2 text-left">Telegram ID</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Создан</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {managersLoading && (
                  <tr>
                    <td
                      className="px-3 py-4 text-neutral-400"
                      colSpan={5}
                    >
                      Загрузка списка менеджеров...
                    </td>
                  </tr>
                )}
                {!managersLoading && managers.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-4 text-neutral-400"
                      colSpan={5}
                    >
                      Пока нет ни одного Telegram‑менеджера.
                    </td>
                  </tr>
                )}
                {!managersLoading &&
                  managers.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t border-neutral-800"
                    >
                      <td className="px-3 py-2">
                        {m.name && m.name.trim() ? m.name : "Без имени"}
                      </td>
                      <td className="px-3 py-2">{m.telegram_id}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(m)}
                            className={`inline-flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors ${
                              m.is_active
                                ? "border-emerald-500 bg-emerald-500/20"
                                : "border-neutral-600 bg-neutral-800"
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-neutral-100 shadow transition-transform ${
                                m.is_active ? "translate-x-3.5" : ""
                              }`}
                            />
                          </button>
                          <span className="text-xs text-neutral-400">
                            {m.is_active ? "активен" : "отключен"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRenameManager(m)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:border-emerald-500 hover:text-emerald-400"
                            title="Редактировать"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteManager(m.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:border-red-500 hover:text-red-400"
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

