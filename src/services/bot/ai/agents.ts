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
        writer_agent: {
            type: "object",
            description: "1. ОБЯЗАТЕЛЬНО: Инструкции для Агента-Писателя (GPT-4o-mini). Что ответить, о чем спросить.",
            properties: {
                instruction: { type: "string", description: "Суть ответа. Кратко и по делу." },
                intent: { type: "string", description: "sale, rent, land, или general" }
            }
        },
        client_translator_agent: {
            type: "object",
            description: "2. ОБЯЗАТЕЛЬНО: Язык, на который Агент-Переводчик (Flash) переведет ответ Писателя.",
            properties: {
                target_language: { type: "string", description: "Язык клиента: 'ru', 'tr', 'en', 'de', 'fr'. Определи по контексту." }
            }
        },
        search_sale_agent: {
            type: "object",
            description: "3. ЗАПОЛНИ, ЕСЛИ клиент хочет КУПИТЬ КВАРТИРУ или ВИЛЛУ.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" }, description: "Города или районы" },
                price: { type: "number", description: "Максимальный бюджет" },
                price_min: { type: "number", description: "Минимальный бюджет" },
                rooms: { type: "string", description: "Например: '1+1'" }
            }
        },
        search_rent_agent: {
            type: "object",
            description: "4. ЗАПОЛНИ, ЕСЛИ клиент ищет АРЕНДУ недвижимости.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" } },
                price_per_day: { type: "number" },
                price_per_month: { type: "number" },
                bedrooms: { type: "number" },
                start_date: { type: "string", description: "YYYY-MM-DD" },
                end_date: { type: "string", description: "YYYY-MM-DD" },
                guests: { type: "number" }
            }
        },
        search_land_agent: {
            type: "object",
            description: "5. ЗАПОЛНИ, ЕСЛИ клиент хочет КУПИТЬ УЧАСТОК ИЛИ ЗЕМЛЮ.",
            properties: {
                search_keywords: { type: "array", items: { type: "string" } },
                price: { type: "number" },
                area_min: { type: "number", description: "Минимальная площадь в м2" }
            }
        },
        rag_agent: {
            type: "object",
            description: "6. ЗАПОЛНИ, ЕСЛИ клиент задает вопросы по ВНЖ, налогам, процедуре покупки, правилам (инфозапросы).",
            properties: {
                rag_query: { type: "string", description: "Формализованный поисковый запрос по базе знаний" }
            }
        },
        photo_agent: {
            type: "object",
            description: "7. ЗАПОЛНИ, ЕСЛИ клиент просит прислать фото, планировки или видео объекта.",
            properties: {
                send_photos: { type: "boolean" },
                focus_area: { type: "string", description: "Ванная, вид, кухня, планировка" }
            }
        },
        lead_extractor_sale_agent: {
            type: "object",
            description: "8. ЗАПОЛНИ, ЕСЛИ клиент оставил контакт, назвал бюджет/цель или если он горячий лид на ПОКУПКУ.",
            properties: {
                client_name: { type: "string" },
                client_phone: { type: "string" },
                budget: { type: "number" },
                lead_temperature: { type: "string", description: "cold / warm / hot" },
                purpose: { type: "string" },
                manager_alert_reason: { type: "string", description: "Если нужно срочно уведомить менеджера (покупка)" }
            }
        },
        lead_extractor_rent_agent: {
            type: "object",
            description: "9. ЗАПОЛНИ, ЕСЛИ клиент оставил контакт или формируется профиль на АРЕНДУ.",
            properties: {
                client_name: { type: "string" },
                client_phone: { type: "string" },
                start_date: { type: "string" },
                end_date: { type: "string" },
                guests: { type: "number" },
                manager_alert_reason: { type: "string", description: "Если нужно срочно уведомить менеджера (аренда)" }
            }
        },
        booking_agent: {
            type: "object",
            description: "10. ЗАПОЛНИ, ЕСЛИ ГОРЯЧИЙ клиент на АРЕНДУ подтверждает даты и хочет забронировать.",
            properties: {
                action: { type: "string", description: "'create_hold' или 'confirm'" },
                target_unit: { type: "string" }
            }
        },
        search_commercial_agent: {
            type: "object",
            description: "11. ЗАПОЛНИ, ЕСЛИ клиент хочет КУПИТЬ ИЛИ АРЕНДОВАТЬ КОММЕРЧЕСКУЮ недвижимость (офисы, магазины, склады, отели).",
            properties: {
                search_keywords: { type: "array", items: { type: "string" } },
                price: { type: "number" },
                area_min: { type: "number" }
            }
        }
    },
    required: ["writer_agent", "client_translator_agent"]
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
    const rawResult = await askLLM(input, TRANSLATION_SYSTEM_PROMPT, false, TranslationAgentSchema, 'gemini-1.5-flash');
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
    const rawResult = await askLLM(input, UNIT_TRANSLATION_SYSTEM_PROMPT, false, UnitTranslationAgentSchema, 'gemini-1.5-flash');
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
ТЫ — ГЛАВНЫЙ ИИ-АНАЛИЗАТОР (ANALYZER ORCHESTRATOR) АГЕНТСТВА НЕДВИЖИМОСТИ.
Твоя задача — проанализировать историю чата и выдать гигантский JSON-объект, где каждый блок отвечает за запуск отдельного суб-агента.
Если суб-агент НЕ НУЖЕН для ответа на текущее сообщение, просто не заполняй его блок (он должен отсутствовать в итоговом JSON).

Твои основные суб-агенты:
1. writer_agent (ОБЯЗАТЕЛЬНО) - Дай указание писателю, что ответить, о чем спросить в конце.
2. client_translator_agent (ОБЯЗАТЕЛЬНО) - Укажи язык клиента (ru, en, tr, de, fr) для финального перевода сообщения.
3. search_sale_agent - Запускай, если клиент просит варианты покупки квартиры/виллы.
4. search_rent_agent - Запускай, если ищут аренду. ЕСЛИ НЕТ ДАТ -> НЕ запускай поиск! Скажи writer_agent выяснить даты.
5. search_land_agent - Запускай, если ищут землю/участок (площадь в м2/сотках).
6. rag_agent - Запускай, если клиент задает вопросы по правилам, ВНЖ, налогам или FAQ компании.
7. photo_agent - Запускай, если клиент явно просит показать фото, видео или планировки объекта.
8. lead_extractor_sale_agent - Фоновый сборщик в CRM. Запускай, если клиент назвал бюджет, оставил телефон/почту, или проявил сильный интерес к покупке (HOT lead).
9. lead_extractor_rent_agent - Аналогично для аренды (сбор дат и гостей).
10. booking_agent - Запускай ТОЛЬКО если клиент на аренду подтверждает даты и явно хочет забронировать.

СТРОГО возвращай ТОЛЬКО JSON структуру по Схеме.
`;

export async function runAnalyzerAgent(messages: RoleMessage[], companyKnowledge: string): Promise<any> {
    const todayStr = new Date().toISOString().substring(0, 10);
    const fullSystem = ANALYZER_SYSTEM_PROMPT + `\n\n[СИСТЕМНАЯ ДАТА: Сегодня ${todayStr}. При извлечении дат аренды (YYYY-MM-DD), используй текущий год, если клиент его не назвал.]\n\n[БАЗА ЗНАНИЙ И ПРАВИЛА КОМПАНИИ]:\n` + companyKnowledge;
    const rawResult = await askLLM(messages, fullSystem, false, AnalyzerSchema, 'deepseek');
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

async function executeWriter(prompt: string, history: RoleMessage[], instructionsAndCompanyInfo: string, dynamicData: string) {
    const fullSystemPrompt = `${prompt}

[ВНИМАНИЕ]: Твоя задача — составить ИДЕАЛЬНЫЙ ответ на БАЗОВОМ ЯЗЫКЕ (Русский/Английский). Агент-Переводчик переведет твой текст позже. Фокусируйся на структуре и продажах.

[ЗНАНИЯ О КОМПАНИИ И ИНСТРУКЦИИ АНАЛИЗАТОРА]:
${instructionsAndCompanyInfo}

[DATA]:
${dynamicData}`;

    return await askLLM(history, fullSystemPrompt, true, undefined, 'gpt-4o-mini');
}

export async function runSaleWriterAgent(history: RoleMessage[], instr: string, data: string) {
    return executeWriter(SALE_WRITER_PROMPT, history, instr, data);
}

export async function runRentWriterAgent(history: RoleMessage[], instr: string, data: string) {
    return executeWriter(RENT_WRITER_PROMPT, history, instr, data);
}

export async function runLandWriterAgent(history: RoleMessage[], instr: string, data: string) {
    return executeWriter(LAND_WRITER_PROMPT, history, instr, data);
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
    const rawResult = await askLLM(input, RENTAL_TRANSLATION_SYSTEM_PROMPT, false, RentalTranslationAgentSchema, 'gemini-1.5-flash');
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

// ==========================================
// CLIENT TRANSLATOR AGENT (Пользовательский Локализатор)
// ==========================================
export async function runClientTranslatorAgent(baseText: string, targetLang: string, history: RoleMessage[]): Promise<string> {
    const prompt = `ТЫ — ПРОФЕССИОНАЛЬНЫЙ ЛИНГВИСТ компании.
Твоя единственная цель — перевести финальный текст Ассистента (составленный Writer-Агентом) на язык: '${targetLang}'.
Если текст уже на этом языке, просто сделай его более естественным и привлекательным.
Текст для перевода/коррекции:
${baseText}`;
    
    return await askLLM(prompt, "Ты ассистент-переводчик.", true, undefined, 'gemini-1.5-flash');
}

// ==========================================
// RAG AGENT (База Знаний и FAQ)
// ==========================================
export async function runRagAgent(query: string, companyKnowledge: string): Promise<string> {
    const prompt = `Твоя задача — найти ответ на вопрос клиента, используя ТОЛЬКО предоставленную Базу Знаний.
Вопрос от аналитика: ${query}

База Знаний:
${companyKnowledge}

Если прямого ответа нет, так и скажи.`;
    return await askLLM(prompt, "Ты аналитик базы знаний RAG.", true, undefined, 'gemini-1.5-flash');
}

// ==========================================
// PHOTO AGENT
// ==========================================
export async function runPhotoAgent(focus: string, unitImages: string[]): Promise<string[]> {
    return unitImages.slice(0, 5); // Return up to 5 images
}
