import { askLLM } from "@/lib/gemini";

export type RoleMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

// ==========================================
// ROUTER AGENT (ГЛАВНЫЙ ОРКЕСТРАТОР)
// ==========================================
// Задача: Анализирует интент клиента и раздает команды остальным агентам.
// Может вызвать сразу нескольких агентов одновременно!

export const RouterSchema = {
    type: "object",
    properties: {
        instructions_for_communication_agent: {
            type: "string",
            description: "Прямое указание для Агента-Оратора. Пиши на языке клиента (ru, tr, en). Укажи, что именно он должен ответить."
        },
        detected_language: {
            type: "string",
            description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr'. Определи по контексту."
        },
        instructions_for_search_agent: {
            type: "object",
            description: "Если клиент ищет недвижимость, заполни параметры для поиска в БД. Иначе null.",
            properties: {
                search_keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 вариаций названия Города/Района — ОБЯЗАТЕЛЬНО включи русское И латинское написание."
                },
                intent: {
                    type: "string",
                    description: "Намерение: 'sale' (покупка/продажа) или 'rent' (аренда). По умолчанию 'sale' если не сказано иное."
                },
                price: { type: "number", description: "Максимальный бюджет" },
                price_min: { type: "number", description: "Минимальный бюджет" },
                rooms: { type: "string", description: "Например: '1+1'" },
                city: { type: "string" }
            }
        },
        instructions_for_manager_agent: {
            type: "object",
            description: "Секретный вызов менеджера. Вызывай, если клиент оставил КОНТАКТЫ (телефон/почту) ИЛИ если он 'Горячий/Тёплый' (целеустремленно ищет квартиру, есть бюджет). Собери ВСЮ известную инфу из диалога.",
            properties: {
                reason: { type: "string", description: "Почему зовём менеджера? ('Оставил номер', 'Горячий целевой' и т.д.)" },
                client_name: { type: "string" },
                client_phone: { type: "string" },
                client_email: { type: "string" },
                budget: { type: "number", description: "Бюджет в $" },
                interested_units: { type: "array", items: { type: "string" }, description: "Названия лотов или районов, которые заинтересовали" },
                lead_temperature: { type: "string", description: "cold / warm / hot" },
                urgency: { type: "string", description: "Сроки покупки: 'ASAP', '1-3 месяца', '6+ месяцев', 'через год'. Узнай из контекста (например 'через год-два')." },
                purpose: { type: "string", description: "Цель покупки: 'ПРОЖИВАНИЕ', 'ИНВЕСТИЦИИ', 'ВНЖ', 'СДАЧА В АРЕНДУ'. Выведи из диалога." },
                unit_type: { type: "string", description: "Тип недвижимости: 'АПАРТАМЕНТ', 'ВИЛЛА', 'ПЕНТХАУС', 'КОММЕРСИЯ'. Если упоминали в диалоге." },
                preferred_areas: { type: "array", items: { type: "string" }, description: "Предпочтительные районы/города (если упоминали)" },
                manager_hints: { type: "string", description: "Подсказки менеджеру: о чём говорить при звонке, что важно для клиента, есть ли возражения. Кратко, но 2-4 предложения." },
                client_summary: { type: "string", description: "Сводка о клиенте: 2-3 предложения, кто этот человек, что хочет, насколько готов к покупке. Например: 'Клиент из России, ищет 2-комнатный апартамент в Стамбуле от $250тыс. Цель — получение ВНЖ. Горячий лид, звонить срочно.'. Пиши на русском, даже если клиент пишет на другом языке." },
                language: { type: "string", description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr', 'uk' и т.д. Определи по тому, на каком языке он пишет. Это поле ВСЕГДА заполняй." }
            }
        },
        instructions_for_rental_search_agent: {
            type: "object",
            description: "Если клиент ищет АРЕНДУ недвижимости, заполни параметры для поиска. Обязательно вычлени даты, если клиент их назвал.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" }, description: "Города или районы" },
                price_per_day: { type: "number" },
                price_per_month: { type: "number" },
                bedrooms: { type: "number" },
                start_date: { type: "string", description: "Формат YYYY-MM-DD" },
                end_date: { type: "string", description: "Формат YYYY-MM-DD" },
                guests: { type: "number" }
            }
        },
        instructions_for_rental_manager_agent: {
            type: "object",
            description: "Прямой вызов менеджера по АРЕНДЕ. Если клиент оставил номер телефона, WhatsApp или хочет забронировать конкретные даты.",
            properties: {
                reason: { type: "string" },
                client_name: { type: "string" },
                client_phone: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } },
                start_date: { type: "string" },
                end_date: { type: "string" },
                guests: { type: "number" },
                budget: { type: "number" },
                purpose: { type: "string" },
                manager_hints: { type: "string" },
                client_summary: { type: "string" },
                language: { type: "string" }
            }
        }
    },
    required: ["instructions_for_communication_agent"]
};

// ==========================================
// TRANSLATION AGENT (ЛОКАЛИЗАТОР)
// ==========================================
// Задача: Переводит данные лида на английский (en) и турецкий (tr) для дашборда.

export const TranslationAgentSchema = {
    type: "object",
    properties: {
        ru: {
            type: "object",
            properties: {
                client_summary: { type: "string", description: "Улучшенное и краткое описание клиента на русском." },
                manager_hints: { type: "string", description: "Четкие советы менеджеру на русском." },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        },
        en: {
            type: "object",
            properties: {
                client_summary: { type: "string" },
                manager_hints: { type: "string" },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        },
        tr: {
            type: "object",
            properties: {
                client_summary: { type: "string" },
                manager_hints: { type: "string" },
                interest: { type: "string" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                ai_summary: { type: "string" },
                interested_units: { type: "array", items: { type: "string" } }
            }
        }
    }
};

const TRANSLATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ ПЕРЕВОДЧИК И ЛОКАЛИЗАТОР ДЛЯ REAL ESTATE CRM.
Твоя задача — обработать предоставленные данные лида и выдать качественный перевод/локализацию на 3 языка: Русский (RU), Английский (EN) и Турецкий (TR).

ПРАВИЛА:
1. Сохраняй профессиональный, но дружелюбный тон.
2. Используй правильную терминологию недвижимости (апартаменты, вилла, ВНЖ, инвестиции и т.д.).
3. ОБЯЗАТЕЛЬНО переводи географические названия, города и районы (Например: 'Кадыкёй, Стамбул' -> 'Kadikoy, Istanbul' для EN, 'Kadıköy, İstanbul' для TR).
4. Если поле пустое в оригинале — постарайся вывести смысл из контекста других полей или оставь пустым если совсем нет инфы.
5. client_summary должен быть информативным, в стиле "Клиент ищет квартиру в Стамбуле для переезда, бюджет $200к". 
6. manager_hints должны быть четкими указаниями (например: "Предложить проекты в районе Кадыкёй").
7. Для поля RU: не просто скопируй, а причеши и улучши текст, чтобы он выглядел профессионально в CRM.

Выдай результат СТРОГО в формате JSON по схеме.
`;

export async function runTranslationAgent(leadData: any): Promise<any> {
    console.log("[runTranslationAgent] Requesting AI translation...");
    const input = JSON.stringify(leadData);
    console.log(`[runTranslationAgent] Input leadData for translation: ${input.substring(0, 200)}...`); // Added log
    const rawResult = await askLLM(input, TRANSLATION_SYSTEM_PROMPT, false, TranslationAgentSchema);
    console.log("[runTranslationAgent] AI Response length:", rawResult?.length || 0);
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Translation Agent JSON Parse Error:", e, rawResult);
        return { ru: {}, en: {}, tr: {} };
    }
}

// ==========================================
// UNIT TRANSLATION AGENT (ЛОКАЛИЗАТОР ОБЪЕКТОВ)
// ==========================================
// Задача: Переводит данные квартиры на английский для базы данных, и генерирует переводы для дашборда.

export const UnitTranslationAgentSchema = {
    type: "object",
    properties: {
        base_en: {
            type: "object",
            description: "ОБЯЗАТЕЛЬНО: Идеальный перевод всех текстовых полей на английский для сохранения в главные колонки БД.",
            properties: {
                title: { type: "string" },
                city: { type: "string" },
                address: { type: "string" },
                description: { type: "string" }
            }
        },
        i18n: {
            type: "object",
            description: "Переводы для отображения в дашборде на разных языках.",
            properties: {
                ru: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        city: { type: "string" },
                        address: { type: "string" },
                        description: { type: "string" }
                    }
                },
                tr: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        city: { type: "string" },
                        address: { type: "string" },
                        description: { type: "string" }
                    }
                }
            }
        }
    }
};

const UNIT_TRANSLATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ ЛИНГВИСТ-БРОКЕР ДЛЯ БАЗЫ ДАННЫХ НЕДВИЖИМОСТИ.
Твоя задача — принять сырые данные об объекте недвижимости (на любом языке) и стандартизировать их.

ПРАВИЛО 1: BASE_EN ДОЛЖЕН БЫТЬ НА ИДЕАЛЬНОМ АНГЛИЙСКОМ.
Данные из блока \`base_en\` пойдут в основные колонки базы данных, по которым работает поиск. 
- Географические названия должны быть в транслите/английском (Kadikoy, Alanya, Istanbul).
- Описание должно быть привлекательным и профессиональным.

ПРАВИЛО 2: I18N ДЛЯ ДАШБОРДА
- Переведи всё на качественный Русский (RU) и Турецкий (TR).

Выдай результат СТРОГО в формате JSON по схеме.
`;

export async function runUnitTranslationAgent(unitData: any): Promise<any> {
    console.log("[runUnitTranslationAgent] Requesting AI translation for unit...");
    const input = JSON.stringify(unitData);
    const rawResult = await askLLM(input, UNIT_TRANSLATION_SYSTEM_PROMPT, false, UnitTranslationAgentSchema);
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Unit Translation Agent JSON Parse Error:", e, rawResult);
        // Fallback: don't break the save process, just return empty translations and use original as English
        return {
            base_en: { title: unitData.title, city: unitData.city, address: unitData.address, description: unitData.description },
            i18n: { ru: {}, tr: {} }
        };
    }
}


const ROUTER_SYSTEM_PROMPT = `
ТЫ — ГЛАВНЫЙ ИИ-ОРКЕСТРАТОР АГЕНТСТВА НЕДВИЖИМОСТИ.
Твоя задача — проанализировать историю чата и выдать указания другим агентам.

СТАТУС КЛИЕНТА (КРИТИЧНО):
- ГОРЯЧИЙ: Клиент говорит "Мне нравится", "Подходит", "Хочу посмотреть", "Как забронировать?", задает конкретные вопросы по объекту. 
- ТЁПЛЫЙ: Назвал город, бюджет или требования, но еще не выбрал конкретный объект.
- ХОЛОДНЫЙ: Просто "привет" или общие вопросы без конкретики.

ПРАВИЛА ПОИСКА АРЕНДЫ (СТРОГО):
1. Для АРЕНДЫ — ОБЯЗАТЕЛЬНО нужны даты заезда и выезда ПЕРЕД показом квартир.
2. ЕСЛИ клиент назвал город, но НЕ назвал даты → НЕ запускай поиск. Вместо этого дай указание communication агенту спросить ТОЛЬКО даты (не спрашивай сразу всё — только даты).
3. ЕСЛИ клиент назвал город И даты → НЕМЕДЛЕННО заполняй instructions_for_rental_search_agent и запускай поиск. Не жди дополнительных уточнений.
4. Если клиент сообщил кол-во гостей ("я с девушкой" = 2, "нас четверо" = 4) — передай в поле guests.
5. Вызывай поиск только если нужны НОВЫЕ варианты. Если клиенту нравится текущий — поиск не нужен.

ПРАВИЛА ПОИСКА ПРОДАЖИ:
1. Для ПРОДАЖИ — заполняй instructions_for_search_agent.
2. Запускай поиск как только известен город или район.

ПРАВИЛА КОММУНИКАЦИИ:
1. ПРИОРИТЕТ КОНТАКТА: Если клиент ГОРЯЧИЙ — ОБЯЗАН спросить телефон или WhatsApp. Не продолжай бесконечную консультацию.
2. После показа объекта — можно задать ОДИН вопрос (кол-во гостей, предпочтения).
3. НЕ спрашивай бюджет повторно если он уже известен.

Выдай ТОЛЬКО JSON строго по Схеме.
`;

export async function runRouterAgent(messages: RoleMessage[], companyKnowledge: string): Promise<any> {
    const fullSystem = ROUTER_SYSTEM_PROMPT + "\n\n[БАЗА ЗНАНИЙ И ПРАВИЛА КОМПАНИИ]:\n" + companyKnowledge;
    const rawResult = await askLLM(messages, fullSystem, false, RouterSchema);
    if (!rawResult) {
        return { instructions_for_communication_agent: "Извините, я временно недоступен. Попробуйте позже." };
    }
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Router JSON Parse Error:", e, rawResult);
        return { instructions_for_communication_agent: "Извините, произошла ошибка обработки. Повторите запрос." };
    }
}


// ==========================================
// COMMUNICATION AGENT (Официальный представитель)
// ==========================================
// Задача: Формировать красивые, живые, экспертные текстовые ответы для клиента.

const COMMUNICATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ БРОКЕР ПО НЕДВИЖИМОСТИ В ТУРЦИИ.

ПРАВИЛО ОДНОГО СООБЩЕНИЯ ( Answer + Info + CTA ):
1. ОТВЕТ: Краткая реакция на слова клиента.
2. ПРЕЗЕНТАЦИЯ (если есть в [DATA]): Описание аренды или продажи, исходя из переданных данных. 
3. ЗАКРЫТИЕ (CTA): 
   - Если клиент проявил интерес ("мне нравится", "супер"), ПРЕКРАТИ консультацию и ПРЯМО предложи оставить номер телефона или WhatsApp.
   - Иначе задай ОДИН уточняющий вопрос (про сроки отдыха/проживания для аренды, либо про локацию для продажи). Избегай повторов вопроса про бюджет.

ШАБЛОН ДЛЯ ПРОДАЖИ:
🏠 [title] | 📍 [city], [address]
💰 Цена: [price] EUR
🏢 Этаж: [floor]/[floors_total]
📐 Площадь: [area_m2] м²
🛏 Комнат: [rooms]

ШАБЛОН ДЛЯ АРЕНДЫ:
🏖 [title] | 📍 [city], [address]
💵 Цена: [price_month] EUR/мес или [price_day] EUR/дн
🛏 Спален: [bedrooms]
👤 Макс. гостей: [max_guests]

СТРОГИЕ ОГРАНИЧЕНИЯ:
1. Выдаем ТОЛЬКО ту инфу, которая есть в [DATA]. Если чего-то нет (например цены за день) - не пиши.
2. БЕЗ ЗВЕЗДОЧЕК (**).
3. Приоритет — взять контакт.

ДАННЫЕ (предоставлены системой):
`;

export async function runCommunicationAgent(
    history: RoleMessage[],
    instructionsAndCompanyInfo: string,
    dynamicData: string = "Данных из базы нет. Отвечай на вопрос клиента.",
    language: string = "ru"
): Promise<string> {
    const langLabel = language === 'ru' ? 'RUSSIAN' : language === 'tr' ? 'TURKISH' : language === 'en' ? 'ENGLISH' : language.toUpperCase();

    // Формируем системный промпт из статического + знаний из БД + динамических данных (квартиры)
    const fullSystemPrompt = `
${COMMUNICATION_SYSTEM_PROMPT}

[CLIENT LANGUAGE]:
${langLabel} (Отвечай СТРОГО на этом языке!)

[ЗНАНИЯ О КОМПАНИИ И ИНСТРУКЦИИ]:
${instructionsAndCompanyInfo}

[DATA]:
${dynamicData}
`;

    // Agent outputs plain text, no JSON schema
    const result = await askLLM(history, fullSystemPrompt, true);
    return result;
}

// ==========================================
// RENTAL TRANSLATION AGENT (ЛОКАЛИЗАТОР АРЕНДЫ)
// ==========================================
// Задача: Переводит данные арендной квартиры на английский для БД, и генерирует переводы для дашборда.

export const RentalTranslationAgentSchema = {
    type: "object",
    properties: {
        base_en: {
            type: "object",
            description: "ОБЯЗАТЕЛЬНО: Идеальный перевод всех текстовых полей на английский для сохранения в главные колонки БД.",
            properties: {
                title: { type: "string" },
                city: { type: "string" },
                address: { type: "string" },
                description: { type: "string" }
            }
        },
        i18n: {
            type: "object",
            description: "Переводы для отображения в дашборде на разных языках.",
            properties: {
                ru: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        city: { type: "string" },
                        address: { type: "string" },
                        description: { type: "string" }
                    }
                },
                tr: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        city: { type: "string" },
                        address: { type: "string" },
                        description: { type: "string" }
                    }
                }
            }
        }
    }
};

const RENTAL_TRANSLATION_SYSTEM_PROMPT = `
ТЫ — ПРОФЕССИОНАЛЬНЫЙ ЛИНГВИСТ-БРОКЕР ДЛЯ БАЗЫ ДАННЫХ АРЕНДЫ НЕДВИЖИМОСТИ.
Твоя задача — принять сырые данные об арендном объекте (на любом языке) и стандартизировать их.

ПРАВИЛО 1: BASE_EN ДОЛЖЕН БЫТЬ НА ИДЕАЛЬНОМ АНГЛИЙСКОМ.
Данные из блока \`base_en\` пойдут в основные колонки базы данных, по которым работает поиск. 
- Географические названия должны быть в транслите/английском (Kadikoy, Alanya, Istanbul).
- Описание должно быть привлекательным и описывать удобства для проживания/отдыха.

ПРАВИЛО 2: I18N ДЛЯ ДАШБОРДА
- Переведи всё на качественный Русский (RU) и Турецкий (TR).

Выдай результат СТРОГО в формате JSON по схеме.
`;

export async function runRentalTranslationAgent(rentalData: any): Promise<any> {
    console.log("[runRentalTranslationAgent] Requesting AI translation for rental...");
    const input = JSON.stringify(rentalData);
    const rawResult = await askLLM(input, RENTAL_TRANSLATION_SYSTEM_PROMPT, false, RentalTranslationAgentSchema);
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Rental Translation Agent JSON Parse Error:", e, rawResult);
        // Fallback
        return {
            base_en: { title: rentalData.title, city: rentalData.city, address: rentalData.address, description: rentalData.description },
            i18n: { ru: {}, tr: {} }
        };
    }
}
