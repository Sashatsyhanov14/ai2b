export type ToolAction =
  | { tool: "search_database"; args: SearchArgs }
  | { tool: "save_lead"; args: SaveLeadArgs }
  | { tool: "get_photos"; args: GetPhotosArgs }
  | { tool: "get_agency_info"; args: {} };

export type SearchArgs = {
  city?: string;
  price?: number;
  rooms?: string;
  project?: string;
  query?: string; // Optional raw query if needed
};

export type SaveLeadArgs = {
  phone: string;
  name?: string;
  info?: string; // summary of interest
};

export type GetPhotosArgs = {
  unit_id: number | string;
};

export type LlmPayload = {
  reply?: string;
  actions?: ToolAction[];
};

export type MessageRole = "system" | "user" | "assistant" | "tool";

export type LLMMessage = {
  role: MessageRole;
  content: string;
  name?: string; // for tool results
};
