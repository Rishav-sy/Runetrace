-- ==============================================================
-- RUNETRACE INGESTION SCHEMA
-- Run this in your Supabase SQL Editor
-- ==============================================================

-- 1. Create the Request Logs table
CREATE TABLE IF NOT EXISTS public.request_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    project_id TEXT,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    latency_ms NUMERIC,
    cost NUMERIC,
    prompt TEXT,
    response TEXT,
    function_name TEXT,
    user_id TEXT,
    session_id TEXT,
    tags JSONB,
    metadata JSONB,
    trace_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- 2. Read Policy for the dashboard
-- Allows anyone to fetch logs ONLY if they are an active member of that log's organization.
CREATE POLICY "Users can view org logs" ON public.request_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = public.request_logs.org_id AND user_id = auth.uid())
);

-- Note: We intentionally avoid creating an INSERT policy because our RPC function below
-- uses 'SECURITY DEFINER', which safely bypasses RLS while tightly controlling data input.

-- 3. Ingest Log RPC Endpoint
-- The SDK pushes logs directly to this function at https://<project>.supabase.co/rest/v1/rpc/ingest_log
CREATE OR REPLACE FUNCTION public.ingest_log(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    provided_api_key TEXT;
    valid_org_id UUID;
BEGIN
    -- Securely extract the API key from the HTTP headers intercepted by PostgREST
    provided_api_key := current_setting('request.headers', true)::json->>'x-api-key';
    
    IF provided_api_key IS NULL THEN
        -- Fallback: Check if the SDK sneaked it into the payload just in case headers got stripped
        provided_api_key := payload->>'api_key';
        IF provided_api_key IS NULL THEN
            RAISE EXCEPTION 'Missing x-api-key header';
        END IF;
    END IF;

    -- Validate API key strictly against the database
    SELECT org_id INTO valid_org_id 
    FROM public.api_keys 
    WHERE key_value = provided_api_key AND status = 'active';
    
    IF valid_org_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or revoked API key';
    END IF;

    -- Directly insert the log using the strictly validated Organization ID
    INSERT INTO public.request_logs (
        org_id, project_id, model, prompt_tokens, completion_tokens, latency_ms, cost, prompt, response, function_name, user_id, session_id, tags, metadata, trace_id, created_at
    ) VALUES (
        valid_org_id,
        payload->>'project_id',
        payload->>'model',
        (payload->>'prompt_tokens')::INT,
        (payload->>'completion_tokens')::INT,
        (payload->>'latency_ms')::NUMERIC,
        (payload->>'cost')::NUMERIC,
        payload->>'prompt',
        payload->>'response',
        payload->>'function_name',
        payload->>'user_id',
        payload->>'session_id',
        payload->'tags',
        payload->'metadata',
        payload->>'trace_id',
        COALESCE((payload->>'created_at')::TIMESTAMPTZ, timezone('utc', now()))
    );

    RETURN '{"status": "success"}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
