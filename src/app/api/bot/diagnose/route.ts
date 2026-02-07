import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckResult = {
    status: "ok" | "error";
    message?: string;
};

function maskKey(key: string | undefined): string {
    if (!key) return "(not set)";
    if (key.length < 12) return "***";
    return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

async function checkTelegram(token: string | undefined): Promise<CheckResult & { webhookInfo?: any }> {
    if (!token) {
        return { status: "error", message: "TELEGRAM_BOT_TOKEN is not set" };
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
            method: "GET",
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return { status: "error", message: `Telegram API error: ${res.status} ${text}` };
        }
        const json = await res.json();
        if (!json.ok) {
            return { status: "error", message: `Telegram response not ok: ${JSON.stringify(json)}` };
        }

        // Also get webhook info
        let webhookInfo: any = null;
        try {
            const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
                method: "GET",
            });
            if (whRes.ok) {
                const whJson = await whRes.json();
                if (whJson.ok) {
                    webhookInfo = whJson.result;
                }
            }
        } catch {
            // ignore webhook info errors
        }

        return {
            status: "ok",
            message: `Bot username: @${json.result?.username}`,
            webhookInfo
        };
    } catch (e: any) {
        return { status: "error", message: `Telegram fetch error: ${e?.message || e}` };
    }
}

async function checkOpenRouter(apiKey: string | undefined): Promise<CheckResult> {
    if (!apiKey) {
        return { status: "error", message: "OPENROUTER_API_KEY is not set" };
    }
    try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return { status: "error", message: `OpenRouter API error: ${res.status} ${text}` };
        }
        return { status: "ok", message: "OpenRouter API key is valid" };
    } catch (e: any) {
        return { status: "error", message: `OpenRouter fetch error: ${e?.message || e}` };
    }
}

async function checkSupabase(): Promise<CheckResult> {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SERVICE_ROLE ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
        return { status: "error", message: "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is not set" };
    }
    if (!key) {
        return { status: "error", message: "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY is not set" };
    }

    try {
        // Simple health check: query sessions table count
        const { getServerClient } = await import("@/lib/supabaseClient");
        const sb = getServerClient();
        const { count, error } = await sb
            .from("sessions")
            .select("*", { count: "exact", head: true });

        if (error) {
            return { status: "error", message: `Supabase query error: ${error.message}` };
        }
        return { status: "ok", message: `Supabase connected. Sessions count: ${count ?? 0}` };
    } catch (e: any) {
        return { status: "error", message: `Supabase error: ${e?.message || e}` };
    }
}

export async function GET() {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openrouterModel = process.env.OPENROUTER_MODEL ?? "openrouter/auto";

    const [telegramResult, openrouterResult, supabaseResult] = await Promise.all([
        checkTelegram(telegramToken),
        checkOpenRouter(openrouterKey),
        checkSupabase(),
    ]);

    const allOk =
        telegramResult.status === "ok" &&
        openrouterResult.status === "ok" &&
        supabaseResult.status === "ok";

    return NextResponse.json({
        overall: allOk ? "ok" : "error",
        checks: {
            telegram: {
                ...telegramResult,
                token: maskKey(telegramToken),
            },
            openrouter: {
                ...openrouterResult,
                apiKey: maskKey(openrouterKey),
                model: openrouterModel,
            },
            supabase: supabaseResult,
        },
        timestamp: new Date().toISOString(),
    });
}
