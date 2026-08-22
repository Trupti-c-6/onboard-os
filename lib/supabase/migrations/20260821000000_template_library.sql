-- Add global, read-only starter templates to the existing template model.
ALTER TABLE workflow_templates
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'Custom',
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT false,

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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  component_type VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Universal',
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS step_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  option_order INT NOT NULL,
  UNIQUE (step_id, option_order)
);

CREATE TABLE IF NOT EXISTS workflow_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  operator VARCHAR(30) NOT NULL,
  value JSONB NOT NULL,
  target_step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL DEFAULT 'show'
);

CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  approver_role VARCHAR(80) NOT NULL,
  approval_type VARCHAR(40) NOT NULL DEFAULT 'sign_off',
  is_required BOOLEAN NOT NULL DEFAULT true,
  rejection_behavior VARCHAR(40) NOT NULL DEFAULT 'request_revision'
);

CREATE TABLE IF NOT EXISTS workflow_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  depends_on_stage_id UUID NOT NULL REFERENCES workflow_template_stages(id) ON DELETE CASCADE,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocking BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (stage_id, depends_on_stage_id)
);

CREATE TABLE IF NOT EXISTS workflow_bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_steps_stage_fk') THEN
    ALTER TABLE template_steps ADD CONSTRAINT template_steps_stage_fk FOREIGN KEY (stage_id) REFERENCES workflow_template_stages(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_steps_component_fk') THEN
    ALTER TABLE template_steps ADD CONSTRAINT template_steps_component_fk FOREIGN KEY (component_id) REFERENCES reusable_workflow_components(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_starter ON workflow_templates(is_starter) WHERE is_starter = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_starter_slug ON workflow_templates(slug) WHERE is_starter = true AND slug IS NOT NULL;
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
CREATE POLICY "Components are readable by providers" ON reusable_workflow_components FOR SELECT USING (auth.uid() IS NOT NULL);

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

DROP POLICY IF EXISTS "Workflow metadata is writable for owned templates" ON workflow_conditions;
DROP POLICY IF EXISTS "Bundle templates are readable by providers" ON workflow_bundle_templates;
CREATE POLICY "Bundle templates are readable by providers" ON workflow_bundle_templates FOR SELECT
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() OR is_starter = true));

DROP POLICY IF EXISTS "Bundles are readable by providers" ON workflow_bundles;
CREATE POLICY "Bundles are readable by providers" ON workflow_bundles FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage workflow templates in their organization" ON workflow_templates;
DROP POLICY IF EXISTS "Users can view their organization templates and starters" ON workflow_templates;
DROP POLICY IF EXISTS "Users can insert organization templates" ON workflow_templates;
DROP POLICY IF EXISTS "Users can update organization templates" ON workflow_templates;
DROP POLICY IF EXISTS "Users can delete organization templates" ON workflow_templates;

CREATE POLICY "Users can view their organization templates and starters"
ON workflow_templates FOR SELECT
USING (organization_id = get_auth_org_id() OR is_starter = true);

CREATE POLICY "Users can insert organization templates"
ON workflow_templates FOR INSERT
WITH CHECK (organization_id = get_auth_org_id() AND is_starter = false);

CREATE POLICY "Users can update organization templates"
ON workflow_templates FOR UPDATE
USING (organization_id = get_auth_org_id() AND is_starter = false)
WITH CHECK (organization_id = get_auth_org_id() AND is_starter = false);

CREATE POLICY "Users can delete organization templates"
ON workflow_templates FOR DELETE
USING (organization_id = get_auth_org_id() AND is_starter = false);

DROP POLICY IF EXISTS "Users can manage steps in their organization's templates" ON template_steps;
DROP POLICY IF EXISTS "Users can view steps in their templates and starters" ON template_steps;

CREATE POLICY "Users can view steps in their templates and starters"
ON template_steps FOR SELECT
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() OR is_starter = true));

CREATE POLICY "Users can manage steps in their organization's templates"
ON template_steps FOR ALL
USING (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() AND is_starter = false))
WITH CHECK (template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id() AND is_starter = false));

DO $$
DECLARE
  starter_id UUID;
BEGIN
  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'Standard Client Onboarding' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'Standard Client Onboarding', 'A flexible starting point for collecting the essentials from any new client.', 'Client Onboarding', true, 'standard-client-onboarding')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Tell us about your business', 'Share the context we need to get started.', 'long_text', true),
      (starter_id, 1, 'Primary contact details', 'Who should we contact with questions?', 'short_text', true),
      (starter_id, 2, 'What does success look like?', 'Describe the outcomes you want from this engagement.', 'long_text', true),
      (starter_id, 3, 'Upload relevant files', 'Add any files that will help us deliver the work.', 'file_upload', false),
      (starter_id, 4, 'Confirm project preferences', 'Share timeline, communication, and approval preferences.', 'long_text', false);
  END IF;

  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'Agency Client Onboarding' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'Agency Client Onboarding', 'Align on team contacts, brand context, and the agency engagement.', 'Agency', true, 'agency-client-onboarding')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Company and team overview', 'Help us understand your team and goals.', 'long_text', true),
      (starter_id, 1, 'Brand assets', 'Upload logos, guidelines, and other brand references.', 'file_upload', false),
      (starter_id, 2, 'Project priorities', 'Which outcomes matter most for this engagement?', 'multi_select', true),
      (starter_id, 3, 'Stakeholders and approval authority', 'Identify contributors and the person who gives final approval.', 'long_text', true),
      (starter_id, 4, 'Access and collaboration preferences', 'Tell us which tools and channels the team uses.', 'long_text', false);
  END IF;

  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'Service Business Onboarding' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'Service Business Onboarding', 'Collect the information needed to begin delivering a recurring service.', 'Service Business', true, 'service-business-onboarding')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Service goals', 'What would make this service successful?', 'long_text', true),
      (starter_id, 1, 'Service preferences', 'Tell us how you prefer to work together.', 'short_text', false),
      (starter_id, 2, 'Current process and constraints', 'Describe what exists today and where help is needed.', 'long_text', true),
      (starter_id, 3, 'Reference documents', 'Share any documents we should review.', 'file_upload', false),
      (starter_id, 4, 'Confirm service kickoff', 'Confirm the preferred start timing and next contact.', 'short_text', true);
  END IF;

  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'Project Kickoff' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'Project Kickoff', 'Get a new project aligned around scope, timing, and stakeholders.', 'Project Kickoff', true, 'project-kickoff')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Project brief', 'Describe the project, audience, and desired outcome.', 'long_text', true),
      (starter_id, 1, 'Target launch date', 'When does the project need to be ready?', 'short_text', true),
      (starter_id, 2, 'Scope and exclusions', 'What is included, and what should remain out of scope?', 'long_text', true),
      (starter_id, 3, 'Stakeholders and milestones', 'Who is involved and what milestones matter?', 'long_text', true),
      (starter_id, 4, 'Kickoff materials', 'Upload briefs, plans, or existing research.', 'file_upload', false);
  END IF;

  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'New Customer Onboarding' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'New Customer Onboarding', 'Welcome new customers and gather the details needed for a smooth launch.', 'New Customer', true, 'new-customer-onboarding')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Customer goals', 'What are you hoping to accomplish with the product?', 'long_text', true),
      (starter_id, 1, 'Implementation contact', 'Who will own the implementation on your side?', 'short_text', true),
      (starter_id, 2, 'Current workflow', 'Describe the process or tools you use today.', 'long_text', true),
      (starter_id, 3, 'Choose your priorities', 'Select the areas you want to focus on first.', 'multi_select', true),
      (starter_id, 4, 'Confirm success plan', 'Confirm the first milestone and training needs.', 'long_text', false);
  END IF;

  SELECT id INTO starter_id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true AND title = 'Document Collection' LIMIT 1;
  IF starter_id IS NULL THEN
    INSERT INTO workflow_templates (organization_id, title, description, category, is_starter, slug)
    VALUES (NULL, 'Document Collection', 'A focused workflow for gathering and organizing required documents.', 'Document Collection', true, 'document-collection')
    RETURNING id INTO starter_id;
    INSERT INTO template_steps (template_id, step_order, title, description, type, is_required)
    VALUES
      (starter_id, 0, 'Legal documents', 'Upload the requested legal or compliance documents.', 'file_upload', true),
      (starter_id, 1, 'Supporting documents', 'Add any additional files relevant to the request.', 'file_upload', false),
      (starter_id, 2, 'Document owner and context', 'Tell us who owns the documents and anything the reviewer should know.', 'short_text', true),
      (starter_id, 3, 'Missing documents', 'List anything currently unavailable and when it may be provided.', 'long_text', false),
      (starter_id, 4, 'Document notes', 'Include context or notes for the reviewing team.', 'long_text', false);
  END IF;
END $$;

DO $$
DECLARE
  starter RECORD;
BEGIN
  UPDATE workflow_templates SET slug = 'standard-client-onboarding', category = 'Client Onboarding', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'Agencies and service providers'), estimated_minutes = COALESCE(estimated_minutes, 15), tags = CASE WHEN tags = '[]'::jsonb THEN '["Beginner-friendly", "B2B"]'::jsonb ELSE tags END WHERE is_starter AND organization_id IS NULL AND title = 'Standard Client Onboarding';
  UPDATE workflow_templates SET slug = 'agency-client-onboarding', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'Agencies'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["High-touch", "Multi-stakeholder", "B2B"]'::jsonb ELSE tags END WHERE is_starter AND organization_id IS NULL AND title = 'Agency Client Onboarding';
  UPDATE workflow_templates SET slug = 'service-business-onboarding', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'Service businesses'), estimated_minutes = COALESCE(estimated_minutes, 20), cadence = 'recurring' WHERE is_starter AND organization_id IS NULL AND title = 'Service Business Onboarding';
  UPDATE workflow_templates SET slug = 'project-kickoff', category = 'Project Kickoff', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'Freelancers and project teams'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["One-time project", "Multi-stakeholder"]'::jsonb ELSE tags END WHERE is_starter AND organization_id IS NULL AND title = 'Project Kickoff';
  UPDATE workflow_templates SET slug = 'new-customer-onboarding', category = 'New Customer', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'SaaS and service providers'), estimated_minutes = COALESCE(estimated_minutes, 20), tags = CASE WHEN tags = '[]'::jsonb THEN '["B2B", "Beginner-friendly"]'::jsonb ELSE tags END WHERE is_starter AND organization_id IS NULL AND title = 'New Customer Onboarding';
  UPDATE workflow_templates SET slug = 'document-collection', category = 'Document Collection', purpose = COALESCE(purpose, description), target_provider = COALESCE(target_provider, 'Professional services'), estimated_minutes = COALESCE(estimated_minutes, 15), document_heavy = true, tags = CASE WHEN tags = '[]'::jsonb THEN '["Document-heavy", "File-heavy"]'::jsonb ELSE tags END WHERE is_starter AND organization_id IS NULL AND title = 'Document Collection';

  INSERT INTO reusable_workflow_components (name, component_type, category, description)
  SELECT name, component_type, category, description
  FROM (VALUES
    ('Company profile', 'text_group', 'Universal', 'Business identity and context.'),
    ('Primary contact', 'contact', 'Universal', 'Main client contact and role.'),
    ('Project goals', 'long_text', 'Universal', 'Desired outcomes and success criteria.'),
    ('Stakeholder directory', 'contact_group', 'Universal', 'People involved in delivery and approval.'),
    ('Existing assets', 'file_group', 'Creative', 'Existing brand, content, or project assets.'),
    ('Technical access instructions', 'secure_instruction', 'Technology', 'Instructions for safe access confirmation without collecting passwords.'),
    ('Timeline and milestones', 'text_group', 'Universal', 'Target dates, milestones, and dependencies.'),
    ('Approval authority', 'contact', 'Universal', 'Person authorized to approve deliverables.'),
    ('Final confirmation', 'confirmation', 'Universal', 'Client confirms the information is complete.')
  ) AS component(name, component_type, category, description)
  WHERE NOT EXISTS (SELECT 1 FROM reusable_workflow_components existing WHERE existing.name = component.name AND existing.component_type = component.component_type);

  FOR starter IN SELECT id FROM workflow_templates WHERE organization_id IS NULL AND is_starter = true LOOP
    IF NOT EXISTS (SELECT 1 FROM workflow_template_stages WHERE template_id = starter.id) THEN
      INSERT INTO workflow_template_stages (template_id, name, description, stage_order)
      VALUES
        (starter.id, 'Context and goals', 'Understand the engagement and desired outcome.', 0),
        (starter.id, 'Requirements and stakeholders', 'Collect requirements, people, and supporting information.', 1),
        (starter.id, 'Files and confirmation', 'Gather documents and confirm the next step.', 2);
      UPDATE template_steps step SET stage_id = stage.id
      FROM workflow_template_stages stage
      WHERE stage.template_id = starter.id AND step.template_id = starter.id
        AND stage.stage_order = LEAST(2, FLOOR(step.step_order / 2.0)::INT);
    END IF;
  END LOOP;
END $$;