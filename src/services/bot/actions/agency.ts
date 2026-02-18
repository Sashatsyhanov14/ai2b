
import { getServerClient } from "@/lib/supabaseClient";

export async function handleGetAgencyInfo(): Promise<string> {
    const supabase = getServerClient();

    const { data: entries, error } = await supabase
        .from('company_files')
        .select('name, content_text')
        .eq('is_active', true)
        .limit(5);

    if (error) {
        console.error("Get Agency Info Error:", error);
        return "Error retrieving agency info.";
    }

    if (!entries || entries.length === 0) {
        return "No agency information found.";
    }

    // Combine text (limit length for Haiku context)
    const combined = entries
        .map(e => `### ${e.name}\n${e.content_text?.substring(0, 2000) || ''}`)
        .join("\n\n");

    return combined.substring(0, 10000); // explicit cap
}
