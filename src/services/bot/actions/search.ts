import { getServerClient } from "@/lib/supabaseClient";
import { sendMessage, sendTyping } from "@/lib/telegram";
import { askLLM } from "@/lib/openrouter";
import { appendMessage } from "@/services/sessions";
import { SearchUnitsArgs, Lang } from "../types";
import { buildPropertyDescription } from "../utils/formatters";
import { sendPropertyPhotos } from "./photos";

// ... [previous serveUnit code remains similar] ...
async function serveUnit(
    supabase: any,
    unitId: number,
    token: string,
    chatId: number,
    lang: Lang,
    sessionId: string | null,
    botId: string
): Promise<string | null> {
    const { data: unit } = await supabase.from("units").select("*").eq("id", unitId).single();
    if (!unit) return null;

    const caption = buildPropertyDescription(unit, lang);
    await sendPropertyPhotos(token, String(chatId), String(unit.id), caption, lang);

    if (sessionId) {
        try {
            await appendMessage({
                session_id: sessionId,
                bot_id: botId,
                role: "assistant",
                content: caption,
                payload: { unit_id: unit.id, city: unit.city, ai_instructions: unit.ai_instructions },
            });
        } catch (e) { console.error("appendMessage error:", e); }
    }

    return \`Shown unit \${unit.id}\`;
}

// Helper to parse "2+1" -> 2
function parseRooms(roomStr?: string | null): number | null {
  if (!roomStr) return null;
  const match = roomStr.match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// ... [AI Full Scan logic adapted] ...
async function handleAiFullScan(
  supabase: any,
  chatId: number,
  filters: SearchUnitsArgs,
  exclude_ids: number[],
  token: string,
  botId: string,
  lang: Lang,
  sessionId: string | null
): Promise<string | null> {
  const { data: allUnits } = await supabase
    .from("units")
    .select("id, city, district, price, rooms, project, ai_instructions, features")
    .eq("status", "available");

  if (!allUnits || allUnits.length === 0) {
    if (lang === 'ru') await sendMessage(token, String(chatId), "База пуста.");
    return null;
  }

  // Format for AI
  const listText = allUnits.map((u: any) => {
    return \`#\${u.id} \${u.city} \${u.rooms}+1 $\${Math.round(u.price / 1000)}k \${u.project || ""}\`;
  }).join("\n");

  const aiPrompt = \`Find best match.
Query: City=\${filters.city}, Price<=\${filters.max_price || "Any"}, Rooms=\${filters.min_rooms || "Any"}
List:
\${listText}
Return JSON: { "unit_id": number | null }\`;

  let selectedUnitId: number | null = null;
  try {
    const raw = await askLLM(aiPrompt, "Database Matcher", true);
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");
    selectedUnitId = parsed.unit_id;
  } catch (e) { console.error(e); }

  if (selectedUnitId && !exclude_ids.includes(selectedUnitId)) {
    return await serveUnit(supabase, selectedUnitId, token, chatId, lang, sessionId, botId);
  } else {
    // Silent fail? Or let the LLM apologize?
    // User Guide says: "If no properties found, apologize".
    // Since this is a tool execution, we could send a system message, or just let LLM handle it next turn.
    // We'll send a "Nothing found" notification to be safe.
    return "Nothing found";
  }
}

async function handleSqlSearch(
  supabase: any,
  chatId: number,
  filters: SearchUnitsArgs,
  exclude_ids: number[],
  token: string,
  botId: string,
  lang: Lang,
  sessionId: string | null
): Promise<string | null> {
  let queryBuilder = supabase
    .from("units")
    .select("id, city, price, rooms")
    .eq("status", "available");

  // STRICT filters as per instructions
  if (filters.city) queryBuilder = queryBuilder.ilike("city", \`%\${filters.city}%\`);
  if (filters.max_price) queryBuilder = queryBuilder.lte("price", filters.max_price);
  
  const roomsNum = parseRooms(filters.min_rooms);
  if (roomsNum) queryBuilder = queryBuilder.gte("rooms", roomsNum);

  if (filters.project_name) queryBuilder = queryBuilder.ilike("project", \`%\${filters.project_name}%\`);

  const { data: filteredUnits, error } = await queryBuilder.limit(50);
  
  if (!filteredUnits || filteredUnits.length === 0) {
     return null;
  }

  const available = filteredUnits.filter((u: any) => !exclude_ids.includes(u.id));
  if (available.length === 0) return null;

  return await serveUnit(supabase, available[0].id, token, chatId, lang, sessionId, botId);
}

export async function handleSearchUnits(
  sessionId: string | null,
  chatId: string,
  filters: SearchUnitsArgs,
  exclude_ids: number[],
  token: string,
  botId: string,
  lang: Lang
) {
  const supabase = getServerClient();
  await sendTyping(token, chatId);
  
  // Decide strategy
  const { count } = await supabase.from("units").select("*", { count: "exact", head: true });
  
  // Reuse logic
  const res = await handleSqlSearch(supabase, Number(chatId), filters, exclude_ids, token, botId, lang, sessionId);
  
  if (!res) {
    // If SQL fails, maybe try AI if small DB? 
    // For now, if SQL returns nothing, we return nothing.
    // The LLM's "If tool output says..." rule will handle the apology if we return explicit "null" or "Found 0".
    
    // We'll send a message if absolutely nothing found so the user isn't left hanging IF the LLM didn't verify first.
    // But per instructions "If no properties are found, apologize".
    // We should probably inject this into the next system prompt, but we are in a tool call.
    // Action: Send a generic "Not found" info message.
    await sendMessage(token, chatId, lang === 'ru' ? "🔍 Подходящих вариантов не найдено." : "🔍 No matching units found.");
  }
}
