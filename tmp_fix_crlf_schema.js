const fs = require('fs');
const FILE_PATH = 'c:\\Users\\ТЕХНОРАЙ\\Desktop\\ai2b app\\src\\services\\bot\\ai\\agents.ts';

try {
  let content = fs.readFileSync(FILE_PATH, 'utf8');
  // Normalize Windows CRLF to standard LF so regex and string matching works perfectly
  content = content.replace(/\r\n/g, '\n'); 

  const regex = /export const AnalyzerSchema = \{[\s\S]+?required: \["writer_agent", "client_translator_agent"\]\n\};/;
  
  if (!regex.test(content)) {
      console.log("Error: Regex didn't match. Either already updated or format changed.");
      process.exit(1);
  }

  const newSchema = `export const AnalyzerSchema = {
    type: "object",
    properties: {
        writer_agent: {
            type: "object",
            description: "1. ОБЯЗАТЕЛЬНО: Инструкции для Агента-Писателя (Toп-Брокер). Задай вопрос для выявления потребностей или выбери 1 лучший объект.",
            properties: {
                instruction: { type: "string", description: "Суть ответа. Кратко и по делу." },
                intent: { type: "string", description: "general, search, faq" }
            }
        },
        search_agent: {
            type: "object",
            description: "2. ЗАПОЛНИ, ЕСЛИ клиент ищет недвижимость (покупка, аренда, земля). Возвращай максимально широкие критерии, чтобы найти близкие варианты (строго без выдумок).",
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
};`;

    const newContent = content.replace(regex, newSchema);
    fs.writeFileSync(FILE_PATH, newContent, 'utf8');
    console.log('SUCCESS: AnalyzerSchema successfully updated to 7-Agent Architecture! 💎');

} catch (err) {
  console.error(err);
}
