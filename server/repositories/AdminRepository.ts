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
          usage_current: 0,
          usage_limit: 100,
          storage_used_mb: 0,
          templates_used: 0,
          projects_active: 0,
          created_at: new Date().toISOString()
        }
      ],
      jobs: [],
      workers: [],
      invoices: [],
      support_tickets: [],
      audit_logs: [],
      coupons: [],
      settings: [
        { id: 's-1', key: 'saas_name', value: 'Viral Factory', description: 'Nome da plataforma SaaS' },
        { id: 's-2', key: 'saas_email', value: 'support@viralfactory.com', description: 'E-mail oficial' },
        { id: 's-3', key: 'stripe_secret_key', value: '', description: 'Chave secreta do Stripe' },
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

    // Default empty storage fallback if tables are missing or empty
    return {
      totalSizeMB: 0,
      filesCount: 0
    };
  }
}
