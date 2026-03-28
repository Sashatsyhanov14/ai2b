
import { getServerClient } from "@/lib/supabaseClient";

export async function handleGetAgencyInfo(lang: string = 'ru'): Promise<string> {
    const supabase = getServerClient();

    const { data: entries, error } = await supabase
        .from('faq')
        .select('question, answer, i18n, category')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error("Get Agency Info Error:", error);
        return "Error retrieving agency info.";
    }

    if (!entries || entries.length === 0) {
        return "No agency information found.";
    }

    // Combine text using i18n
    const combined = entries
        .map(e => {
            // Support backward compatibility or direct i18n reading
            let q = e.question;
            let a = e.answer;
            
            if (e.i18n && typeof e.i18n === 'object') {
                const i18nData = (e.i18n as any)[lang];
                if (i18nData) {
                    q = i18nData.question || q;
                    a = i18nData.answer || a;
                }
            }
            
            return `### [${e.category?.toUpperCase() || 'GENERAL'}] ${q}\n${a}`;
        })
        .join("\n\n");

    return combined.substring(0, 15000); // explicit cap
}
