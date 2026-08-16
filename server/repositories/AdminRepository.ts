import { randomUUID } from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';
import { LocalDbMutex } from '../database/LocalDbMutex';

function mapDbUserToFrontendUser(u: any): any {
  if (!u) return null;
  const subscription = u.subscription_tier || u.subscription || 'Starter';
  const avatarUrl = u.avatar_url || u.avatarUrl || '';
  const usageCurrent = u.usage_current !== undefined ? u.usage_current : (u.usageCurrent || 0);
  const usageLimit = u.usage_limit !== undefined ? u.usage_limit : (u.usageLimit || 100);
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
  if (u.subscription !== undefined) {
    dbUser.subscription_tier = u.subscription;
    dbUser.subscription = u.subscription;
  }
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
      } catch (err) {
        console.error('getUsers Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
    return (db.saas_users || []).map(mapDbUserToFrontendUser);
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
      } catch (err) {
        console.error('updateUser Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
    const users = db.saas_users || db.users || [];
    const index = users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      const updated = {
        ...users[index],
        ...mapFrontendUserToDbUser(updateData),
        id
      };
      users[index] = updated;
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
      } catch (err) {
        console.error('deleteUser Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
    const lenBefore = db.saas_users.length;
    db.saas_users = db.saas_users.filter((u: any) => u.id !== id);
    db.users = db.saas_users;
    return db.saas_users.length !== lenBefore;
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
      } catch (err) {
        console.error('getJobs Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().rendering_tasks || [];
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
      } catch (err) {
        console.error('getWorkers Supabase error:', err);
      }
    }
    return [];
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
      } catch (err) {
        console.error('getSupportTickets Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().support_tickets || [];
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
      } catch (err) {
        console.error('getAuditLogs Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().audit_logs || [];
  }

  /**
   * Create an audit log entry
   */
  static async createAuditLog(log: any): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_audit_logs')
          .insert({
            admin_name: log.admin_name || 'System',
            action: log.action || 'ACTION',
            target_user: log.target_user || 'SYSTEM',
            ip: log.ip || '127.0.0.1',
            status: log.status || 'SUCCESS',
            timestamp: log.timestamp || new Date().toISOString()
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.error('createAuditLog Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
    const newLog = {
      id: randomUUID(),
      admin_name: log.admin_name || 'System',
      action: log.action || 'ACTION',
      target_user: log.target_user || 'SYSTEM',
      ip: log.ip || '127.0.0.1',
      status: log.status || 'SUCCESS',
      timestamp: log.timestamp || new Date().toISOString()
    };
    if (!db.audit_logs) db.audit_logs = [];
    db.audit_logs.unshift(newLog);
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
      } catch (err) {
        console.error('getCoupons Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().coupons || [];
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
      } catch (err) {
        console.error('getInvoices Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().invoices || [];
  }

  /**
   * Fetch settings key-values
   */
  static async getSettings(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('configuration')
          .select('*');

        if (!error && data && data.length > 0) {
          return data.map(r => ({
            id: `cfg-${r.key_name}`,
            key: r.key_name,
            value: r.key_value,
            description: ''
          }));
        }
      } catch (err) {
        console.error('getSettings Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
    return (db.settings || []).map((s: any) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description || ''
    }));
  }

  /**
   * Update settings value
   */
  static async updateSetting(key: string, value: any, description?: string): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('configuration')
          .upsert({ 
            key_name: key, 
            key_value: typeof value === 'string' ? value : JSON.stringify(value), 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'key_name' })
          .select()
          .maybeSingle();

        if (!error && data) {
          return {
            id: `cfg-${data.key_name}`,
            key: data.key_name,
            value: data.key_value,
            description: description || ''
          };
        }
      } catch (err) {
        console.error('updateSetting Supabase error:', err);
      }
    }
    const db = LocalDbMutex.getDbDataSync();
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
    return updated;
  }

  /**
   * Fetch total media size / storage info
   */
  static async getStorageStats(): Promise<any> {
    let assetsCount = 0;
    let assetsSize = 0;

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
        console.error('getStorageStats assets Supabase error:', err);
      }
    }

    return {
      totalSizeMB: parseFloat(assetsSize.toFixed(2)),
      filesCount: assetsCount
    };
  }
}
