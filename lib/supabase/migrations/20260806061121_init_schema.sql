-- ============================================================
-- OnboardOS: Initial Schema Migration
-- Run this once in Supabase's SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- ENABLE EXTENSIONS
-- uuid-ossp/pgcrypto let Postgres generate secure random IDs and tokens for us
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TYPE ENUMS
-- Enums restrict a column to a fixed set of values (safer than free-text strings)
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE onboarding_status AS ENUM ('draft', 'active', 'in_progress', 'submitted', 'in_review', 'completed', 'stalled', 'archived');
CREATE TYPE step_type AS ENUM ('short_text', 'long_text', 'single_select', 'multi_select', 'file_upload', 'credential', 'e_sign');
CREATE TYPE step_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');

-- 1. ORGANIZATIONS TABLE
-- Every provider (agency owner) belongs to an Organization. This is our multi-tenancy root.
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES TABLE
-- Extends Supabase's built-in auth.users with app-specific fields (org, role)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WORKFLOW TEMPLATES TABLE
-- A reusable onboarding "recipe" a provider builds once and reuses per client
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TEMPLATE STEPS TABLE
-- The individual ordered steps inside a template (e.g. "Upload your logo")
CREATE TABLE template_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type step_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_step_order_per_template UNIQUE (template_id, step_order)
);

-- 5. CLIENT INSTANCES TABLE
-- One row per "this specific client is onboarding via this template".
-- access_token is the secret in the magic link URL — 32 random bytes = 64 hex chars.
CREATE TABLE client_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE RESTRICT,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  access_token VARCHAR(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  status onboarding_status NOT NULL DEFAULT 'active',
  nudge_count INT NOT NULL DEFAULT 0,
  max_nudges INT NOT NULL DEFAULT 3,
  last_nudged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CLIENT SUBMISSIONS TABLE
-- One row per "this client's answer/upload for this specific step"
CREATE TABLE client_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES client_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES template_steps(id) ON DELETE RESTRICT,
  status step_status NOT NULL DEFAULT 'pending',
  value_text TEXT,
  value_json JSONB,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_step_per_instance UNIQUE (instance_id, step_id)
);

-- 7. SUBMISSION ASSETS (FILES) TABLE
-- Metadata about files uploaded to Supabase Storage for a given submission
CREATE TABLE submission_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES client_submissions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
-- These make lookups fast as data grows (e.g. finding a client by their token)
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_templates_org ON workflow_templates(organization_id);
CREATE INDEX idx_steps_template ON template_steps(template_id);
CREATE INDEX idx_instances_org ON client_instances(organization_id);
CREATE INDEX idx_instances_token ON client_instances(access_token);
CREATE INDEX idx_instances_status ON client_instances(status);
CREATE INDEX idx_submissions_instance ON client_submissions(instance_id);
CREATE INDEX idx_assets_submission ON submission_assets(submission_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is the single most important security layer in the whole app.
-- Without it, ANY logged-in user could query ANY organization's data via
-- the public API. RLS makes Postgres itself enforce "you can only see
-- rows belonging to your own organization" — no app code can bypass it.
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_assets ENABLE ROW LEVEL SECURITY;

-- Helper function: looks up the current logged-in user's organization_id.
-- SECURITY DEFINER means it runs with elevated rights so it can read
-- profiles even though profiles itself has RLS on it (avoids infinite recursion).
CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: you can see teammates in your own org
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT USING (organization_id = get_auth_org_id());

-- Organizations: you can see/manage your own org
CREATE POLICY "Users can manage their own organization"
ON organizations FOR ALL USING (id = get_auth_org_id());

-- Workflow templates: only accessible within your org
CREATE POLICY "Users can manage workflow templates in their organization"
ON workflow_templates FOR ALL USING (organization_id = get_auth_org_id());

-- Template steps: inherit access from their parent template's org
CREATE POLICY "Users can manage steps in their organization's templates"
ON template_steps FOR ALL USING (
  template_id IN (SELECT id FROM workflow_templates WHERE organization_id = get_auth_org_id())
);

-- Client instances: only accessible within your org (provider-side access)
CREATE POLICY "Users can manage client instances in their organization"
ON client_instances FOR ALL USING (organization_id = get_auth_org_id());

-- Client submissions: only accessible within your org (provider-side access)
CREATE POLICY "Users can view and update submissions in their organization"
ON client_submissions FOR ALL USING (
  instance_id IN (SELECT id FROM client_instances WHERE organization_id = get_auth_org_id())
);

-- Submission assets: only accessible within your org (provider-side access)
CREATE POLICY "Users can view assets in their organization"
ON submission_assets FOR ALL USING (
  submission_id IN (
    SELECT cs.id FROM client_submissions cs
    JOIN client_instances ci ON cs.instance_id = ci.id
    WHERE ci.organization_id = get_auth_org_id()
  )
);

-- NOTE: Unauthenticated end-clients (accessing via magic link token, not logged in)
-- will read/write client_instances, client_submissions, and submission_assets through
-- dedicated Server Actions using the Supabase service role key — bypassing RLS
-- deliberately, but only after the Server Action itself has verified the token by hand.
-- We'll build those Server Actions in Milestone 3.

-- ============================================================
-- AUTO-PROVISIONING TRIGGER
-- When a new user signs up via Supabase Auth, automatically create
-- an Organization + Profile for them so the app never has an
-- "orphaned user with no org" state.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1)),
    lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, organization_id, email, full_name, role)
  VALUES (NEW.id, new_org_id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
