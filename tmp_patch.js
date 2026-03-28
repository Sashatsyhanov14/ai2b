const fs = require('fs');

const FILE_PATH = 'c:\\Users\\ТЕХНОРАЙ\\Desktop\\ai2b app\\src\\services\\bot\\ai\\agents.ts';

try {
  let content = fs.readFileSync(FILE_PATH, 'utf8');

  // We know the exact start and end. Let's use robust strings that exist 100%.
  // Start: writer_agent: {
  // End: required: ["writer_agent"]
  // From our previous view_file, we know these exist perfectly.
  
  const startKeyword = '        client_translator_agent: {';
  const endKeyword = '    },';
  
  const startIndex = content.indexOf(startKeyword);
  const searchEndKeyword = '    required: ["writer_agent"]';
  const endIndex = content.indexOf(searchEndKeyword, startIndex) - ('    },\n').length;
  
  if (startIndex === -1 || endIndex <= startIndex) {
      console.log('Error finding borders.');
      console.log('startIndex:', startIndex, 'endIndex:', endIndex);
      process.exit(1);
  }

  const newProperties = `        search_agent: {
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
`;

    // The text from start of file until client_translator_agent
    const part1 = content.substring(0, startIndex);
    
    // The text from end Keyword onwards
    const eIdx = content.indexOf('    required: ["writer_agent"]');
    const part2 = content.substring(eIdx - ('    },\n').length);
    
    const newContent = part1 + newProperties + part2;
    
    fs.writeFileSync(FILE_PATH, newContent, 'utf8');
    console.log("SUCCESS: Replaced Middle Properties Block.");
} catch(err) {
  console.error(err);
}
