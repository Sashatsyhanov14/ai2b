export type ToolAction =
  | { tool: "search_database"; args: SearchArgs }
  | { tool: "save_lead"; args: SaveLeadArgs }
  | { tool: "get_photos"; args: GetPhotosArgs }
  | { tool: "get_unit_description"; args: { unit_id: number | string } }
  | { tool: "get_agency_info"; args: {} };

export type SearchArgs = {
  id?: string;
  intent?: "sale" | "rent";
  search_keywords?: string[];
  price?: number;     // Maximum budget (lte)
  price_min?: number; // Minimum budget (gte) — used for VNJ requirements, investment minimums
  rooms?: string;
  project?: string;
  query?: string;
};

export type SaveLeadArgs = {
  phone: string;
  name?: string;
  info?: string;           // summary of interest
  email?: string;
  budget?: number;
  interested_units?: string[];
  temperature?: string;
  urgency?: string;        // ASAP / 1-3 months / etc.
  purpose?: string;        // ПРОЖИВАНИЕ / ИНВЕСТИЦИИ / ВНЖ / СДАЧА В АРЕНДУ
  unit_type?: string;      // АПАРТАМЕНТ / ВИЛЛА / ПЕНТХАУС
  preferred_areas?: string[]; // preferred cities/districts
  manager_hints?: string;  // AI tips for the sales manager
  client_summary?: string; // AI-written 2-3 sentence profile of the client
  language?: string;       // detected client language: 'ru', 'tr', 'en', etc.
};

export type GetPhotosArgs = {
  unit_id: number | string;
};

export type LlmPayload = {
  reply?: string;
  manager_message?: string | null;
  actions?: ToolAction[];
};

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type LLMMessage = {
  role: MessageRole;
  content: string;
  name?: string; // for tool results
};
