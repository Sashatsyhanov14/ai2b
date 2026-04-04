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
        search_agent: {
            type: "object",
            description: "2. ЗАПОЛНИ, ЕСЛИ клиент ищет недвижимость (покупка, аренда, земля). Возвращай максимально широкие критерии, чтобы найти похожее (строго без выдумок).",
            properties: {
                category: { type: "string", description: "'residential', 'commercial', 'land', или 'all'" },
                transaction_type: { type: "string", description: "'sale', 'rent', или 'all'" },
                search_keywords: { type: "array", items: { type: "string" }, description: "Пиши Города или районы на английском, например 'Kestel, Alanya'" },
                price_max: { type: "number" },
                price_min: { type: "number" },
                rooms: { type: "string" },
                area_min: { type: "number", description: "Для земли/коммерции" }
            }
        },
        lead_extractor_agent: {
            type: "object",
            description: "3. ЗАПОЛНИ, ЕСЛИ появились данные: контакты или важные детали о клиенте (цель, семья, профессия, боли).",
            properties: {
                client_name: { type: "string" },
                client_phone: { type: "string" },
                budget: { type: "number" },
                lead_temperature: { type: "string", description: "cold / warm / hot" },
                client_profile: { type: "string", description: "Подробно кто клиент, для чего ищет, состав семьи, особенности." }
            }
        },
        notifier_agent: {
            type: "object",
            description: "4. ЗАПОЛНИ, ЕСЛИ лид 'hot' (готов купить/забронировать) или оставил номер и нужен менеджер.",
            properties: {
                alert_reason: { type: "string", description: "Причина вызова менеджера." }
            }
        },
        photo_agent: {
            type: "object",
            description: "5. ЗАПОЛНИ, ЕСЛИ клиент прямо просит фото, видео или планировку конкретного объекта по UUID.",
            properties: {
                target_unit_uuid: { type: "string", description: "Точный 36-символьный UUID объекта." }
            }
        }
   },
    required: ["writer_agent"]
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
8. В поле interested_units используй только понятные названия (Город, Адрес или Название ЖК). Если приходят технические UUID — заменяй их на понятное описание из контекста (например: 'Квартира в Алании'), не свети UUID в интерфейсе CRM.

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
ТЫ — ГЛАВНЫЙ ИИ-АНАЛИЗАТОР (ORCHESTRATOR) АГЕНТСТВА НЕДВИЖИМОСТИ.
Твоя задача — проанализировать историю чата и выдать JSON-объект, где каждый блок отвечает за запуск отдельного суб-агента.
Если суб-агент НЕ НУЖЕН для ответа на текущее сообщение, просто не заполняй его блок (он должен отсутствовать в JSON).

Твои доступные суб-агенты:
1. writer_agent (ОБЯЗАТЕЛЬНО) - Дай прямые инструкции писателю: на какие вопросы ответить, что уточнить у клиента.
2. search_agent - Запускай, если клиент просит скинуть варианты недвижимости (любого типа).
3. lead_extractor_agent - Запускай, если клиент пишет контактные данные, бюджет, возраст, профессию, цели или семейное положение.
4. notifier_agent - Запускай ТОЛЬКО если клиент горячий лид, оставил номер или требует менеджера.
5. photo_agent - Запускай, если клиент явно просит скинуть фото, видео или планировки объекта (нужно указать UUID объекта).

ПОИСК: Мы ищем варианты "широко". Если идеального совпадения не будет, база подкинет похожие.

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
    const rawResult = await askLLM(input, RENTAL_TRANSLATION_SYSTEM_PROMPT, false, RentalTranslationAgentSchema, 'gemini-2.0-flash-001');
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
    
    return await askLLM(prompt, "Ты ассистент-переводчик.", true, undefined, 'gemini-2.0-flash-001');
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
