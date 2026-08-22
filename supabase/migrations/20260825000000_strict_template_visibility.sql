-- Enforce the canonical template visibility invariant in every template
-- and template-child read policy. This is forward-only and does not alter
-- existing rows or client instances.
DROP POLICY IF EXISTS "Users can view their organization templates and starters" ON workflow_templates;
CREATE POLICY "Users can view their organization templates and starters"
ON workflow_templates FOR SELECT
USING (
  (organization_id IS NULL AND is_starter = true)
  OR (organization_id = get_auth_org_id() AND is_starter = false)
);

DROP POLICY IF EXISTS "Users can view steps in their templates and starters" ON template_steps;
CREATE POLICY "Users can view steps in their templates and starters"
ON template_steps FOR SELECT
USING (template_id IN (
  SELECT id FROM workflow_templates
  WHERE (organization_id IS NULL AND is_starter = true)
     OR (organization_id = get_auth_org_id() AND is_starter = false)
));

DROP POLICY IF EXISTS "Template stages follow template visibility" ON workflow_template_stages;
CREATE POLICY "Template stages follow template visibility" ON workflow_template_stages FOR SELECT
USING (template_id IN (
  SELECT id FROM workflow_templates
  WHERE (organization_id IS NULL AND is_starter = true)
     OR (organization_id = get_auth_org_id() AND is_starter = false)
));

DROP POLICY IF EXISTS "Step metadata follows template visibility" ON step_options;
CREATE POLICY "Step metadata follows template visibility" ON step_options FOR SELECT
USING (step_id IN (
  SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id
  WHERE (wt.organization_id IS NULL AND wt.is_starter = true)
     OR (wt.organization_id = get_auth_org_id() AND wt.is_starter = false)
));

DROP POLICY IF EXISTS "Workflow conditions follow template visibility" ON workflow_conditions;
CREATE POLICY "Workflow conditions follow template visibility" ON workflow_conditions FOR SELECT
USING (source_step_id IN (
  SELECT ts.id FROM template_steps ts JOIN workflow_templates wt ON wt.id = ts.template_id
  WHERE (wt.organization_id IS NULL AND wt.is_starter = true)
     OR (wt.organization_id = get_auth_org_id() AND wt.is_starter = false)
));

DROP POLICY IF EXISTS "Document metadata follows stage visibility" ON document_requests;
CREATE POLICY "Document metadata follows stage visibility" ON document_requests FOR SELECT
USING (stage_id IN (
  SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id
  WHERE (wt.organization_id IS NULL AND wt.is_starter = true)
     OR (wt.organization_id = get_auth_org_id() AND wt.is_starter = false)
));

DROP POLICY IF EXISTS "Approval metadata follows stage visibility" ON approval_gates;
CREATE POLICY "Approval metadata follows stage visibility" ON approval_gates FOR SELECT
USING (stage_id IN (
  SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id
  WHERE (wt.organization_id IS NULL AND wt.is_starter = true)
     OR (wt.organization_id = get_auth_org_id() AND wt.is_starter = false)
));

DROP POLICY IF EXISTS "Dependencies follow template visibility" ON workflow_dependencies;
CREATE POLICY "Dependencies follow template visibility" ON workflow_dependencies FOR SELECT
USING (stage_id IN (
  SELECT s.id FROM workflow_template_stages s JOIN workflow_templates wt ON wt.id = s.template_id
  WHERE (wt.organization_id IS NULL AND wt.is_starter = true)
     OR (wt.organization_id = get_auth_org_id() AND wt.is_starter = false)
));

DROP POLICY IF EXISTS "Versions follow template visibility" ON workflow_template_versions;
CREATE POLICY "Versions follow template visibility" ON workflow_template_versions FOR SELECT
USING (template_id IN (
  SELECT id FROM workflow_templates
  WHERE (organization_id IS NULL AND is_starter = true)
     OR (organization_id = get_auth_org_id() AND is_starter = false)
));

DROP POLICY IF EXISTS "Bundle templates are readable by providers" ON workflow_bundle_templates;
CREATE POLICY "Bundle templates are readable by providers" ON workflow_bundle_templates FOR SELECT
USING (template_id IN (
  SELECT id FROM workflow_templates
  WHERE (organization_id IS NULL AND is_starter = true)
     OR (organization_id = get_auth_org_id() AND is_starter = false)
));