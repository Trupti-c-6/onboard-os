-- Validate and save a provider-owned template atomically.
-- This function is SECURITY INVOKER so existing RLS policies remain active.
CREATE OR REPLACE FUNCTION public.update_template_atomic(
  p_template_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_steps JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  template_version INTEGER;
  step JSONB;
  option JSONB;
  option_text TEXT;
  option_values TEXT[];
  step_type TEXT;
  max_size NUMERIC;
BEGIN
  SELECT version INTO template_version
  FROM workflow_templates
  WHERE id = p_template_id
    AND organization_id = get_auth_org_id()
    AND is_starter = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found.' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(BTRIM(p_title), '') IS NULL OR LENGTH(BTRIM(p_title)) > 255 THEN
    RAISE EXCEPTION 'Template title is required and must be 255 characters or fewer.' USING ERRCODE = 'P0001';
  END IF;
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) < 1 THEN
    RAISE EXCEPTION 'Add at least one step.' USING ERRCODE = 'P0001';
  END IF;

  FOR step IN SELECT value FROM jsonb_array_elements(p_steps)
  LOOP
    IF NULLIF(BTRIM(step->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'Step title is required.' USING ERRCODE = 'P0001';
    END IF;

    step_type := step->>'type';
    IF step_type NOT IN ('short_text', 'long_text', 'single_select', 'multi_select', 'file_upload', 'credential', 'e_sign') THEN
      RAISE EXCEPTION 'Invalid response type.' USING ERRCODE = 'P0001';
    END IF;

    IF step_type IN ('single_select', 'multi_select') THEN
      IF jsonb_typeof(step->'validation_rules'->'options') <> 'array'
         OR jsonb_array_length(step->'validation_rules'->'options') < 2 THEN
        RAISE EXCEPTION 'Please add at least 2 options.' USING ERRCODE = 'P0001';
      END IF;
      option_values := ARRAY[]::TEXT[];
      FOR option IN SELECT value FROM jsonb_array_elements(step->'validation_rules'->'options')
      LOOP
        option_text := NULLIF(BTRIM(option #>> '{}'), '');
        IF option_text IS NULL THEN
          RAISE EXCEPTION 'Option text cannot be empty.' USING ERRCODE = 'P0001';
        END IF;
        IF LOWER(option_text) = ANY(option_values) THEN
          RAISE EXCEPTION 'Options must be unique.' USING ERRCODE = 'P0001';
        END IF;
        option_values := array_append(option_values, LOWER(option_text));
      END LOOP;
    ELSIF step_type = 'file_upload' THEN
      IF step->'validation_rules' ? 'max_size_bytes' THEN
        max_size := (step->'validation_rules'->>'max_size_bytes')::NUMERIC;
        IF max_size <= 0 OR max_size > 104857600 THEN
          RAISE EXCEPTION 'File size must be greater than 0 and no more than 100 MB.' USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END LOOP;

  UPDATE workflow_templates
  SET title = BTRIM(p_title),
      description = NULLIF(BTRIM(COALESCE(p_description, '')), ''),
      version = COALESCE(template_version, 1) + 1,
      updated_at = NOW()
  WHERE id = p_template_id;

  DELETE FROM template_steps WHERE template_id = p_template_id;

  INSERT INTO template_steps (
    template_id, step_order, title, description, type, is_required, validation_rules
  )
  SELECT
    p_template_id,
    ordinality - 1,
    BTRIM(step->>'title'),
    NULLIF(BTRIM(COALESCE(step->>'description', '')), ''),
    (step->>'type')::step_type,
    COALESCE((step->>'is_required')::BOOLEAN, true),
    CASE
      WHEN step->>'type' IN ('single_select', 'multi_select') THEN jsonb_build_object('options', (
        SELECT jsonb_agg(to_jsonb(BTRIM(value #>> '{}')) ORDER BY option_index)
        FROM jsonb_array_elements(step->'validation_rules'->'options') WITH ORDINALITY AS options(value, option_index)
      ))
      WHEN step->>'type' = 'file_upload' THEN jsonb_strip_nulls(jsonb_build_object(
        'accepted_types', COALESCE(step->'validation_rules'->'accepted_types', '[]'::jsonb),
        'max_size_bytes', step->'validation_rules'->'max_size_bytes'
      ))
      ELSE '{}'::jsonb
    END
  FROM jsonb_array_elements(p_steps) WITH ORDINALITY AS steps(step, ordinality);

  INSERT INTO workflow_template_versions (template_id, version, snapshot)
  VALUES (p_template_id, COALESCE(template_version, 1) + 1, jsonb_build_object(
    'title', BTRIM(p_title),
    'description', NULLIF(BTRIM(COALESCE(p_description, '')), ''),
    'steps', p_steps
  ));
END;
$$;
