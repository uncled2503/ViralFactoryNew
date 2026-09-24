import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';
import { LocalDbMutex } from '../database/LocalDbMutex';
import { StorageManager } from '../render/Storage';

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

function mapDbPlanToFrontendPlan(p: any): any {
  if (!p) return null;
  return {
    id: p.id,
    tier: p.tier,
    name: p.name,
    monthlyPrice: Number(p.monthly_price !== undefined ? p.monthly_price : p.monthlyPrice || 0),
    annualPrice: Number(p.annual_price !== undefined ? p.annual_price : p.annualPrice || 0),
    maxVideos: Number(p.max_videos !== undefined ? p.max_videos : p.maxVideos || 0),
    maxStorageGB: Number(p.max_storage_gb !== undefined ? p.max_storage_gb : p.maxStorageGB || 0),
    priority: p.priority || 'normal',
    watermark: !!p.watermark,
    aiSubtitles: p.ai_subtitles !== undefined ? !!p.ai_subtitles : !!p.aiSubtitles,
    batchRender: p.batch_render !== undefined ? !!p.batch_render : !!p.batchRender,
    status: p.status || 'active',
  };
}

function mapFrontendPlanToDbPlan(p: any): any {
  const dbPlan: any = {};
  if (p.id !== undefined) dbPlan.id = p.id;
  if (p.tier !== undefined) dbPlan.tier = p.tier;
  if (p.name !== undefined) dbPlan.name = p.name;
  if (p.monthlyPrice !== undefined) dbPlan.monthly_price = Number(p.monthlyPrice);
  if (p.annualPrice !== undefined) dbPlan.annual_price = Number(p.annualPrice);
  if (p.maxVideos !== undefined) dbPlan.max_videos = Number(p.maxVideos);
  if (p.maxStorageGB !== undefined) dbPlan.max_storage_gb = Number(p.maxStorageGB);
  if (p.priority !== undefined) dbPlan.priority = p.priority;
  if (p.watermark !== undefined) dbPlan.watermark = !!p.watermark;
  if (p.aiSubtitles !== undefined) dbPlan.ai_subtitles = !!p.aiSubtitles;
  if (p.batchRender !== undefined) dbPlan.batch_render = !!p.batchRender;
  if (p.status !== undefined) dbPlan.status = p.status;
  return dbPlan;
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
   * Reply to and resolve a support ticket
   */
  static async replyToSupportTicket(id: string, replyMessage: string): Promise<any | null> {
    const update = { status: 'resolved', reply_message: replyMessage, replied_at: new Date().toISOString() };

    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_support_tickets')
          .update(update)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.error('replyToSupportTicket Supabase error:', err);
      }
    }

    return LocalDbMutex.runLocked((dbData) => {
      const tickets = dbData.support_tickets || [];
      const index = tickets.findIndex((t: any) => t.id === id);
      if (index === -1) return null;
      tickets[index] = { ...tickets[index], status: 'resolved', reply_message: replyMessage };
      return tickets[index];
    });
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
   * Create a new SaaS coupon
   */
  static async createCoupon(coupon: any): Promise<any> {
    const newCoupon = {
      id: randomUUID(),
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      status: 'active',
      uses: 0,
      maxUses: Number(coupon.maxUses) || 150,
      expires: coupon.expires || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_coupons')
          .insert(newCoupon)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
        if (error) console.error('createCoupon Supabase error:', error.message);
      } catch (err) {
        console.error('createCoupon Supabase error:', err);
      }
    }

    return LocalDbMutex.runLocked((dbData) => {
      if (!dbData.coupons) dbData.coupons = [];
      dbData.coupons.unshift(newCoupon);
      return newCoupon;
    });
  }

  /**
   * Deactivate a coupon (soft-delete, keeps the row for audit purposes)
   */
  static async deactivateCoupon(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('saas_coupons')
          .update({ status: 'expired' })
          .eq('id', id);

        if (!error) return true;
      } catch (err) {
        console.error('deactivateCoupon Supabase error:', err);
      }
    }

    return LocalDbMutex.runLocked((dbData) => {
      const coupons = dbData.coupons || [];
      const index = coupons.findIndex((c: any) => c.id === id);
      if (index === -1) return false;
      coupons[index] = { ...coupons[index], status: 'expired' };
      return true;
    });
  }

  /**
   * Fetch all custom SaaS plans
   */
  static async getPlans(): Promise<any[]> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_plans')
          .select('*')
          .order('monthly_price', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(mapDbPlanToFrontendPlan);
        }
      } catch (err) {
        console.error('getPlans Supabase error:', err);
      }
    }
    return LocalDbMutex.getDbDataSync().plans || [];
  }

  /**
   * Create a new custom plan
   */
  static async createPlan(plan: any): Promise<any> {
    const newPlan = {
      id: randomUUID(),
      tier: plan.tier,
      name: plan.name,
      monthlyPrice: Number(plan.monthlyPrice) || 0,
      annualPrice: Number(plan.annualPrice) || 0,
      maxVideos: Number(plan.maxVideos) || 0,
      maxStorageGB: Number(plan.maxStorageGB) || 0,
      priority: plan.priority || 'normal',
      watermark: !!plan.watermark,
      aiSubtitles: !!plan.aiSubtitles,
      batchRender: !!plan.batchRender,
      status: 'active',
    };

    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_plans')
          .insert(mapFrontendPlanToDbPlan(newPlan))
          .select()
          .maybeSingle();

        if (!error && data) {
          return mapDbPlanToFrontendPlan(data);
        }
        if (error) console.error('createPlan Supabase error:', error.message);
      } catch (err) {
        console.error('createPlan Supabase error:', err);
      }
    }

    return LocalDbMutex.runLocked((dbData) => {
      if (!dbData.plans) dbData.plans = [];
      dbData.plans.push(newPlan);
      return newPlan;
    });
  }

  /**
   * Update an existing custom plan
   */
  static async updatePlan(id: string, updates: any): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_plans')
          .update(mapFrontendPlanToDbPlan(updates))
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return mapDbPlanToFrontendPlan(data);
        }
      } catch (err) {
        console.error('updatePlan Supabase error:', err);
      }
    }

    const numericFields = ['monthlyPrice', 'annualPrice', 'maxVideos', 'maxStorageGB'];
    const coercedUpdates = { ...updates };
    for (const field of numericFields) {
      if (coercedUpdates[field] !== undefined) coercedUpdates[field] = Number(coercedUpdates[field]);
    }

    return LocalDbMutex.runLocked((dbData) => {
      const plans = dbData.plans || [];
      const index = plans.findIndex((p: any) => p.id === id);
      if (index === -1) return null;
      plans[index] = { ...plans[index], ...coercedUpdates, id };
      return plans[index];
    });
  }

  /**
   * Archive a custom plan (soft-delete; existing subscribers keep their plan reference)
   */
  static async archivePlan(id: string): Promise<boolean> {
    const updated = await this.updatePlan(id, { status: 'archived' });
    return !!updated;
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
   * Mark an invoice as refunded. This is a bookkeeping-only action — it does not call out to the
   * payment gateway (RoyPay) to move money. The actual refund/cashout must still be issued
   * manually in the RoyPay dashboard; this just keeps the SaaS's own records in sync and audited.
   */
  static async markInvoiceRefunded(id: string): Promise<any | null> {
    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('saas_invoices')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.error('markInvoiceRefunded Supabase error:', err);
      }
    }

    return LocalDbMutex.runLocked((dbData) => {
      const invoices = dbData.invoices || [];
      const index = invoices.findIndex((i: any) => i.id === id);
      if (index === -1) return null;
      invoices[index] = { ...invoices[index], status: 'refunded' };
      return invoices[index];
    });
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

    const cache = this.readLocalDir(path.join(process.cwd(), 'temp_render'));

    return {
      totalSizeMB: parseFloat(assetsSize.toFixed(2)),
      filesCount: assetsCount,
      cacheSizeMB: cache.sizeMB,
      cacheFilesCount: cache.count,
    };
  }

  /**
   * Real breakdown of local on-disk storage directories (uploads/rendered/templates permanent
   * storage + the temp render cache). Supabase-hosted assets are reported as a single aggregate
   * row since individual object listing isn't needed for this admin view.
   */
  static async getStorageDirectories(): Promise<any[]> {
    const base = path.join(process.cwd(), 'public', 'storage');
    const dirs = [
      { key: 'uploads', desc: 'Uploads de mídia enviados pelos usuários' },
      { key: 'rendered', desc: 'Vídeos finais renderizados' },
      { key: 'templates', desc: 'Templates públicos e assets reutilizáveis' },
    ];

    const rows = dirs.map(d => {
      const stats = this.readLocalDir(path.join(base, d.key));
      return {
        path: `local:/public/storage/${d.key}`,
        count: stats.count,
        size: `${stats.sizeMB.toFixed(2)} MB`,
        desc: d.desc,
      };
    });

    const cache = this.readLocalDir(path.join(process.cwd(), 'temp_render'));
    rows.push({
      path: 'local:/temp_render',
      count: cache.count,
      size: `${cache.sizeMB.toFixed(2)} MB`,
      desc: 'Cache de renderização temporário (expurgável)',
    });

    if (isSupabaseConfigured() && supabaseAdmin) {
      try {
        const { data: assets, error } = await supabaseAdmin.from('assets').select('size_mb');
        if (!error && assets) {
          const sizeMB = assets.reduce((acc, a) => acc + Number(a.size_mb || 0), 0);
          rows.push({
            path: 'supabase:/assets',
            count: assets.length,
            size: `${sizeMB.toFixed(2)} MB`,
            desc: 'Ativos hospedados no Supabase Storage',
          });
        }
      } catch (err) {
        console.error('getStorageDirectories assets Supabase error:', err);
      }
    }

    return rows;
  }

  /**
   * Deletes every file inside the local temp render cache directory. This only touches transient
   * working files created mid-render (temp_render/) — never final outputs or user uploads, which
   * live in public/storage or Supabase Storage instead.
   */
  static async sweepTempCache(): Promise<{ filesRemoved: number; sizeFreedMB: number }> {
    const before = this.readLocalDir(path.join(process.cwd(), 'temp_render'));
    StorageManager.clearTempDir();
    return { filesRemoved: before.count, sizeFreedMB: parseFloat(before.sizeMB.toFixed(2)) };
  }

  private static readLocalDir(dirPath: string): { count: number; sizeMB: number } {
    if (!fs.existsSync(dirPath)) return { count: 0, sizeMB: 0 };
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      let count = 0;
      let sizeBytes = 0;
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        count++;
        try {
          sizeBytes += fs.statSync(path.join(dirPath, entry.name)).size;
        } catch {
          // file may have been removed concurrently; skip
        }
      }
      return { count, sizeMB: sizeBytes / (1024 * 1024) };
    } catch {
      return { count: 0, sizeMB: 0 };
    }
  }
}
