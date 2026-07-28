-- ============================================================================
-- ViralFactory - Complete Supabase Database & Storage Migration Script
-- Production-Ready Schema, RLS, Indexes, Realtime, Triggers, and Storage Buckets
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. SAAS_PLANS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    max_videos_per_month INT DEFAULT 5 CHECK (max_videos_per_month >= 0),
    max_storage_mb INT DEFAULT 1024 CHECK (max_storage_mb >= 0),
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Seed Default Plans
INSERT INTO saas_plans (name, price, max_videos_per_month, max_storage_mb, features)
VALUES 
    ('Starter', 0.00, 5, 1024, ARRAY['5 vídeos/mês', '1GB Armazenamento', '720p Render', 'Suporte Básico']),
    ('Pro', 49.00, 30, 10240, ARRAY['30 vídeos/mês', '10GB Armazenamento', '1080p Full HD', 'Suporte Prioritário', 'Sem marca de água']),
    ('Business', 149.00, 150, 51200, ARRAY['150 vídeos/mês', '50GB Armazenamento', '4K Ultra HD', 'Suporte 24/7', 'Workers Dedicados', 'Acesso à API'])
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    max_videos_per_month = EXCLUDED.max_videos_per_month,
    max_storage_mb = EXCLUDED.max_storage_mb,
    features = EXCLUDED.features;

-- ==========================================
-- 2. SAAS_USERS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company VARCHAR(255) DEFAULT '',
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT DEFAULT '',
    subscription_tier VARCHAR(50) DEFAULT 'Starter',
    status VARCHAR(50) DEFAULT 'active',
    usage_current INT DEFAULT 0 CHECK (usage_current >= 0),
    usage_limit INT DEFAULT 5 CHECK (usage_limit >= 0),
    storage_used_mb INT DEFAULT 0 CHECK (storage_used_mb >= 0),
    templates_used INT DEFAULT 0 CHECK (templates_used >= 0),
    projects_active INT DEFAULT 0 CHECK (projects_active >= 0),
    subscription_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Seed Master SaaS Owner User
INSERT INTO saas_users (id, name, email, company, role, subscription_tier, status, usage_limit, storage_used_mb)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Gabriel Moura',
    'mouragabriel2011@gmail.com',
    'ViralFactory HQ',
    'owner',
    'Business',
    'active',
    999999,
    0
)
ON CONFLICT (id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    subscription_tier = 'Business';

-- ==========================================
-- 3. PROJECTS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    template_id UUID,
    aspect VARCHAR(50) DEFAULT '16:9',
    aspect_ratio VARCHAR(50) DEFAULT '16:9',
    status VARCHAR(50) DEFAULT 'draft',
    variables JSONB DEFAULT '{}',
    video_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 4. TEMPLATES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    aspect VARCHAR(50) DEFAULT '16:9',
    aspect_ratio VARCHAR(50) DEFAULT '16:9',
    default_duration INT DEFAULT 30 CHECK (default_duration >= 0),
    duration_seconds INT DEFAULT 30 CHECK (duration_seconds >= 0),
    scenes_count INT DEFAULT 1 CHECK (scenes_count >= 1),
    layers JSONB DEFAULT '[]',
    thumbnail_url TEXT DEFAULT '',
    bg_music_url TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Link circular foreign key for projects -> templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_templates'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT fk_projects_templates FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==========================================
-- 5. RENDER_WORKERS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS render_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL,
    os VARCHAR(255) NOT NULL DEFAULT 'linux',
    cpu_usage INT DEFAULT 0 CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
    ram_usage INT DEFAULT 0 CHECK (ram_usage >= 0 AND ram_usage <= 100),
    jobs_active INT DEFAULT 0 CHECK (jobs_active >= 0),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'idle',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 6. RENDERING_TASKS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS rendering_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
    template_name VARCHAR(255) NOT NULL DEFAULT 'Untitled Template',
    status VARCHAR(50) DEFAULT 'queued',
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    duration VARCHAR(50) DEFAULT '0:30',
    render_time VARCHAR(50) DEFAULT '',
    output_url TEXT DEFAULT '',
    worker_id UUID REFERENCES render_workers(id) ON DELETE SET NULL,
    error_message TEXT DEFAULT '',
    logs JSONB DEFAULT '[]',
    debug_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 7. SAAS_INVOICES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL DEFAULT '',
    customer_email VARCHAR(255) NOT NULL DEFAULT '',
    plan VARCHAR(50) DEFAULT 'Pro',
    plan_tier VARCHAR(50) DEFAULT 'Pro',
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    status VARCHAR(50) DEFAULT 'paid',
    stripe_id VARCHAR(255) DEFAULT '',
    pdf_url TEXT DEFAULT '',
    billing_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    billing_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now() + interval '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 8. SAAS_COUPONS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage',
    discount_value NUMERIC(10, 2) DEFAULT 0.00 CHECK (discount_value >= 0),
    discount_percent INT DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 9. SAAS_AUDIT_LOGS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name VARCHAR(255) NOT NULL DEFAULT 'System',
    action VARCHAR(255) NOT NULL,
    target_user VARCHAR(255) DEFAULT 'SYSTEM',
    ip VARCHAR(50) DEFAULT '127.0.0.1',
    status VARCHAR(50) DEFAULT 'SUCCESS',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 10. SAAS_SUPPORT_TICKETS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) DEFAULT '',
    customer_email VARCHAR(255) DEFAULT '',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(50) DEFAULT 'medium',
    reply_text TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 11. CONFIGURATION Table (Key-Value Store)
-- ==========================================
CREATE TABLE IF NOT EXISTS configuration (
    key_name VARCHAR(255) PRIMARY KEY,
    key_value TEXT NOT NULL,
    description TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 12. SETTINGS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 13. ASSETS & UPLOADED_VIDEOS Tables
-- ==========================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00 CHECK (size_mb >= 0),
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'video',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS uploaded_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00 CHECK (size_mb >= 0),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 14. RENDERED_VIDEOS & RENDER_OUTPUTS Tables
-- ==========================================
CREATE TABLE IF NOT EXISTS rendered_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00 CHECK (size_mb >= 0),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS render_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00 CHECK (size_mb >= 0),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 15. FOLDERS & STORAGE_FOLDERS Tables
-- ==========================================
CREATE TABLE IF NOT EXISTS storage_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT DEFAULT '/',
    description TEXT DEFAULT '',
    files JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT DEFAULT '/',
    description TEXT DEFAULT '',
    files JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 16. USER_SESSIONS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 17. NOTIFICATIONS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- INDEXES FOR HIGH PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_saas_users_email ON saas_users(email);
CREATE INDEX IF NOT EXISTS idx_saas_users_role ON saas_users(role);
CREATE INDEX IF NOT EXISTS idx_saas_users_status ON saas_users(status);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

CREATE INDEX IF NOT EXISTS idx_rendering_tasks_user_id ON rendering_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_rendering_tasks_status ON rendering_tasks(status);
CREATE INDEX IF NOT EXISTS idx_rendering_tasks_worker_id ON rendering_tasks(worker_id);

CREATE INDEX IF NOT EXISTS idx_render_workers_status ON render_workers(status);
CREATE INDEX IF NOT EXISTS idx_render_workers_heartbeat ON render_workers(last_heartbeat);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_user_id ON saas_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_rendered_videos_user_id ON rendered_videos(user_id);

-- ==========================================
-- DATABASE VIEWS FOR ADMIN STATS
-- ==========================================
CREATE OR REPLACE VIEW view_admin_mrr_ltv_stats AS
SELECT 
    COALESCE(SUM(amount), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_revenue,
    COALESCE(COUNT(DISTINCT user_id), 0) AS total_paying_users,
    CASE 
        WHEN COUNT(DISTINCT user_id) > 0 THEN ROUND(COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) / COUNT(DISTINCT user_id), 2)
        ELSE 0.00
    END AS average_ltv
FROM saas_invoices;

-- ==========================================
-- AUTH USERS AUTOMATIC SYNC TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.saas_users (id, email, name, role, subscription_tier, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user',
    'Starter',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SUPABASE STORAGE BUCKETS SETUP
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('rendered', 'rendered', true, NULL, NULL),
  ('previews', 'previews', true, NULL, NULL),
  ('thumbnails', 'thumbnails', true, NULL, NULL),
  ('assets', 'assets', true, NULL, NULL),
  ('avatars', 'avatars', true, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Security Policies
DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE USING (true);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE saas_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendering_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendered_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration ENABLE ROW LEVEL SECURITY;

-- Permissive policies for API service role and client access
DROP POLICY IF EXISTS "Public read plans" ON saas_plans;
CREATE POLICY "Public read plans" ON saas_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users and service read write saas_users" ON saas_users;
CREATE POLICY "Users and service read write saas_users" ON saas_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write projects" ON projects;
CREATE POLICY "Users and service read write projects" ON projects FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write templates" ON templates;
CREATE POLICY "Users and service read write templates" ON templates FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write rendering_tasks" ON rendering_tasks;
CREATE POLICY "Users and service read write rendering_tasks" ON rendering_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Workers and service read write render_workers" ON render_workers;
CREATE POLICY "Workers and service read write render_workers" ON render_workers FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write saas_invoices" ON saas_invoices;
CREATE POLICY "Users and service read write saas_invoices" ON saas_invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write saas_coupons" ON saas_coupons;
CREATE POLICY "Users and service read write saas_coupons" ON saas_coupons FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write saas_audit_logs" ON saas_audit_logs;
CREATE POLICY "Users and service read write saas_audit_logs" ON saas_audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write saas_support_tickets" ON saas_support_tickets;
CREATE POLICY "Users and service read write saas_support_tickets" ON saas_support_tickets FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write configuration" ON configuration;
CREATE POLICY "Users and service read write configuration" ON configuration FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write settings" ON settings;
CREATE POLICY "Users and service read write settings" ON settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write assets" ON assets;
CREATE POLICY "Users and service read write assets" ON assets FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write uploaded_videos" ON uploaded_videos;
CREATE POLICY "Users and service read write uploaded_videos" ON uploaded_videos FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write rendered_videos" ON rendered_videos;
CREATE POLICY "Users and service read write rendered_videos" ON rendered_videos FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write render_outputs" ON render_outputs;
CREATE POLICY "Users and service read write render_outputs" ON render_outputs FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write storage_folders" ON storage_folders;
CREATE POLICY "Users and service read write storage_folders" ON storage_folders FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write folders" ON folders;
CREATE POLICY "Users and service read write folders" ON folders FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write user_sessions" ON user_sessions;
CREATE POLICY "Users and service read write user_sessions" ON user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Users and service read write notifications" ON notifications;
CREATE POLICY "Users and service read write notifications" ON notifications FOR ALL USING (true);

-- Grant privileges to authenticated, anon and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==========================================
-- REALTIME ENABLEMENT
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE rendering_tasks;
        ALTER PUBLICATION supabase_realtime ADD TABLE render_workers;
        ALTER PUBLICATION supabase_realtime ADD TABLE saas_users;
        ALTER PUBLICATION supabase_realtime ADD TABLE saas_invoices;
        ALTER PUBLICATION supabase_realtime ADD TABLE saas_audit_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE saas_support_tickets;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication configuration skipped or already present.';
END $$;
