import { askLLM } from "@/lib/gemini";

export type RoleMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

// ==========================================
// ROUTER AGENT (Главный Оркестратор)
// ==========================================
// Задача: Анализирует интент клиента и маршрутизирует запрос.
// Не общается с клиентом! Выдает только JSON.

// Схема, которую мы заставляем Gemini вернуть:
export const RouterSchema = {
    type: "object",
    properties: {
        is_vip: {
            type: "boolean",
            description: "Если клиент упоминает бюджет > $300k, покупку 'за наличку', Гражданство (Citizenship), срочную покупку, премиум виллу или коммерческую недвижимость — ставь true! Иначе false."
        },
        route: {
            type: "string",
            enum: ["communicate", "search_apartments", "capture_lead", "ignore"],
            description: "Какое действие должен выполнить следующий агент."
        },
        context_for_communication: {
            type: "string",
            description: "О чем спросил клиент (краткий смысл), чтобы Агент Общения знал, на что отвечать. Заполняется если route='communicate'."
        },
        search_params: {
            type: "array",
            description: "Список поисковых запросов для базы данных (заполняется если route='search_apartments'). Сгенерируй от 1 до 3 вариантов поиска: 1 приоритетный (строгий), и 1-2 запасных (с увеличенным на 10-20% бюджетом или без привязки к комнатам), чтобы если первый строгий поиск не даст результатов, бот сразу поискал по запасному варианту.",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    search_keywords: {
                        type: "array",
                        items: { type: "string" },
                        description: "Сгенерируй 3-5 вариаций написания Города и Района (на русском, турецком, латинице и частыми опечатками). Например: ['Мерсин', 'Mersin', 'Мирсин', 'Мезитли', 'Mezitli']"
                    },
                    city: { type: "string", description: "Название города (латиницей)" },
                    price: { type: "number", description: "Максимальный бюджет клиента" },
                    rooms: { type: "string" }
                }
            }
        },
        lead_info: {
            type: "object",
            description: "Данные клиента, если он оставил телефон или просит связаться. Заполняется если route='capture_lead'.",
            properties: {
                phone: { type: "string" },
                name: { type: "string" },
                summary: { type: "string", description: "Что ищет клиент (для передачи живому менеджеру)" }
            }
        }
    },
    required: ["route"]
};

// Системный промпт Оркестратора
const ROUTER_SYSTEM_PROMPT = `
ТЫ — ГЛАВНЫЙ МЕНЕДЖЕР АГЕНТСТВА НЕДВИЖИМОСТИ (ROUTER AGENT).
Твоя задача — ТОЛЬКО маршрутизация. Ты НЕ пишешь тексты для клиента!
Проанализируй последнее сообщение пользователя в контексте диалога и выбери 1 из 4 путей:

1. 'communicate': Клиент задает общие вопросы (кто вы, где офис, ВНЖ, как купить) или просто здоровается.
2. 'search_apartments': Клиент просит найти квартиру/виллу по критериям (город, цена, комнаты). Обязательно извлеки параметры поиска в search_params.
3. 'capture_lead': Клиент оставил контакт (номер телефона) ИЛИ прямо просит связаться с живым человеком.
4. 'ignore': Системное мусорное сообщение, на которое не нужно отвечать.

Выдай ТОЛЬКО JSON строго по Схеме. Никаких лишних слов.
`;

export async function runRouterAgent(messages: RoleMessage[]): Promise<any> {
    const rawResult = await askLLM(messages, ROUTER_SYSTEM_PROMPT, false, RouterSchema);
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Router JSON Parse Error:", e, rawResult);
        return { route: "communicate", context_for_communication: "User message could not be routed. Ask for clarification." };
    }
}


// ==========================================
// COMMUNICATION AGENT (Официальный представитель)
// ==========================================
// Задача: Формировать красивые, живые, экспертные текстовые ответы для клиента.

const COMMUNICATION_SYSTEM_PROMPT = `
ТЫ — ЭКСПЕРТ-КОНСУЛЬТАНТ КОМПАНИИ ПО НЕДВИЖИМОСТИ В ТУРЦИИ.
Твоя задача: красиво, вежливо и экспертно отвечать клиенту в мессенджере.
Пиши коротко, как в живом чате (2-3 небольших абзаца максимум). Не будь роботом.

ПРАВИЛА:
1. Отвечай НА ТОМ ЖЕ ЯЗЫКЕ, на котором пишет клиент (Русский -> Русский, Turkish -> Turkish, English -> English). Это критически важно! Если клиент пишет по-турецки, твой ответ ДОЛЖЕН БЫТЬ ПО-ТУРЕЦКИ.
2. Будь дружелюбным, используй подходящие эмодзи 🏠✨🌴.
3. Если тебе передана информация о найденных квартирах ([DATA]), презентуй ИХ ВСЕ (до 3 штук за раз) красиво: укажи цену, город, комнаты и ОБЯЗАТЕЛЬНО укажи ID квартиры (🔑 ID: ...), чтобы клиент мог на него сослаться. Не скрывай квартиры в уме, перечисли все, что видишь в массиве!
4. Не придумывай (не галлюцинируй) квартиры из головы. Используй ТОЛЬКО то, что передано в блоке [DATA].
5. Никогда не используй заглушки вроде [Тут будет фото] или [Вставьте цену].

ДАННЫЕ ДЛЯ ТВОЕГО ОТВЕТА (предоставлены внутренними системами):
`;

export async function runCommunicationAgent(
    history: RoleMessage[],
    instructionsAndCompanyInfo: string,
    dynamicData: string = "Данных из базы нет. Отвечай на вопрос клиента."
): Promise<string> {

    // Формируем системный промпт из статического + знаний из БД + динамических данных (квартиры)
    const fullSystemPrompt = `
${COMMUNICATION_SYSTEM_PROMPT}

[ЗНАНИЯ О КОМПАНИИ И ИНСТРУКЦИИ]:
${instructionsAndCompanyInfo}

[DATA]:
${dynamicData}
`;

    // Agent outputs plain text, no JSON schema
    const result = await askLLM(history, fullSystemPrompt, true);
    return result;
}
