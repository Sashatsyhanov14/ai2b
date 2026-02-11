import { getServerClient } from "@/lib/supabaseClient";

export type FunnelStage = "sandbox" | "warmup" | "handoff" | "reactivation";

export interface SessionScore {
    id: string;
    session_id: string;
    score: number;
    stage: FunnelStage;
    last_interaction_at: string;
    lead_created: boolean;
    created_at: string;
    updated_at: string;
}

// Scoring rules - points awarded for each action type
export const SCORING_RULES = {
    // Low engagement
    view_first_property: 1,
    apply_filter: 1,
    ask_simple_question: 1,

    // Medium engagement
    view_property_again: 2, // Viewing 2nd+ time
    click_depth_button: 1, // Photos, location, price
    ask_detailed_question: 2, // Finance, process, legal

    // High engagement (buying signals)
    view_same_property_3x: 2, // Strong focus
    ask_about_financing: 3,
    ask_about_process: 2,
    hard_action: 3, // "Contact", "Book viewing"

    // Cap to prevent gaming
    max_same_action: 2, // Same action type can't score more than 2x
    max_random_views: 3, // Viewing many random properties caps at 3 points
} as const;

// Stage thresholds
export const STAGE_THRESHOLDS = {
    sandbox: { min: 0, max: 2 },
    warmup: { min: 3, max: 4 },
    handoff: { min: 5, max: Infinity },
} as const;

/**
 * Get or create session score
 */
export async function getSessionScore(sessionId: string): Promise<SessionScore | null> {
    const sb = getServerClient();

    const { data, error } = await sb
        .from("session_scores")
        .select("*")
        .eq("session_id", sessionId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error fetching session score:", error);
        return null;
    }

    // Create if doesn't exist
    if (!data) {
        const { data: newScore, error: createError } = await sb
            .from("session_scores")
            .insert({
                session_id: sessionId,
                score: 0,
                stage: "sandbox",
                last_interaction_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (createError) {
            console.error("Error creating session score:", createError);
            return null;
        }

        return newScore;
    }

    return data;
}

/**
 * Update session score and determine new stage
 */
export async function updateSessionScore(
    sessionId: string,
    actionType: string,
    points: number
): Promise<{ score: number; stage: FunnelStage; stageChanged: boolean } | null> {
    const sb = getServerClient();

    // Get current score
    const currentScore = await getSessionScore(sessionId);
    if (!currentScore) return null;

    // Calculate new score
    const newScore = currentScore.score + points;

    // Determine new stage
    const oldStage = currentScore.stage;
    let newStage: FunnelStage = "sandbox";

    if (newScore >= STAGE_THRESHOLDS.handoff.min) {
        newStage = "handoff";
    } else if (newScore >= STAGE_THRESHOLDS.warmup.min) {
        newStage = "warmup";
    }

    // Update database
    const { data, error } = await sb
        .from("session_scores")
        .update({
            score: newScore,
            stage: newStage,
            last_interaction_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .select()
        .single();

    if (error) {
        console.error("Error updating session score:", error);
        return null;
    }

    return {
        score: newScore,
        stage: newStage,
        stageChanged: oldStage !== newStage,
    };
}

/**
 * Mark lead as created for this session
 */
export async function markLeadCreated(sessionId: string): Promise<void> {
    const sb = getServerClient();

    await sb
        .from("session_scores")
        .update({ lead_created: true })
        .eq("session_id", sessionId);
}

/**
 * Get sessions that need reactivation
 * (warm/hot leads that went silent for 24h+)
 */
export async function getStaleLeads(hoursInactive: number = 24): Promise<SessionScore[]> {
    const sb = getServerClient();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursInactive);

    const { data, error } = await sb
        .from("session_scores")
        .select("*")
        .in("stage", ["warmup", "handoff"])
        .eq("lead_created", false)
        .lt("last_interaction_at", cutoffTime.toISOString())
        .order("last_interaction_at", { ascending: true })
        .limit(50);

    if (error) {
        console.error("Error fetching stale leads:", error);
        return [];
    }

    return data || [];
}

/**
 * Schedule reactivation message
 */
export async function scheduleReactivation(
    sessionId: string,
    attemptNumber: number,
    scheduledAt: Date
): Promise<void> {
    const sb = getServerClient();

    await sb
        .from("reactivation_queue")
        .insert({
            session_id: sessionId,
            attempt_number: attemptNumber,
            scheduled_at: scheduledAt.toISOString(),
            status: "pending",
        });
}

/**
 * Get pending reactivation messages
 */
export async function getPendingReactivations() {
    const sb = getServerClient();
    const now = new Date().toISOString();

    const { data, error } = await sb
        .from("reactivation_queue")
        .select(`
      *,
      session:sessions(*)
    `)
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .limit(20);

    if (error) {
        console.error("Error fetching pending reactivations:", error);
        return [];
    }

    return data || [];
}

/**
 * Mark reactivation as sent
 */
export async function markReactivationSent(
    reactivationId: string,
    messageSent: string
): Promise<void> {
    const sb = getServerClient();

    await sb
        .from("reactivation_queue")
        .update({
            status: "sent",
            message_sent: messageSent,
            sent_at: new Date().toISOString(),
        })
        .eq("id", reactivationId);
}

/**
 * Mark reactivation as responded (user came back)
 */
export async function markReactivationResponded(sessionId: string): Promise<void> {
    const sb = getServerClient();

    await sb
        .from("reactivation_queue")
        .update({ status: "responded" })
        .eq("session_id", sessionId)
        .in("status", ["pending", "sent"]);
}
