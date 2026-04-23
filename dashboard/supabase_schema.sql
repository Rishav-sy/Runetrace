-- Enable the PGCrypto extension just in case wait Supabase has it by default
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table
CREATE TABLE public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Organization Members
CREATE TABLE public.organization_members (
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (org_id, user_id)
);

-- 3. API Keys Table
CREATE TABLE public.api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    key_value TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Users can read their own organization
CREATE POLICY "Users can view their organizations" 
ON public.organizations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE public.organization_members.org_id = public.organizations.id 
    AND public.organization_members.user_id = auth.uid()
  )
);

-- Users can read their memberships
CREATE POLICY "Users can view their memberships" 
ON public.organization_members FOR SELECT 
USING (user_id = auth.uid());

-- Users can read API keys for their organization
CREATE POLICY "Users can view org API keys" 
ON public.api_keys FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE public.organization_members.org_id = public.api_keys.org_id 
    AND public.organization_members.user_id = auth.uid()
  )
);

-- Users can insert API keys for their organization
CREATE POLICY "Users can insert org API keys" 
ON public.api_keys FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE public.organization_members.org_id = public.api_keys.org_id 
    AND public.organization_members.user_id = auth.uid()
  )
);

-- Users can update API keys for their organization (e.g. revoking)
CREATE POLICY "Users can update org API keys" 
ON public.api_keys FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE public.organization_members.org_id = public.api_keys.org_id 
    AND public.organization_members.user_id = auth.uid()
  )
);

-- TRIGGER FOR NEW USERS: Auto-create a default Organization "Personal Team"
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert org
  INSERT INTO public.organizations (name)
  VALUES ('Personal Team')
  RETURNING id INTO new_org_id;
  
  -- Insert membership
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Auto generate initial API Key
  INSERT INTO public.api_keys (org_id, key_value)
  VALUES (new_org_id, 'rt_live_' || encode(gen_random_bytes(24), 'hex'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
