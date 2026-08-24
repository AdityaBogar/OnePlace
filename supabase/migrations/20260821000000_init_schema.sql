-- Migration: Initial Schema for 3D Real Estate Showcase Application
-- Description: Sets up profiles, models, hotspots, visitors, inquiries, communication preferences/logs, follow-up jobs, and RLS policies.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles Enum & Types
CREATE TYPE user_role AS ENUM ('ADMIN', 'SALES');
CREATE TYPE model_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE inquiry_status AS ENUM ('NEW', 'FOLLOW_UP_SCHEDULED', 'FOLLOWED_UP', 'CLOSED');
CREATE TYPE comm_channel AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE comm_status AS ENUM ('SENT', 'FAILED', 'SKIPPED_OPT_OUT', 'MOCK_SENT');
CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'SALES',
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 3D MODELS TABLE
CREATE TABLE IF NOT EXISTS public.models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Supabase Storage path or GLB URL
    file_size_bytes BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- Only one model active for public walkthrough
    status model_status NOT NULL DEFAULT 'DRAFT',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of active model
CREATE INDEX IF NOT EXISTS idx_models_is_active ON public.models(is_active) WHERE is_active = TRUE;

-- 3. HOTSPOTS TABLE
CREATE TABLE IF NOT EXISTS public.hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pos_x FLOAT NOT NULL DEFAULT 0,
    pos_y FLOAT NOT NULL DEFAULT 0,
    pos_z FLOAT NOT NULL DEFAULT 0,
    rot_y FLOAT NOT NULL DEFAULT 0,
    target_pos_x FLOAT NOT NULL DEFAULT 0,
    target_pos_y FLOAT NOT NULL DEFAULT 0,
    target_pos_z FLOAT NOT NULL DEFAULT 0,
    target_rot_y FLOAT NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_model_id ON public.hotspots(model_id);

-- 4. VISITORS TABLE
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesperson_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    inquiry_type TEXT NOT NULL DEFAULT 'General Inquiry',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_salesperson ON public.visitors(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON public.visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);

-- 5. INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    status inquiry_status NOT NULL DEFAULT 'NEW',
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_visitor ON public.inquiries(visitor_id);

-- 6. COMMUNICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID UNIQUE NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    opted_out BOOLEAN NOT NULL DEFAULT FALSE,
    opt_out_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FOLLOW-UP JOBS TABLE
CREATE TABLE IF NOT EXISTS public.follow_up_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status job_status NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON public.follow_up_jobs(status, scheduled_for);

-- 8. COMMUNICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
    channel comm_channel NOT NULL,
    status comm_status NOT NULL,
    recipient TEXT NOT NULL,
    content_summary TEXT NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_visitor ON public.communication_logs(visitor_id);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES

-- Profiles
CREATE POLICY "Public profile lookup for authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins full manage profiles" ON public.profiles
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- Models (Public can view active model, Admin can edit all)
CREATE POLICY "Anyone can view published active models" ON public.models
    FOR SELECT USING (is_active = true OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Admin full manage models" ON public.models
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- Hotspots (Public can view for active model, Admin can edit)
CREATE POLICY "Anyone can view hotspots for active model" ON public.hotspots
    FOR SELECT USING (is_enabled = true OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "Admin full manage hotspots" ON public.hotspots
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- Visitors (Sales can manage their own, Admin can view all)
CREATE POLICY "Sales view and insert their own visitors" ON public.visitors
    FOR ALL TO authenticated USING (
        salesperson_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- Inquiries
CREATE POLICY "Sales view and insert inquiries for their visitors" ON public.inquiries
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.visitors v
            WHERE v.id = inquiries.visitor_id
            AND (v.salesperson_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN')
        )
    );

-- Communication Preferences & Logs
CREATE POLICY "Access communication prefs" ON public.communication_preferences
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Access communication logs" ON public.communication_logs
    FOR ALL TO authenticated USING (true);
