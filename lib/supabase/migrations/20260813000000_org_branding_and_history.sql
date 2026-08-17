-- Milestone 5: Organization branding fields + a real audit trail table.
--
-- Branding: the product vision calls for the client portal to reflect the
-- provider's logo/brand color everywhere. organizations.logo_url already
-- existed but was never actually surfaced anywhere in the app — this adds
-- the missing brand_color + support_email columns so there's something to
-- edit and render.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);

-- Audit trail: every status change on a client_instances row, recorded
-- automatically via trigger so it can't be forgotten by future code paths
-- (the way the "completed"/"in_review" transitions were forgotten before).
CREATE TABLE instance_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES client_instances(id) ON DELETE CASCADE,
  from_status onboarding_status,
  to_status onboarding_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_instance ON instance_status_history(instance_id, created_at);

ALTER TABLE instance_status_history ENABLE ROW LEVEL SECURITY;

-- Readable by anyone in the owning organization (via the instance's org),
-- same scoping pattern as every other table.
CREATE POLICY "org members can view their instance history"
  ON instance_status_history FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM client_instances WHERE organization_id = get_auth_org_id()
    )
  );

-- Inserts only ever happen via the trigger below (SECURITY DEFINER), so no
-- direct INSERT policy is granted to authenticated/anon roles.

CREATE OR REPLACE FUNCTION log_instance_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO instance_status_history (instance_id, from_status, to_status)
    VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_instance_status_history
  AFTER INSERT OR UPDATE ON client_instances
  FOR EACH ROW
  EXECUTE FUNCTION log_instance_status_change();

-- AI review summary: best-effort, provider-agnostic. Populated only when a
-- provider key (GEMINI_API_KEY or OPENAI_API_KEY) is configured; stays NULL
-- otherwise. See lib/ai/provider.ts for the graceful-fallback logic —
-- absence of a key is expected in dev/most deployments, not an error state.
ALTER TABLE client_instances
  ADD COLUMN IF NOT EXISTS ai_summary JSONB;
