-- Fix for "Database error saving new user"
-- Explicitly qualifies table names with `public.` and pins the search_path
-- so the trigger can find our tables regardless of which role invokes it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1)),
    lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, email, full_name, role)
  VALUES (NEW.id, new_org_id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'owner');

  RETURN NEW;
END;
$$;

-- Belt-and-suspenders: make sure the auth trigger role can reach our schema/tables
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.organizations TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
