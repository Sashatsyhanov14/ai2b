# AI2Business - Платформа недвижимости с AI-консультантом

Next.js приложение с Mini App каталогом недвижимости, мультиязычным AI-консультантом и системой лидов.

## 🏡 Описание проекта

Полнофункциональная платформа для продажи и аренды недвижимости с интеграцией в Telegram и AI-помощником.

### Ключевые особенности:
- 🏘️ **Каталог недвижимости** - продажа и аренда
- 🤖 **AI-консультант** - мультиязычный помощник
- 📱 **Telegram Mini App** - просмотр объектов в боте
- 🗺️ **Фильтры** - город, цена, количество комнат
- 📊 **CRM система** - управление лидами
- 🌍 **Мультиязычность** - интерфейс на разных языках
- 🗄️ **Supabase на VPS** - собственная база

## Технологический стек

### Frontend
- **Next.js 14** - React framework
- **TypeScript**
- **Tailwind CSS**
- **Zustand** - state management
- **Telegram WebApp API**

### Backend & Database
- **Supabase** (PostgreSQL) на VPS
- **OpenAI API** - AI-консультант
- **Row Level Security** - безопасность данных

## Структура базы данных

```sql
tenants (
  id, owner - мультитенантность
)

sale_properties (
  slug, title (jsonb - мультиязычность),
  city, price_eur, bedrooms, bathrooms,
  address, description, nearby, photos,
  is_active
)

rental_properties (
  аналогично sale_properties
)

leads (
  name, whatsapp, context_type,
  city, budget_eur, source
)

chat_history (
  user, messages - история AI-чата
)
```

## Установка

```bash
git clone https://github.com/Sashatsyhanov14/ai2b.git
cd ai2b
npm install
```

### Конфигурация

**.env.local:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Telegram
NEXT_PUBLIC_BOT_USERNAME=your_bot_username
```

### База данных

```bash
# Выполните в Supabase
psql -f supabase/schema.sql
```

### Запуск

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Функционал

### Для клиентов:
- 🏠 Просмотр объектов (продажа/аренда)
- 🔍 Фильтрация по параметрам
- 💬 AI-консультант (ответы на вопросы)
- 📱 Заявка на объект
- 📸 Фотогалереи объектов

### Для агентов/админов:
- ➕ Добавление объектов
- ✏️ Редактирование карточек
- 📊 Просмотр лидов
- 💬 История обращений клиентов
- 📈 Аналитика спроса

## Мультиязычность

### Поддерживаемые языки:
- Интерфейс и контент на нескольких языках
- AI-консультант автоматически определяет язык
- Поле `title` в БД хранится как JSON для разных языков

Пример:
```json
{
  "en": "Luxury Villa in Antalya",
  "ru": "Роскошная вилла в Анталии",
  "tr": "Antalya'da Lüks Villa"
}
```

## AI-консультант

### Возможности:
- Ответы на вопросы о недвижимости
- Рекомендации по объектам
- Информация о районах и ценах
- Помощь с документами
- Процесс покупки/аренды

## Telegram Mini App

### Особенности:
- Открывается прямо в Telegram
- Адаптивный дизайн
- Быстрая загрузка
- Нативные кнопки
- Интеграция с ботом

## CRM и лиды

### Сбор информации:
- Имя клиента
- WhatsApp для связи
- Интересующий город
- Бюджет в евро
- Контекст (покупка/аренда)
- Источник (откуда пришел)

### Обработка:
Все лиды сохраняются в БД и доступны для просмотра агентами.

## Deployment

### Vercel (рекомендуется):
```bash
npm run deploy
```

### VPS:
```bash
npm run build
pm2 start npm --name "ai2b" -- start
```

## Структура проекта

```
ai2b/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React компоненты
│   ├── lib/              # Утилиты
│   └── store/            # Zustand store
├── supabase/
│   └── schema.sql        # Database schema
├── public/               # Статика
└── scripts/              # Утилиты деплоя
```

## Статус проекта

**Работает:**
- ✅ Каталог объектов (продажа + аренда)
- ✅ Mini App для Telegram
- ✅ AI-консультант (мультиязычный)
- ✅ CRM лидов
- ✅ Supabase на VPS

**В разработке:**
- ⏳ Календарь просмотров
- ⏳ Интеграция оплаты депозитов
- ⏳ Email уведомления

**Статус:** 🚧 Развернут, каталог заполнен, ожидает трафик.

## Особенности реализации

### Row Level Security (RLS):
Все таблицы защищены политиками доступа на уровне БД.

### Мультитенантность:
Система поддерживает несколько агентств через таблицу `tenants`.

### Производительность:
- Static Generation где возможно
- Оптимизация изображений
- Lazy loading компонентов

## Лицензия

Proprietary

## Контакты

- **GitHub**: [@Sashatsyhanov14](https://github.com/Sashatsyhanov14)
- **Email**: alexandertsyhanov@gmail.com
