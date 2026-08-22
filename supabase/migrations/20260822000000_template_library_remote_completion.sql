-- Forward-only completion for the remotely present template-library baseline.
-- The original migrations remain under lib/supabase/migrations for audit/history.
-- This migration deliberately does not recreate core tables or starter rows.

ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS slug VARCHAR(180),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(120),
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS target_provider VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tier SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS sensitive_data_level VARCHAR(30) NOT NULL DEFAULT 'Public',
  ADD COLUMN IF NOT EXISTS technical BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_heavy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cadence VARCHAR(30) NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS audience VARCHAR(30) NOT NULL DEFAULT 'B2B',
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(80),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';

ALTER TABLE template_steps
  ADD COLUMN IF NOT EXISTS stage_id UUID,
  ADD COLUMN IF NOT EXISTS component_id UUID,
  ADD COLUMN IF NOT EXISTS provider_rationale TEXT,
  ADD COLUMN IF NOT EXISTS sensitivity VARCHAR(30) NOT NULL DEFAULT 'Public',
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS helper_text TEXT,
  ADD COLUMN IF NOT EXISTS example_answer TEXT;

ALTER TABLE client_instances
  ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

CREATE TABLE IF NOT EXISTS workflow_template_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage_order INT NOT NULL,
  visibility VARCHAR(30) NOT NULL DEFAULT 'client',
  completion_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, stage_order)
);

CREATE TABLE IF NOT EXISTS reusable_workflow_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  component_type VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Universal',
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS step_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  option_order INT NOT NULL,
  UNIQUE (step_id, option_order)
);

CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  operator VARCHAR(30) NOT NULL,
  value JSONB NOT NULL,
  target_step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL DEFAULT 'show'
);

CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  accepted_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_files SMALLINT NOT NULL DEFAULT 1,
  max_size_bytes BIGINT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sensitivity VARCHAR(30) NOT NULL DEFAULT 'Confidential',
  due_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status VARCHAR(30) NOT NULL DEFAULT 'requested'
);

CREATE TABLE IF NOT EXISTS approval_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  approver_role VARCHAR(80) NOT NULL,
  approval_type VARCHAR(40) NOT NULL DEFAULT 'sign_off',
  is_required BOOLEAN NOT NULL DEFAULT true,
  rejection_behavior VARCHAR(40) NOT NULL DEFAULT 'request_revision'
);

CREATE TABLE IF NOT EXISTS workflow_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  depends_on_stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocking BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (stage_id, depends_on_stage_id)
);

CREATE TABLE IF NOT EXISTS workflow_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_bundle_templates (
  bundle_id UUID NOT NULL REFERENCES workflow_bundles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  recommended_order INT NOT NULL,
  PRIMARY KEY (bundle_id, template_id)
);

CREATE TABLE IF NOT EXISTS workflow_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_steps_stage_fk') THEN
    ALTER TABLE template_steps ADD CONSTRAINT template_steps_stage_fk
      FOREIGN KEY (stage_id) REFERENCES workflow_template_stages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_steps_component_fk') THEN
    ALTER TABLE template_steps ADD CONSTRAINT template_steps_component_fk
      FOREIGN KEY (component_id) REFERENCES reusable_workflow_components(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_templates_subcategory ON workflow_templates(subcategory);
CREATE INDEX IF NOT EXISTS idx_templates_starter_completion ON workflow_templates(is_starter, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_starter_slug
  ON workflow_templates(slug) WHERE is_starter = true AND slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_stages_template ON workflow_template_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_step_options_step ON step_options(step_id);

ALTER TABLE workflow_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reusable_workflow_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_bundle_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Template stages follow template visibility" ON workflow_template_stages;
CREATE POLICY "Template stages follow template visibility" ON workflow_template_stages FOR SELECT
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() OR is_starter = true));
DROP POLICY IF EXISTS "Template stages are writable for owned templates" ON workflow_template_stages;
CREATE POLICY "Template stages are writable for owned templates" ON workflow_template_stages FOR ALL
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() AND is_starter = false))
WITH CHECK (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() AND is_starter = false));

DROP POLICY IF EXISTS "Components are readable by providers" ON reusable_workflow_components;
CREATE POLICY "Components are readable by providers" ON reusable_workflow_components FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Step metadata follows template visibility" ON step_options;
CREATE POLICY "Step metadata follows template visibility" ON step_options FOR SELECT
USING (step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() OR wt.is_starter = true));
DROP POLICY IF EXISTS "Step metadata is writable for owned templates" ON step_options;
CREATE POLICY "Step metadata is writable for owned templates" ON step_options FOR ALL
USING (step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false))
WITH CHECK (step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false));

DROP POLICY IF EXISTS "Workflow conditions follow template visibility" ON workflow_conditions;
CREATE POLICY "Workflow conditions follow template visibility" ON workflow_conditions FOR SELECT
USING (source_step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() OR wt.is_starter = true));
DROP POLICY IF EXISTS "Workflow conditions are writable for owned templates" ON workflow_conditions;
CREATE POLICY "Workflow conditions are writable for owned templates" ON workflow_conditions FOR ALL
USING (source_step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false))
WITH CHECK (source_step_id IN (SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false));

DROP POLICY IF EXISTS "Document metadata follows stage visibility" ON document_requests;
CREATE POLICY "Document metadata follows stage visibility" ON document_requests FOR SELECT
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() OR wt.is_starter = true));
DROP POLICY IF EXISTS "Document metadata is writable for owned templates" ON document_requests;
CREATE POLICY "Document metadata is writable for owned templates" ON document_requests FOR ALL
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false))
WITH CHECK (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false));

DROP POLICY IF EXISTS "Approval metadata follows stage visibility" ON approval_gates;
CREATE POLICY "Approval metadata follows stage visibility" ON approval_gates FOR SELECT
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() OR wt.is_starter = true));
DROP POLICY IF EXISTS "Approval metadata is writable for owned templates" ON approval_gates;
CREATE POLICY "Approval metadata is writable for owned templates" ON approval_gates FOR ALL
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false))
WITH CHECK (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false));

DROP POLICY IF EXISTS "Dependencies follow template visibility" ON workflow_dependencies;
CREATE POLICY "Dependencies follow template visibility" ON workflow_dependencies FOR SELECT
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() OR wt.is_starter = true));
DROP POLICY IF EXISTS "Dependencies are writable for owned templates" ON workflow_dependencies;
CREATE POLICY "Dependencies are writable for owned templates" ON workflow_dependencies FOR ALL
USING (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false))
WITH CHECK (stage_id IN (SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id WHERE wt.organization_id = get_auth_org_id() AND wt.is_starter = false));

DROP POLICY IF EXISTS "Versions follow template visibility" ON workflow_template_versions;
CREATE POLICY "Versions follow template visibility" ON workflow_template_versions FOR SELECT
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() OR is_starter = true));
DROP POLICY IF EXISTS "Versions are writable for owned templates" ON workflow_template_versions;
CREATE POLICY "Versions are writable for owned templates" ON workflow_template_versions FOR INSERT
WITH CHECK (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() AND is_starter = false));

DROP POLICY IF EXISTS "Bundles are readable by providers" ON workflow_bundles;
CREATE POLICY "Bundles are readable by providers" ON workflow_bundles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Bundle templates are readable by providers" ON workflow_bundle_templates;
CREATE POLICY "Bundle templates are readable by providers" ON workflow_bundle_templates FOR SELECT
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() OR is_starter = true));

-- Backfill only the six existing global starters. No starter INSERT occurs here.
UPDATE workflow_templates SET slug = 'standard-client-onboarding', category = 'Client Onboarding', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'General'), target_provider = COALESCE(target_provider, 'Agencies and service providers'), estimated_minutes = COALESCE(estimated_minutes, 15), tags = CASE WHEN tags = '[]'::jsonb THEN '["Beginner-friendly", "B2B"]'::jsonb ELSE tags END, version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'Standard Client Onboarding';
UPDATE workflow_templates SET slug = 'agency-client-onboarding', category = 'Agency', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'Agency'), target_provider = COALESCE(target_provider, 'Agencies'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["High-touch", "Multi-stakeholder", "B2B"]'::jsonb ELSE tags END, version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'Agency Client Onboarding';
UPDATE workflow_templates SET slug = 'service-business-onboarding', category = 'Service Business', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'Recurring services'), target_provider = COALESCE(target_provider, 'Service businesses'), estimated_minutes = COALESCE(estimated_minutes, 20), cadence = 'recurring', version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'Service Business Onboarding';
UPDATE workflow_templates SET slug = 'project-kickoff', category = 'Project Kickoff', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'Discovery'), target_provider = COALESCE(target_provider, 'Freelancers and project teams'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["One-time project", "Multi-stakeholder"]'::jsonb ELSE tags END, version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'Project Kickoff';
UPDATE workflow_templates SET slug = 'new-customer-onboarding', category = 'New Customer', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'Implementation'), target_provider = COALESCE(target_provider, 'SaaS and service providers'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["B2B", "Beginner-friendly"]'::jsonb ELSE tags END, version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'New Customer Onboarding';
UPDATE workflow_templates SET slug = 'document-collection', category = 'Document Collection', purpose = COALESCE(purpose, description), subcategory = COALESCE(subcategory, 'Documents'), target_provider = COALESCE(target_provider, 'Professional services'), estimated_minutes = COALESCE(estimated_minutes, 15), document_heavy = true, tags = CASE WHEN tags = '[]'::jsonb THEN '["Document-heavy", "File-heavy"]'::jsonb ELSE tags END, version = COALESCE(version, 1), status = COALESCE(status, 'active') WHERE organization_id IS NULL AND is_starter = true AND title = 'Document Collection';

DO $$
DECLARE
  starter RECORD;
  stage_context UUID;
  stage_requirements UUID;
  stage_confirmation UUID;
  step_record RECORD;
  option_index INT;
BEGIN
  INSERT INTO reusable_workflow_components (name, component_type, category, description)
  SELECT name, component_type, category, description
  FROM (VALUES
    ('Company profile', 'text_group', 'Universal', 'Business identity and context.'),
    ('Primary contact', 'contact', 'Universal', 'Main client contact and role.'),
    ('Project goals', 'long_text', 'Universal', 'Desired outcomes and success criteria.'),
    ('Stakeholder directory', 'contact_group', 'Universal', 'People involved in delivery and approval.'),
    ('Existing assets', 'file_group', 'Creative', 'Existing brand, content, or project assets.'),
    ('Technical access instructions', 'secure_instruction', 'Technology', 'Safe access confirmation instructions without collecting passwords.'),
    ('Timeline and milestones', 'text_group', 'Universal', 'Target dates, milestones, and dependencies.'),
    ('Approval authority', 'contact', 'Universal', 'Person authorized to approve deliverables.'),
    ('Final confirmation', 'confirmation', 'Universal', 'Client confirms the information is complete.')
  ) AS component(name, component_type, category, description)
  WHERE NOT EXISTS (SELECT 1 FROM reusable_workflow_components existing WHERE existing.name = component.name AND existing.component_type = component.component_type);

  FOR starter IN SELECT id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title IN ('Standard Client Onboarding', 'Agency Client Onboarding', 'Service Business Onboarding', 'Project Kickoff', 'New Customer Onboarding', 'Document Collection') LOOP
    SELECT id INTO stage_context FROM workflow_template_stages WHERE template_id = starter.id AND stage_order = 0;
    IF stage_context IS NULL THEN
      INSERT INTO workflow_template_stages (template_id, name, description, stage_order) VALUES (starter.id, 'Context and goals', 'Understand the engagement and desired outcome.', 0) RETURNING id INTO stage_context;
    END IF;
    SELECT id INTO stage_requirements FROM workflow_template_stages WHERE template_id = starter.id AND stage_order = 1;
    IF stage_requirements IS NULL THEN
      INSERT INTO workflow_template_stages (template_id, name, description, stage_order) VALUES (starter.id, 'Requirements and stakeholders', 'Collect requirements, people, and supporting information.', 1) RETURNING id INTO stage_requirements;
    END IF;
    SELECT id INTO stage_confirmation FROM workflow_template_stages WHERE template_id = starter.id AND stage_order = 2;
    IF stage_confirmation IS NULL THEN
      INSERT INTO workflow_template_stages (template_id, name, description, stage_order) VALUES (starter.id, 'Files and confirmation', 'Gather documents and confirm the next step.', 2) RETURNING id INTO stage_confirmation;
    END IF;

    UPDATE template_steps SET stage_id = CASE WHEN step_order < 2 THEN stage_context WHEN step_order < 4 THEN stage_requirements ELSE stage_confirmation END WHERE template_id = starter.id AND stage_id IS NULL;
    INSERT INTO workflow_dependencies (stage_id, depends_on_stage_id, condition, blocking) VALUES (stage_requirements, stage_context, '{}'::jsonb, true), (stage_confirmation, stage_requirements, '{}'::jsonb, true) ON CONFLICT DO NOTHING;
    INSERT INTO approval_gates (stage_id, approver_role, approval_type, is_required, rejection_behavior) SELECT stage_confirmation, 'provider', 'sign_off', true, 'request_revision' WHERE NOT EXISTS (SELECT 1 FROM approval_gates WHERE stage_id = stage_confirmation);

    FOR step_record IN SELECT id, title, type, validation_rules, step_order, stage_id FROM template_steps WHERE template_id = starter.id LOOP
      IF step_record.type = 'file_upload' THEN
        INSERT INTO document_requests (stage_id, name, description, accepted_types, max_files, is_required, sensitivity)
        SELECT step_record.stage_id, step_record.title, COALESCE(step_record.title, 'Requested file'), '["application/pdf", "image/*", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]'::jsonb, 1, true, 'Confidential'
        WHERE NOT EXISTS (SELECT 1 FROM document_requests WHERE stage_id = step_record.stage_id AND name = step_record.title);
      END IF;
      IF step_record.type IN ('single_select', 'multi_select') AND jsonb_typeof(step_record.validation_rules->'options') = 'array' THEN
        option_index := 0;
        FOR option_index IN 0..jsonb_array_length(step_record.validation_rules->'options') - 1 LOOP
          INSERT INTO step_options (step_id, label, value, option_order)
          VALUES (step_record.id, step_record.validation_rules->'options'->>option_index, step_record.validation_rules->'options'->>option_index, option_index)
          ON CONFLICT DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- A single reusable kit is created only if absent; no templates are duplicated.
INSERT INTO workflow_bundles (name, description)
SELECT 'Website Project Kit', 'Core discovery, kickoff, document collection, approval, and handover workflows.'
WHERE NOT EXISTS (SELECT 1 FROM workflow_bundles WHERE name = 'Website Project Kit');
INSERT INTO workflow_bundle_templates (bundle_id, template_id, recommended_order)
SELECT bundle.id, template.id, CASE template.title WHEN 'Project Kickoff' THEN 1 WHEN 'Standard Client Onboarding' THEN 2 ELSE 3 END
FROM workflow_bundles bundle
JOIN workflow_templates template ON template.organization_id IS NULL AND template.is_starter = true
WHERE bundle.name = 'Website Project Kit'
  AND template.title IN ('Project Kickoff', 'Standard Client Onboarding', 'Document Collection')
ON CONFLICT DO NOTHING;
