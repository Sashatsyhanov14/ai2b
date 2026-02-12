-- Add snoozed_until field to leads table
-- This allows managers to postpone a lead for 24 hours

ALTER TABLE leads 
ADD COLUMN snoozed_until TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient querying of snoozed leads
CREATE INDEX IF NOT EXISTS idx_leads_snoozed_until ON leads(snoozed_until) WHERE snoozed_until IS NOT NULL;

-- Comment
COMMENT ON COLUMN leads.snoozed_until IS 'Timestamp when lead should reappear in the top of the list (snooze until)';
