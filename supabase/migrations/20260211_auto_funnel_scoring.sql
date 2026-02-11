-- Auto-Funnel Lead Scoring System Tables

-- Session Scores (tracks engagement level)
CREATE TABLE IF NOT EXISTS session_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0 CHECK (score >= 0),
  stage TEXT DEFAULT 'sandbox' CHECK (stage IN ('sandbox', 'warmup', 'handoff', 'reactivation')),
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  lead_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by session
CREATE INDEX IF NOT EXISTS idx_session_scores_session_id ON session_scores(session_id);

-- Index for reactivation queries
CREATE INDEX IF NOT EXISTS idx_session_scores_reactivation 
ON session_scores(last_interaction_at, stage, lead_created) 
WHERE stage IN ('warmup', 'handoff') AND lead_created = false;

-- Reactivation Queue (automated follow-ups)
CREATE TABLE IF NOT EXISTS reactivation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 3),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded', 'expired')),
  message_sent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  
  UNIQUE(session_id, attempt_number)
);

-- Index for cron job queries
CREATE INDEX IF NOT EXISTS idx_reactivation_queue_scheduled 
ON reactivation_queue(scheduled_at, status) 
WHERE status = 'pending';

-- Trigger to update updated_at on session_scores
CREATE OR REPLACE FUNCTION update_session_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_scores_updated_at
BEFORE UPDATE ON session_scores
FOR EACH ROW
EXECUTE FUNCTION update_session_scores_updated_at();

-- Add score_data JSONB column to sessions for action history
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS score_data JSONB DEFAULT '{}'::jsonb;

-- Index for action history queries
CREATE INDEX IF NOT EXISTS idx_sessions_score_data ON sessions USING gin(score_data);

COMMENT ON TABLE session_scores IS 'Tracks user engagement score and funnel stage';
COMMENT ON TABLE reactivation_queue IS 'Scheduled automated follow-up messages for dormant leads';
COMMENT ON COLUMN session_scores.score IS 'Cumulative engagement points (0-10+)';
COMMENT ON COLUMN session_scores.stage IS 'Funnel stage: sandbox (0-2) → warmup (3-4) → handoff (5+)';
COMMENT ON COLUMN reactivation_queue.attempt_number IS 'Follow-up attempt (max 3)';
