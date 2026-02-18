import { getServerClient } from "@/lib/supabaseClient";

export async function loadCompanyContext(): Promise<string> {
    try {
        const sb = getServerClient();
        const { data: files } = await sb
            .from("company_files")
            .select("name, description, content_text")
            .eq("is_active", true);

        if (files && files.length > 0) {
            return "\n\nCOMPANY KNOWLEDGE BASE:\n" + files
                .map((f: any) => {
                    const content = f.content_text || f.description || "";
                    if (!content) return "";
                    return `[${f.name}]: ${content.slice(0, 1000)}`;
                })
                .filter(Boolean)
                .join("\n\n");
        }
    } catch (e) {
        console.error("Failed to load company context:", e);
    }
    return "";
}

export async function loadGlobalInstructions(lang: string): Promise<string> {
    let instructions = "";
    try {
        const sb = getServerClient();
        const { data: rules } = await sb
            .from("bot_instructions")
            .select("text")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (rules && rules.length > 0) {
            const formattedRules = rules
                .map((r, i) => `${i + 1}. ${r.text}`)
                .join("\n");
            instructions = `GLOBAL INSTRUCTIONS AND RULES (STRICTLY FOLLOW):\n${formattedRules}\n\n`;
        }

        // Translator Layer
        instructions += `
CRITICAL TRANSLATOR LAYER:
1. You MUST answer in the same language the USER is speaking (e.g. if user writes in French, answer in French).
2. The system 'lang' variable is ${lang}, use it for fallback logic, but priority is User's Chat Language which you must DETECT.
3. If database content is in Russian/English, TRANSLATE it on the fly to the user's current language.
4. DO NOT mix languages (e.g. no Russian words in Turkish text). All property descriptions must be fully translated.
`;
    } catch (e) {
        console.error("Failed to load global instructions:", e);
    }
    return instructions;
}
