-- Refresh unused global starters with complete, category-specific workflows.
-- Starters that already have client instances are left untouched so this is
-- safe to apply after the Use template flow has been used in production.
DO $$
DECLARE
  starter RECORD;
BEGIN
  FOR starter IN
    SELECT id, title
    FROM workflow_templates
    WHERE organization_id IS NULL
      AND is_starter = true
      AND title IN (
        'Standard Client Onboarding', 'Agency Client Onboarding',
        'Service Business Onboarding', 'Project Kickoff',
        'New Customer Onboarding', 'Document Collection'
      )
      AND NOT EXISTS (
        SELECT 1 FROM client_instances instance
        WHERE instance.template_id = workflow_templates.id
      )
  LOOP
    DELETE FROM template_steps WHERE template_id = starter.id;

    IF starter.title = 'Agency Client Onboarding' THEN
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Business and team overview', 'Tell us who your business serves and who will be involved.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Primary contact details', 'Share the day-to-day contact for this engagement.', 'short_text', true, '{}'::jsonb),
        (starter.id, 2, 'Engagement goals', 'What should this engagement accomplish?', 'long_text', true, '{}'::jsonb),
        (starter.id, 3, 'Target audience', 'Describe the audience this work should reach.', 'long_text', true, '{}'::jsonb),
        (starter.id, 4, 'Brand and positioning', 'Share your brand voice, positioning, and important distinctions.', 'long_text', false, '{}'::jsonb),
        (starter.id, 5, 'Existing brand assets', 'Upload logos, guidelines, references, or other useful assets.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.png', '.jpg', '.svg', '.zip'), 'max_size_bytes', 52428800)),
        (starter.id, 6, 'Scope and timeline', 'Describe the deliverables, key dates, and known constraints.', 'long_text', true, '{}'::jsonb),
        (starter.id, 7, 'Stakeholders and approvals', 'List decision makers, contributors, and the preferred approval process.', 'long_text', true, '{}'::jsonb),
        (starter.id, 8, 'Communication preferences', 'Tell us which channels, meeting rhythm, and response expectations work best.', 'long_text', false, '{}'::jsonb),
        (starter.id, 9, 'Additional context', 'Include anything else the team should know before starting.', 'long_text', false, '{}'::jsonb);
    ELSIF starter.title = 'Project Kickoff' THEN
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Project brief', 'Give us the project name, background, and desired outcome.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Objectives and success criteria', 'How will you know this project succeeded?', 'long_text', true, '{}'::jsonb),
        (starter.id, 2, 'Scope and deliverables', 'Describe what is included, excluded, and expected at handoff.', 'long_text', true, '{}'::jsonb),
        (starter.id, 3, 'Stakeholders and responsibilities', 'Identify contributors, approvers, and who owns decisions.', 'long_text', true, '{}'::jsonb),
        (starter.id, 4, 'Timeline and milestones', 'Share the target launch date and important milestones.', 'long_text', true, '{}'::jsonb),
        (starter.id, 5, 'Dependencies and risks', 'List dependencies, known risks, or decisions that could affect delivery.', 'long_text', false, '{}'::jsonb),
        (starter.id, 6, 'Reference materials', 'Upload briefs, research, plans, or other kickoff materials.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.docx', '.pptx', '.xlsx', '.zip'), 'max_size_bytes', 52428800)),
        (starter.id, 7, 'Communication and approvals', 'Describe communication channels, meeting cadence, and approval expectations.', 'long_text', true, '{}'::jsonb);
    ELSIF starter.title = 'Document Collection' THEN
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Requested document set', 'Confirm which document categories or records will be provided.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Primary documents', 'Upload the required documents for this request.', 'file_upload', true, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'), 'max_size_bytes', 52428800)),
        (starter.id, 2, 'Supporting documents', 'Upload optional documents that add useful context.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.png', '.jpg'), 'max_size_bytes', 52428800)),
        (starter.id, 3, 'Document owner', 'Tell us who owns or is responsible for the submitted documents.', 'short_text', true, '{}'::jsonb),
        (starter.id, 4, 'Missing documents', 'List anything unavailable and explain when it may be provided.', 'long_text', false, '{}'::jsonb),
        (starter.id, 5, 'Document dates and deadlines', 'Share relevant issue dates, expiry dates, or collection deadlines.', 'long_text', false, '{}'::jsonb),
        (starter.id, 6, 'Context and notes', 'Add notes that will help us review or organize the documents.', 'long_text', false, '{}'::jsonb);
    ELSIF starter.title = 'New Customer Onboarding' THEN
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Company and customer details', 'Tell us about your company, team, and account context.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Implementation contact', 'Share the person who will coordinate setup and questions.', 'short_text', true, '{}'::jsonb),
        (starter.id, 2, 'Goals and requirements', 'What are you trying to accomplish, and what must the solution support?', 'long_text', true, '{}'::jsonb),
        (starter.id, 3, 'Current workflow', 'Describe your current process, tools, and pain points.', 'long_text', true, '{}'::jsonb),
        (starter.id, 4, 'Priorities', 'Choose the areas that matter most for your first phase.', 'multi_select', true, jsonb_build_object('options', jsonb_build_array('Setup and configuration', 'Team training', 'Data migration', 'Integrations'))),
        (starter.id, 5, 'Preferences and communication', 'Share preferences for communication, training, and support.', 'long_text', false, '{}'::jsonb),
        (starter.id, 6, 'Relevant documents', 'Upload documents or examples that will help us configure your account.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg'), 'max_size_bytes', 52428800)),
        (starter.id, 7, 'Success plan and next steps', 'Describe the first milestone and anything needed before kickoff.', 'long_text', true, '{}'::jsonb);
    ELSIF starter.title = 'Service Business Onboarding' THEN
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Business details', 'Tell us about your business, customers, and operating context.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Service required', 'Describe the service, package, or engagement you are requesting.', 'long_text', true, '{}'::jsonb),
        (starter.id, 2, 'Desired outcomes', 'What should this service achieve for you?', 'long_text', true, '{}'::jsonb),
        (starter.id, 3, 'Scope and requirements', 'Share requirements, constraints, preferences, and what is out of scope.', 'long_text', true, '{}'::jsonb),
        (starter.id, 4, 'Schedule and location', 'Tell us preferred timing, availability, and location or delivery context.', 'long_text', true, '{}'::jsonb),
        (starter.id, 5, 'Assets and reference material', 'Upload files or examples relevant to delivering the service.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.docx', '.png', '.jpg', '.zip'), 'max_size_bytes', 52428800)),
        (starter.id, 6, 'Communication and billing context', 'Share the preferred contact, communication rhythm, and billing information we should plan around.', 'long_text', false, '{}'::jsonb),
        (starter.id, 7, 'Expectations and kickoff', 'Add any expectations or details needed before the service begins.', 'long_text', true, '{}'::jsonb);
    ELSE
      INSERT INTO template_steps (template_id, step_order, title, description, type, is_required, validation_rules)
      VALUES
        (starter.id, 0, 'Business overview', 'Tell us about your business, audience, and current context.', 'long_text', true, '{}'::jsonb),
        (starter.id, 1, 'Primary contact', 'Share the best contact for questions and coordination.', 'short_text', true, '{}'::jsonb),
        (starter.id, 2, 'Goals and desired outcomes', 'What would make this onboarding successful?', 'long_text', true, '{}'::jsonb),
        (starter.id, 3, 'Current process and requirements', 'Describe how things work today and what you need next.', 'long_text', true, '{}'::jsonb),
        (starter.id, 4, 'Audience and preferences', 'Describe your audience and any important preferences or constraints.', 'long_text', false, '{}'::jsonb),
        (starter.id, 5, 'Existing materials', 'Upload files, examples, or references that provide useful context.', 'file_upload', false, jsonb_build_object('accepted_types', jsonb_build_array('.pdf', '.docx', '.png', '.jpg', '.zip'), 'max_size_bytes', 52428800)),
        (starter.id, 6, 'Timeline and stakeholders', 'Share key dates, contributors, decision makers, and approval expectations.', 'long_text', true, '{}'::jsonb),
        (starter.id, 7, 'Additional context', 'Include anything else we should know before beginning.', 'long_text', false, '{}'::jsonb);
    END IF;

    UPDATE workflow_template_stages
    SET name = CASE stage_order
      WHEN 0 THEN CASE starter.title
        WHEN 'Document Collection' THEN 'Documents and ownership'
        WHEN 'Project Kickoff' THEN 'Project and objectives'
        WHEN 'Agency Client Onboarding' THEN 'Business and brand'
        ELSE 'Context and goals'
      END
      WHEN 1 THEN CASE starter.title
        WHEN 'Document Collection' THEN 'Uploads and missing items'
        WHEN 'Project Kickoff' THEN 'Scope and delivery'
        WHEN 'Agency Client Onboarding' THEN 'Engagement requirements'
        ELSE 'Requirements and preferences'
      END
      ELSE CASE starter.title
        WHEN 'Document Collection' THEN 'Review and confirmation'
        WHEN 'Project Kickoff' THEN 'Stakeholders and kickoff'
        WHEN 'Agency Client Onboarding' THEN 'Timeline and communication'
        ELSE 'Files and next steps'
      END
    END
    WHERE template_id = starter.id;

    UPDATE template_steps step
    SET stage_id = stage.id
    FROM workflow_template_stages stage
    WHERE stage.template_id = starter.id
      AND step.template_id = starter.id
      AND stage.stage_order = LEAST(2, FLOOR(step.step_order / 3.0)::INT);
  END LOOP;
END $$;