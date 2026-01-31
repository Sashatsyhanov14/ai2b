export default function SubscriptionPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Подписка</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Free */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="mb-1 text-lg font-medium">Free</div>
          <div className="mb-4 text-sm text-neutral-400">
            Для тестов и демо.
          </div>
          <ul className="mb-4 space-y-2 text-sm text-neutral-300">
            <li>до 1 бота</li>
            <li>до 100 диалогов/месяц</li>
            <li>без SLA и гарантий</li>
          </ul>
          <button className="w-full rounded-xl bg-neutral-800 py-2 text-sm text-neutral-100 hover:bg-neutral-700">
            Активировать
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="mb-1 text-lg font-semibold">Pro</div>
          <div className="mb-4 text-sm text-neutral-300">
            Полноценная работа с CRM.
          </div>
          <ul className="mb-4 space-y-2 text-sm text-neutral-200">
            <li>до 5 ботов</li>
            <li>до 10 000 диалогов/месяц</li>
            <li>поддержка по почте и Telegram</li>
          </ul>
          <button className="w-full rounded-xl bg-emerald-600 py-2 text-sm text-white hover:bg-emerald-700">
            Оформить подписку
          </button>
        </div>

        {/* Business */}
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="mb-1 text-lg font-semibold">Business</div>
          <div className="mb-4 text-sm text-neutral-300">
            Индивидуальные условия.
          </div>
          <ul className="mb-4 space-y-2 text-sm text-neutral-200">
            <li>неограниченное число ботов</li>
            <li>выделенная поддержка</li>
            <li>SSO, интеграции и консалтинг</li>
          </ul>
          <button className="w-full rounded-xl bg-neutral-800 py-2 text-sm text-neutral-100 hover:bg-neutral-700">
            Связаться с менеджером
          </button>
        </div>
      </div>
    </div>
  );
}

