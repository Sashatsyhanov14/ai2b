import { getServerClient } from "@/lib/supabaseClient";
import { SearchUnitsArgs } from "../types";

// Helper to parse "2+1" -> 2
function parseRooms(roomStr?: string | null): number | null {
  if (!roomStr) return null;
  const match = roomStr.match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export async function handleSearchUnits(
  _sessionId: string | null,
  _chatId: string,
  filters: SearchUnitsArgs,
  _exclude_ids: number[],
  _token: string,
  _botId: string,
  _lang: any
): Promise<string> {
  const supabase = getServerClient();

  let queryBuilder = supabase
    .from("units")
    .select("id, city, price, rooms, project, floor, floors_total, area_m2, features")
    .eq("status", "available");

  // STRICT SQL LOGIC
  if (filters.city) queryBuilder = queryBuilder.ilike("city", "%" + filters.city + "%");
  if (filters.max_price) queryBuilder = queryBuilder.lte("price", filters.max_price);

  const roomsNum = parseRooms(filters.min_rooms);
  if (roomsNum) queryBuilder = queryBuilder.gte("rooms", roomsNum);

  if (filters.project_name) queryBuilder = queryBuilder.ilike("project", "%" + filters.project_name + "%");

  const { data: units, error } = await queryBuilder.limit(10);

  if (error) {
    console.error("Search Error:", error);
    return JSON.stringify({ status: "error", message: "Database error" });
  }

  if (!units || units.length === 0) {
    return JSON.stringify({ status: "success", count: 0, units: [] });
  }

  // Return raw JSON for the AI to process
  return JSON.stringify({
    status: "success",
    count: units.length,
    units: units
  });
}
