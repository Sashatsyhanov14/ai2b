const fs = require('fs');
const FILE_PATH = 'c:\\Users\\ТЕХНОРАЙ\\Desktop\\ai2b app\\src\\services\\bot\\ai\\agents.ts';

try {
  let content = fs.readFileSync(FILE_PATH, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const regex = /const ANALYZER_SYSTEM_PROMPT = `[\s\S]+?`;/;
  if (!regex.test(content)) {
      console.log('Error matching prompt regex.');
      process.exit(1);
  }

  const newPrompt = `const ANALYZER_SYSTEM_PROMPT = \`
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
\`;`;

  content = content.replace(regex, newPrompt);
  fs.writeFileSync(FILE_PATH, content, 'utf8');
  console.log('SUCCESS: System Prompt updated. 💎');
} catch (err) {
  console.error(err);
}
