import { getServerClient } from "@/lib/supabaseClient";

export async function handleGetDescription(args: { unit_id: number | string }): Promise<string> {
    const supabase = getServerClient();

    const { data, error } = await supabase
        .from("units")
        .select("description")
        .eq("id", args.unit_id)
        .single();

    if (error || !data) {
        console.error("Get Description Error:", error);
        return JSON.stringify({ status: "error", message: "Описание не найдено." });
    }

    return JSON.stringify({
        status: "success",
        description: data.description || "Подробное описание отсутствует."
    });
}
