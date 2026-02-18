export type Lang = "ru" | "en" | "tr" | "ar";

export type ToolAction =
    | {
        tool: "search_units";
        args: SearchUnitsArgs;
    }
    | {
        tool: "submit_lead";
        args: SubmitLeadArgs;
    }
    | {
        tool: "get_company_info";
        args: {};
    };

export type SearchUnitsArgs = {
    city: string; // Required
    max_price?: number | null;
    min_rooms?: string | null; // "1+1", "2+1"
    project_name?: string | null;
    exclude_ids?: string[] | null;
};

export type SubmitLeadArgs = {
    user_phone: string; // Required
    user_name?: string;
    interest_summary: string; // Required
};

export type LlmPayload = {
    reply?: string;
    state?: {
        [key: string]: any;
    } | null;
    actions?: ToolAction[];
};

export type LLMMessage = { role: "system" | "user" | "assistant"; content: string };
