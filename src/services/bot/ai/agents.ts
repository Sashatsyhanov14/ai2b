import { askLLM } from "@/lib/gemini";

export type RoleMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

// ==========================================
// ANALYZER AGENT (Анализатор Намерений)
// ==========================================
// Задача: Читает чат, понимает интент, распределяет данные по специализированным пайплайнам.

export const AnalyzerSchema = {
    type: "object",
    properties: {
        instructions_for_writer: {
            type: "string",
            description: "Прямое указание для Writer-Агента (что именно ответить клиенту). Пиши на языке клиента."
        },
        detected_language: {
            type: "string",
            description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr'. Определи по контексту."
        },
        instructions_for_sale_search: {
            type: "object",
            description: "ЗАПОЛНИ, ЕСЛИ клиент хочет КУПИТЬ КВАРТИРУ или ВИЛЛУ.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" }, description: "Города или районы" },
                intent: { type: "string", description: "СТРОГО: 'sale'" },
                price: { type: "number", description: "Максимальный бюджет" },
                price_min: { type: "number", description: "Минимальный бюджет" },
                rooms: { type: "string", description: "Например: '1+1'" },
                city: { type: "string" }
            }
        },
        instructions_for_rent_search: {
            type: "object",
            description: "ЗАПОЛНИ, ЕСЛИ клиент ищет АРЕНДУ недвижимости.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" } },
                intent: { type: "string", description: "СТРОГО: 'rent'" },
                price_per_day: { type: "number" },
                price_per_month: { type: "number" },
                bedrooms: { type: "number" },
                start_date: { type: "string", description: "Формат YYYY-MM-DD" },
                end_date: { type: "string", description: "Формат YYYY-MM-DD" },
                guests: { type: "number" }
            }
        },
        instructions_for_land_search: {
            type: "object",
            description: "ЗАПОЛНИ, ЕСЛИ клиент хочет КУПИТЬ УЧАСТОК ИЛИ ЗЕМЛЮ.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" } },
                intent: { type: "string", description: "СТРОГО: 'land'" },
                price: { type: "number" },
                area_min: { type: "number", description: "Минимальная площадь участка в м2" }
            }
        },
        instructions_for_manager_agent: {
            type: "object",
            description: "Секретный вызов CRM. Вызывай, если клиент оставил КОНТАКТЫ (телефон/почту) ИЛИ если он 'Горячий/Тёплый'.",
            properties: {
                reason: { type: "string" },
                client_name: { type: "string" },
                client_phone: { type: "string" },
                client_email: { type: "string" },
                budget: { type: "number" },
                interested_units: { type: "array", items: { type: "string" } },
                lead_temperature: { type: "string", description: "cold / warm / hot" },
                urgency: { type: "string" },
                purpose: { type: "string" },
                unit_type: { type: "string" },
                preferred_areas: { type: "array", items: { type: "string" } },
                manager_hints: { type: "string" },
                client_summary: { type: "string" },
                language: { type: "string" }
            }
        },
        instructions_for_rental_manager_agent: {
            type: "object",
            description: "Прямой вызов менеджера по АРЕНДЕ.",
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
    required: ["instructions_for_writer"]
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


const ANALYZER_SYSTEM_PROMPT = `
ТЫ — ГЛАВНЫЙ ИИ-АНАЛИЗАТОР (ANALYZER AGENT) АГЕНТСТВА НЕДВИЖИМОСТИ.
Твоя задача — проанализировать историю чата и выдать указания другим специализированным агентам (Writer Agent, Search Executor).

СТАТУС КЛИЕНТА (КРИТИЧНО):
- ГОРЯЧИЙ: Клиент говорит "Мне нравится", "Подходит", "Хочу посмотреть", "Как забронировать?", задает конкретные вопросы по объекту. 
- ТЁПЛЫЙ: Назвал город, бюджет или требования, но еще не выбрал конкретный объект.
- ХОЛОДНЫЙ: Просто "привет" или общие вопросы без конкретики.

ПРАВИЛА ОПРЕДЕЛЕНИЯ ИНТЕНТА:
1. АРЕНДА: Если клиент ищет жилье снять/арендовать -> заполняй instructions_for_rent_search.
2. ПОКУПКА ЗЕМЛИ/УЧАСТКА: Если клиент ищет землю, участок (land, plot) -> заполняй instructions_for_land_search. Участки измеряются в сотках или м2 (area_min).
3. ПОКУПКА ЖИЛЬЯ: Во всех остальных случаях покупки (квартиры, виллы) -> заполняй instructions_for_sale_search.

ПРАВИЛА ПОИСКА АРЕНДЫ (СТРОГО):
1. Для АРЕНДЫ — ОБЯЗАТЕЛЬНО нужны даты заезда и выезда ПЕРЕД показом квартир.
2. ЕСЛИ клиент назвал город, но НЕ назвал даты → НЕ запускай поиск. Вместо этого дай указание writer агенту спросить ТОЛЬКО даты (не спрашивай сразу всё).
3. ЕСЛИ клиент назвал город И даты → НЕМЕДЛЕННО заполняй instructions_for_rent_search.
4. Если клиент сообщил кол-во гостей ("я с девушкой" = 2) — передай в поле guests.

ПРАВИЛА КОММУНИКАЦИИ (instructions_for_writer):
1. ПРИОРИТЕТ КОНТАКТА: Если клиент ГОРЯЧИЙ — ОБЯЗАН сказать Writer Агенту запросить телефон или WhatsApp.
2. Дай Writer Агенту четкую инструкцию, в каком тоне отвечать и о чем спросить в конце.

Выдай ТОЛЬКО JSON строго по Схеме.
`;

export async function runAnalyzerAgent(messages: RoleMessage[], companyKnowledge: string): Promise<any> {
    const fullSystem = ANALYZER_SYSTEM_PROMPT + "\n\n[БАЗА ЗНАНИЙ И ПРАВИЛА КОМПАНИИ]:\n" + companyKnowledge;
    const rawResult = await askLLM(messages, fullSystem, false, AnalyzerSchema);
    if (!rawResult) {
        return { instructions_for_writer: "Извините, я временно недоступен. Попробуйте позже." };
    }
    try {
        return JSON.parse(rawResult);
    } catch (e) {
        console.error("Analyzer JSON Parse Error:", e, rawResult);
        return { instructions_for_writer: "Извините, произошла ошибка обработки. Повторите запрос." };
    }
}


// ==========================================
// WRITER AGENTS (Специализированные Писатели)
// ==========================================
// Задача: Формировать текстовые ответы для клиента, учитывая специфику (Продажа, Аренда, Земля).

const COMMON_WRITER_RULES = `
ПРАВИЛО ОДНОГО СООБЩЕНИЯ ( Answer + Info + CTA ):
1. ОТВЕТ: Краткая реакция на слова клиента.
2. ПРЕЗЕНТАЦИЯ (если есть в [DATA]): Описание объекта.
3. ЗАКРЫТИЕ (CTA): 
   - Если клиент проявил интерес, ПРЕКРАТИ консультацию и предложи оставить телефон/WhatsApp.
   - Иначе задай ОДИН уточняющий вопрос.

СТРОГИЕ ОГРАНИЧЕНИЯ:
1. Выдаем ТОЛЬКО ту инфу, которая есть в [DATA].
2. БЕЗ ЗВЕЗДОЧЕК (**).
3. Приоритет — взять контакт.
`;

const SALE_WRITER_PROMPT = `
ТЫ — EXPERT WRITER AGENT по ПРОДАЖЕ КВАРТИР И ВИЛЛ.
${COMMON_WRITER_RULES}

ШАБЛОН ДЛЯ ПРОДАЖИ (Используй его, если в [DATA] есть объекты):
🏠 [title] | 📍 [city], [address]
💰 Цена: [price] EUR
🏢 Этаж: [floor]/[floors_total]
📐 Площадь: [area_m2] м²
🛏 Комнат: [rooms]
`;

const RENT_WRITER_PROMPT = `
ТЫ — EXPERT WRITER AGENT по АРЕНДЕ НЕДВИЖИМОСТИ.
${COMMON_WRITER_RULES}

ЕСЛИ [DATA] пустой — спроси ТОЛЬКО даты (когда заезд и выезд). Не спрашивай бюджет или спальни до выяснения дат.

ШАБЛОН ДЛЯ АРЕНДЫ (Используй его, если в [DATA] есть объекты):
🏖 [title] | 📍 [city], [address]
💵 Цена: [price_month] EUR/мес или [price_day] EUR/дн
🛏 Спален: [bedrooms]
👤 Макс. гостей: [max_guests]
`;

const LAND_WRITER_PROMPT = `
ТЫ — EXPERT WRITER AGENT по ПРОДАЖЕ ЗЕМЛИ И УЧАСТКОВ.
${COMMON_WRITER_RULES}

ШАБЛОН ДЛЯ УЧАСТКОВ:
🏞 [title] | 📍 [city], [address]
💰 Цена: [price] EUR
📐 Площадь: [area_m2] м²
📝 Особенности: [features]
(Никогда не упоминай спальни, этажи или санузлы для земли!)
`;

async function executeWriter(prompt: string, history: RoleMessage[], instructionsAndCompanyInfo: string, dynamicData: string, language: string) {
    const langLabel = language === 'ru' ? 'RUSSIAN' : language === 'tr' ? 'TURKISH' : language === 'en' ? 'ENGLISH' : language.toUpperCase();
    const fullSystemPrompt = `${prompt}

[CLIENT LANGUAGE]:
${langLabel} (Отвечай СТРОГО на этом языке!)

[ЗНАНИЯ О КОМПАНИИ И ИНСТРУКЦИИ АНАЛИЗАТОРА]:
${instructionsAndCompanyInfo}

[DATA]:
${dynamicData}`;

    return await askLLM(history, fullSystemPrompt, true);
}

export async function runSaleWriterAgent(history: RoleMessage[], instr: string, data: string, lang: string) {
    return executeWriter(SALE_WRITER_PROMPT, history, instr, data, lang);
}

export async function runRentWriterAgent(history: RoleMessage[], instr: string, data: string, lang: string) {
    return executeWriter(RENT_WRITER_PROMPT, history, instr, data, lang);
}

export async function runLandWriterAgent(history: RoleMessage[], instr: string, data: string, lang: string) {
    return executeWriter(LAND_WRITER_PROMPT, history, instr, data, lang);
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
