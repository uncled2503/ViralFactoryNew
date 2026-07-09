-- ============================================================================
-- Viral Factory - Database Schema Migration Script (Supabase / PostgreSQL)
-- Phase 1: Robust Administrative, Storage, and Render Farm Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. SAAS_PLANS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('Starter', 'Pro', 'Business')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    max_videos_per_month INT DEFAULT 5 CHECK (max_videos_per_month >= 0),
    max_storage_mb INT DEFAULT 1024 CHECK (max_storage_mb >= 0),
    features TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 2. SAAS_USERS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
    avatar_url TEXT,
    subscription_tier VARCHAR(50) DEFAULT 'Starter',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    usage_current INT DEFAULT 0 CHECK (usage_current >= 0),
    usage_limit INT DEFAULT 5 CHECK (usage_limit >= 0),
    storage_used_mb INT DEFAULT 0 CHECK (storage_used_mb >= 0),
    templates_used INT DEFAULT 0 CHECK (templates_used >= 0),
    projects_active INT DEFAULT 0 CHECK (projects_active >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 3. SAAS_INVOICES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) DEFAULT 'paid' CHECK (status IN ('paid', 'failed', 'refunded', 'pending')),
    stripe_id VARCHAR(255),
    pdf_url TEXT,
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 4. RENDER_WORKERS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS render_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL,
    os VARCHAR(255) NOT NULL,
    cpu_usage INT DEFAULT 0 CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
    ram_usage INT DEFAULT 0 CHECK (ram_usage >= 0 AND ram_usage <= 100),
    jobs_active INT DEFAULT 0 CHECK (jobs_active >= 0),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'idle' CHECK (status IN ('online', 'offline', 'busy', 'idle', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 5. RENDERING_TASKS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS rendering_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID, -- Will be linked via foreign key after projects is created
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'preparing', 'processing', 'completed', 'failed', 'cancelled')),
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    duration VARCHAR(50) DEFAULT '0:00',
    render_time VARCHAR(50),
    output_url TEXT,
    worker_id UUID REFERENCES render_workers(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 6. SAAS_COUPONS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 7. SAAS_AUDIT_LOGS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_user VARCHAR(255),
    ip VARCHAR(50),
    status VARCHAR(50) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 8. SAAS_SUPPORT_TICKETS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS saas_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    reply_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 9. PROJECTS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID, -- Foreign Key will be added if template table created
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'completed', 'failed')),
    aspect VARCHAR(50) DEFAULT '9:16',
    variables JSONB DEFAULT '{}',
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Complete circular rendering_tasks foreign key to projects
ALTER TABLE rendering_tasks ADD CONSTRAINT fk_rendering_tasks_projects FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ==========================================
-- 10. TEMPLATES Table
-- ==========================================
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    aspect VARCHAR(50) DEFAULT '9:16',
    default_duration INT DEFAULT 30 CHECK (default_duration >= 0),
    scenes_count INT DEFAULT 1 CHECK (scenes_count >= 1),
    layers JSONB DEFAULT '[]',
    bg_music_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Link projects template foreign key
ALTER TABLE projects ADD CONSTRAINT fk_projects_templates FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;

-- ==========================================
-- 11. ASSETS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00 CHECK (size_mb >= 0),
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'video' CHECK (type IN ('video', 'image', 'audio', 'logo', 'thumbnail')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 12. FOLDERS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES saas_users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT DEFAULT '/',
    description TEXT,
    files JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- 13. RENDER_OUTPUTS Table
-- ==========================================
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
-- 14. USER_SESSIONS Table
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
-- 15. NOTIFICATIONS Table
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
-- 16. SETTINGS Table
-- ==========================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ==========================================
-- INDEXES FOR ENHANCED QUERY PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_saas_users_email ON saas_users(email);
CREATE INDEX IF NOT EXISTS idx_saas_users_role ON saas_users(role);
CREATE INDEX IF NOT EXISTS idx_saas_users_status ON saas_users(status);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_user_id ON saas_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON saas_invoices(status);

CREATE INDEX IF NOT EXISTS idx_rendering_tasks_user_id ON rendering_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_rendering_tasks_status ON rendering_tasks(status);
CREATE INDEX IF NOT EXISTS idx_rendering_tasks_worker_id ON rendering_tasks(worker_id);

CREATE INDEX IF NOT EXISTS idx_render_workers_status ON render_workers(status);
CREATE INDEX IF NOT EXISTS idx_render_workers_heartbeat ON render_workers(last_heartbeat);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

CREATE INDEX IF NOT EXISTS idx_render_outputs_project_id ON render_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_outputs_user_id ON render_outputs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(active);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ==========================================
-- DATABASE VIEWS FOR ADMIN DASHBOARD
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS across all tables
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
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper policies logic
-- 1. saas_users Policies
CREATE POLICY "Users can read own profile" ON saas_users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON saas_users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins and Owners see all users" ON saas_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- 2. projects Policies
CREATE POLICY "Users can perform CRUD on own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all projects" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- 3. templates Policies
CREATE POLICY "Users can read public and own templates" ON templates
    FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can write own templates" ON templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins have full templates control" ON templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- 4. saas_invoices Policies
CREATE POLICY "Users can view own invoices" ON saas_invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all invoices" ON saas_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- 5. rendering_tasks Policies
CREATE POLICY "Users can view own tasks" ON rendering_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and Workers can view and edit tasks" ON rendering_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- 6. General Admin-only tables (render_workers, saas_coupons, saas_audit_logs, settings)
CREATE POLICY "Admin only select write on workers" ON render_workers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admin only on coupons" ON saas_coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admin only on audit logs" ON saas_audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admin only on settings" ON settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM saas_users 
            WHERE saas_users.id = auth.uid() AND saas_users.role IN ('admin', 'owner')
        )
    );

-- ==========================================
-- REALTIME ENABLEMENT
-- ==========================================
-- Enable Supabase Realtime for instant updates on queues and workers
alter publication supabase_realtime add table rendering_tasks;
alter publication supabase_realtime add table render_workers;
alter publication supabase_realtime add table saas_users;
alter publication supabase_realtime add table saas_invoices;
alter publication supabase_realtime add table saas_audit_logs;
alter publication supabase_realtime add table saas_support_tickets;
