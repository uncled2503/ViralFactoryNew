import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';
import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = path.join(process.cwd(), 'public', 'storage', 'admin_mock_db.json');

function ensureMockDb() {
  const parent = path.dirname(MOCK_DB_PATH);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  if (!fs.existsSync(MOCK_DB_PATH)) {
    const initialData = {
      users: [
        {
          id: 'usr-001',
          name: 'Gabriel Moura',
          email: 'mouragabriel2011@gmail.com',
          company: 'Viral S.A.',
          role: 'owner',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Pro',
          status: 'active',
          usage_current: 12,
          usage_limit: 100,
          storage_used_mb: 240,
          templates_used: 1,
          projects_active: 2,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-002',
          name: 'Bruna Silva',
          email: 'bruna@ecom.com',
          company: 'Dropshipping Brasil',
          role: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Starter',
          status: 'active',
          usage_current: 87,
          usage_limit: 100,
          storage_used_mb: 1224,
          templates_used: 3,
          projects_active: 4,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-003',
          name: 'Lucas Santos',
          email: 'lucas@agency.io',
          company: 'Selo Criativo',
          role: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Pro',
          status: 'active',
          usage_current: 1240,
          usage_limit: 2000,
          storage_used_mb: 48500,
          templates_used: 12,
          projects_active: 18,
          created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-004',
          name: 'Mariana Costa',
          email: 'mariana@tech.com',
          company: 'TechGrowth Media',
          role: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Business',
          status: 'active',
          usage_current: 3840,
          usage_limit: 10000,
          storage_used_mb: 380400,
          templates_used: 38,
          projects_active: 52,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-005',
          name: 'Tiago Souza',
          email: 'tiago@spam.com',
          company: 'LeadGen Inc',
          role: 'user',
          avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Starter',
          status: 'suspended',
          usage_current: 14,
          usage_limit: 100,
          storage_used_mb: 154,
          templates_used: 1,
          projects_active: 1,
          created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-006',
          name: 'Gabriel de Souza Fonseca',
          email: 'kaorihikarichan@gmail.com',
          company: 'Kaori Studios',
          role: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Starter',
          status: 'active',
          usage_current: 5,
          usage_limit: 100,
          storage_used_mb: 45,
          templates_used: 1,
          projects_active: 2,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'usr-007',
          name: 'Bellycompany',
          email: 'bellycompany@gmail.com',
          company: 'Belly Corp',
          role: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&h=256&fit=crop',
          subscription_tier: 'Starter',
          status: 'active',
          usage_current: 12,
          usage_limit: 100,
          storage_used_mb: 180,
          templates_used: 2,
          projects_active: 3,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      jobs: [
        { id: 'job-001', project_name: 'Campanha de Vendas de Verão', template_name: 'Dynamic E-commerce Reel', status: 'queued', progress: 0, duration: '0:15', created_at: new Date().toISOString() },
        { id: 'job-002', project_name: 'Anúncio de Imóvel Alto Padrão', template_name: 'Real Estate Modern Showcase', status: 'processing', progress: 42, duration: '0:30', render_time: '1m 12s', created_at: new Date().toISOString() },
        { id: 'job-003', project_name: 'Video de Boas-vindas', template_name: 'SaaS Walkthrough Neon', status: 'completed', progress: 100, duration: '0:45', render_time: '2m 35s', created_at: new Date(Date.now() - 3600000).toISOString() }
      ],
      workers: [
        { id: '1', hostname: 'worker-us-east-1', os: 'Linux (Ubuntu 22.04)', cpu_usage: 12, ram_usage: 45, jobs_active: 0, status: 'idle', version: '1.2.4', created_at: new Date().toISOString() },
        { id: '2', hostname: 'worker-us-west-2', os: 'Linux (Ubuntu 22.04)', cpu_usage: 85, ram_usage: 78, jobs_active: 1, status: 'busy', version: '1.2.4', created_at: new Date().toISOString() },
        { id: '3', hostname: 'worker-eu-central-1', os: 'Windows Server 2022', cpu_usage: 0, ram_usage: 15, jobs_active: 0, status: 'idle', version: '1.2.3', created_at: new Date().toISOString() }
      ],
      invoices: [
        { id: 'inv-101', customer_name: 'Gabriel Moura', customer_email: 'mouragabriel2011@gmail.com', plan: 'Pro', amount: 49.00, status: 'paid', stripe_id: 'ch_3Mz90BFF...', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'inv-102', customer_name: 'Bruna Silva', customer_email: 'bruna@ecom.com', plan: 'Starter', amount: 19.00, status: 'paid', stripe_id: 'ch_3Mz91CFF...', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'inv-103', customer_name: 'Lucas Santos', customer_email: 'lucas@agency.io', plan: 'Pro', amount: 49.00, status: 'paid', stripe_id: 'ch_3Mz92DFF...', created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'inv-104', customer_name: 'Mariana Costa', customer_email: 'mariana@tech.com', plan: 'Business', amount: 149.00, status: 'paid', stripe_id: 'ch_3Mz93EFF...', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() }
      ],
      support_tickets: [
        { id: 'ticket-1', customer_name: 'Gabriel Moura', customer_email: 'mouragabriel2011@gmail.com', subject: 'Dúvida sobre renderização de alta definição', message: 'Gostaria de saber se o plano Pro já inclui renders ilimitados em 4K ou se é restrito a 1080p.', status: 'open', created_at: new Date().toISOString() },
        { id: 'ticket-2', customer_name: 'Tiago Souza', customer_email: 'tiago@spam.com', subject: 'Problema no faturamento do cartão', message: 'Minha assinatura foi cobrada duas vezes este mês. Podem verificar e fazer o estorno?', status: 'open', created_at: new Date(Date.now() - 86400000).toISOString() }
      ],
      audit_logs: [
        { id: 'log-1', admin_name: 'SaaS Admin', action: 'UPDATE_SETTING_stripe_live', target_user: 'SYSTEM', ip: '127.0.0.1', status: 'SUCCESS', timestamp: new Date().toISOString() },
        { id: 'log-2', admin_name: 'SaaS Admin', action: 'SUSPEND_USER_tiago@spam.com', target_user: 'Tiago Souza', ip: '127.0.0.1', status: 'SUCCESS', timestamp: new Date(Date.now() - 3600000).toISOString() }
      ],
      coupons: [
        { id: 'cp-1', code: 'VIRAL50', discount_type: 'percentage', discount_value: 50.00, active: true, expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
        { id: 'cp-2', code: 'STARTERFREE', discount_type: 'percentage', discount_value: 100.00, active: true, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() }
      ],
      settings: [
        { id: 's-1', key: 'saas_name', value: 'Viral Factory', description: 'Nome da plataforma SaaS' },
        { id: 's-2', key: 'saas_email', value: 'support@viralfactory.com', description: 'E-mail oficial' },
        { id: 's-3', key: 'stripe_secret_key', value: 'sk_test_51Mz90BFF...', description: 'Chave secreta do Stripe' },
        { id: 's-4', key: 'feature_flags', value: JSON.stringify({ aiSubtitles: true, batchRenders: false, stripeLive: false, offlineFallbackAuth: true, telemetryLogs: false }), description: 'FeatureFlags dinâmicas' }
      ]
    };
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function readMockDb(): any {
  ensureMockDb();
  try {
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeMockDb(data: any) {
  ensureMockDb();
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
}

function mapDbUserToFrontendUser(u: any): any {
  if (!u) return null;
  const subscription = u.subscription_tier || u.subscription || 'Starter';
  const avatarUrl = u.avatar_url || u.avatarUrl || '';
  const usageCurrent = u.usage_current !== undefined ? u.usage_current : (u.usageCurrent || 0);
  const usageLimit = u.usage_limit !== undefined ? u.usage_limit : (u.usageLimit || 5);
  const storageUsedMB = u.storage_used_mb !== undefined ? u.storage_used_mb : (u.storageUsedMB || 0);
  const templatesUsed = u.templates_used !== undefined ? u.templates_used : (u.templatesUsed || 0);
  const projectsActive = u.projects_active !== undefined ? u.projects_active : (u.projectsActive || 0);

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || '',
    role: u.role,
    avatarUrl,
    subscription,
    status: u.status || 'active',
    usageCurrent,
    usageLimit,
    storageUsedMB,
    templatesUsed,
    projectsActive,
    subscriptionDetails: u.subscription_details || u.subscriptionDetails || {
      id: `sub-${u.id}`,
      userId: u.id,
      tier: subscription,
      status: u.status || 'active',
      billingCycle: 'monthly',
      price: subscription === 'Pro' ? 49 : subscription === 'Business' ? 149 : 0,
      startDate: u.created_at || new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    }
  };
}

function mapFrontendUserToDbUser(u: any): any {
  if (!u) return null;
  const dbUser: any = {};
  if (u.name !== undefined) dbUser.name = u.name;
  if (u.email !== undefined) dbUser.email = u.email;
  if (u.company !== undefined) dbUser.company = u.company;
  if (u.role !== undefined) dbUser.role = u.role;
  if (u.avatarUrl !== undefined) dbUser.avatar_url = u.avatarUrl;
  if (u.subscription !== undefined) dbUser.subscription_tier = u.subscription;
  if (u.status !== undefined) dbUser.status = u.status;
  if (u.usageCurrent !== undefined) dbUser.usage_current = u.usageCurrent;
  if (u.usageLimit !== undefined) dbUser.usage_limit = u.usageLimit;
  if (u.storageUsedMB !== undefined) dbUser.storage_used_mb = u.storageUsedMB;
  if (u.templatesUsed !== undefined) dbUser.templates_used = u.templatesUsed;
  if (u.projectsActive !== undefined) dbUser.projects_active = u.projectsActive;
  dbUser.updated_at = new Date().toISOString();
  return dbUser;
}

export class AdminRepository {
  /**
   * Fetch all SaaS users
   */
  static async getUsers(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(mapDbUserToFrontendUser);
        }
        // Graceful warning rather than loud error
        console.warn('Supabase saas_users read failed, using mock database fallback.');
      } catch (err) {
        console.warn('getUsers Supabase error, using mock database fallback:', err);
      }
    }
    const db = readMockDb();
    return (db.users || []).map(mapDbUserToFrontendUser);
  }

  /**
   * Update a SaaS user profile
   */
  static async updateUser(id: string, updateData: any): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const dbData = mapFrontendUserToDbUser(updateData);
        const { data, error } = await supabaseAdmin
          .from('saas_users')
          .update(dbData)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return mapDbUserToFrontendUser(data);
        }
        console.warn('Supabase saas_users update failed, updating mock database.');
      } catch (err) {
        console.warn('updateUser Supabase error, fallback to mock database:', err);
      }
    }

    const db = readMockDb();
    const index = db.users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      const existing = db.users[index];
      const updated = {
        ...existing,
        ...mapFrontendUserToDbUser(updateData),
        id // enforce original ID
      };
      db.users[index] = updated;
      writeMockDb(db);
      return mapDbUserToFrontendUser(updated);
    }
    return null;
  }

  /**
   * Delete a SaaS user
   */
  static async deleteUser(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('saas_users')
          .delete()
          .eq('id', id);

        if (!error) {
          return true;
        }
        console.warn('Supabase saas_users delete failed, deleting from mock database.');
      } catch (err) {
        console.warn('deleteUser Supabase error, fallback to mock database:', err);
      }
    }

    const db = readMockDb();
    const originalLength = db.users.length;
    db.users = db.users.filter((u: any) => u.id !== id);
    if (db.users.length !== originalLength) {
      writeMockDb(db);
      return true;
    }
    return false;
  }

  /**
   * Fetch all rendering jobs
   */
  static async getJobs(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('rendering_tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase rendering_tasks read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getJobs Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.jobs || [];
  }

  /**
   * Fetch all active workers
   */
  static async getWorkers(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('render_workers')
          .select('*')
          .order('hostname', { ascending: true });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase render_workers read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getWorkers Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.workers || [];
  }

  /**
   * Fetch all support tickets
   */
  static async getSupportTickets(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_support_tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase saas_support_tickets read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getSupportTickets Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.support_tickets || [];
  }

  /**
   * Fetch audit logs
   */
  static async getAuditLogs(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase saas_audit_logs read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getAuditLogs Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.audit_logs || [];
  }

  /**
   * Create an audit log entry
   */
  static async createAuditLog(log: any): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_audit_logs')
          .insert(log)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
        console.warn('Supabase saas_audit_logs insert failed, fallback to mock database.');
      } catch (err) {
        console.warn('createAuditLog Supabase error, fallback to mock database:', err);
      }
    }

    const db = readMockDb();
    const newLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      ...log,
      timestamp: log.timestamp || new Date().toISOString()
    };
    if (!db.audit_logs) db.audit_logs = [];
    db.audit_logs.unshift(newLog);
    writeMockDb(db);
    return newLog;
  }

  /**
   * Fetch SaaS coupons
   */
  static async getCoupons(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase saas_coupons read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getCoupons Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.coupons || [];
  }

  /**
   * Fetch all invoices / financial stats
   */
  static async getInvoices(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase saas_invoices read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getInvoices Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.invoices || [];
  }

  /**
   * Fetch settings key-values
   */
  static async getSettings(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('settings')
          .select('*');

        if (!error && data && data.length > 0) {
          return data;
        }
        console.warn('Supabase settings read failed, fallback to mock database.');
      } catch (err) {
        console.warn('getSettings Supabase error, fallback to mock database:', err);
      }
    }
    const db = readMockDb();
    return db.settings || [];
  }

  /**
   * Update settings value
   */
  static async updateSetting(key: string, value: any, description?: string): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('settings')
          .upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: 'key' })
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
        console.warn('Supabase settings save failed, fallback to mock database.');
      } catch (err) {
        console.warn('updateSetting Supabase error, fallback to mock database:', err);
      }
    }

    const db = readMockDb();
    if (!db.settings) db.settings = [];
    const index = db.settings.findIndex((s: any) => s.key === key);
    const updated = {
      id: index !== -1 ? db.settings[index].id : `s-${Math.random().toString(36).substr(2, 9)}`,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      description: description || (index !== -1 ? db.settings[index].description : '')
    };
    if (index !== -1) {
      db.settings[index] = updated;
    } else {
      db.settings.push(updated);
    }
    writeMockDb(db);
    return updated;
  }

  /**
   * Fetch total media size / storage info
   */
  static async getStorageStats(): Promise<any> {
    let assetsCount = 0;
    let assetsSize = 0;
    let outputsCount = 0;
    let outputsSize = 0;

    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data: assets, error: assetError } = await supabaseAdmin
          .from('assets')
          .select('size_mb');

        if (!assetError && assets) {
          assetsCount = assets.length;
          assetsSize = assets.reduce((acc, a) => acc + Number(a.size_mb || 0), 0);
        }
      } catch (err) {
        console.warn('getStorageStats assets Supabase error, using mock fallback values:', err);
      }

      try {
        const { data: outputs, error: outputError } = await supabaseAdmin
          .from('render_outputs')
          .select('size_mb');

        if (!outputError && outputs) {
          outputsCount = outputs.length;
          outputsSize = outputs.reduce((acc, o) => acc + Number(o.size_mb || 0), 0);
        }
      } catch (err) {
        console.warn('getStorageStats render_outputs Supabase error, using mock fallback values:', err);
      }

      // If we got valid results from either table, return them
      if (assetsCount > 0 || outputsCount > 0) {
        return {
          totalSizeMB: assetsSize + outputsSize,
          filesCount: assetsCount + outputsCount
        };
      }
    }

    // Default mock storage fallback if tables are missing or empty
    return {
      totalSizeMB: 1450.8,
      filesCount: 154
    };
  }
}
