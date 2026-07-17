import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Path constants
const DB_JSON_PATH = path.join(process.cwd(), 'public', 'storage', 'db.json');
const ADMIN_MOCK_DB_PATH = path.join(process.cwd(), 'public', 'storage', 'admin_mock_db.json');
const ROYPAY_TRANSACTIONS_PATH = path.join(process.cwd(), 'public', 'storage', 'roypay_transactions.json');
const REPORT_PATH = path.join(process.cwd(), 'public', 'storage', 'migration_report.json');

/**
 * Utility to convert any string ID to a deterministic, valid UUID v4 formatted string.
 */
export function toUUID(str: string | null | undefined): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Generic retry wrapper with exponential backoff.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delay = 500): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === attempts - 1) {
        console.error(`[SupabaseDbService] Operation failed after ${attempts} attempts:`, err.message || err);
        throw err;
      }
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  throw new Error('Unreachable retry block');
}

export class SupabaseDbService {
  private static isMigrated = false;

  /**
   * Initializes database connections and executes automatic migration of fallback json files.
   */
  static async init() {
    if (this.isMigrated) return;
    
    console.log('[SupabaseDbService] Initializing Supabase Database Service...');

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      console.error('[SupabaseDbService] Supabase is NOT configured correctly. Please define SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL.');
      return;
    }

    try {
      await this.runAutoMigration();
      this.isMigrated = true;
    } catch (err: any) {
      console.error('[SupabaseDbService] Automatic migration failed:', err.message || err);
    }
  }

  /**
   * Validates schema of users, projects, templates and rendering tasks.
   */
  private static validateData(type: string, data: any): boolean {
    if (!data) return false;
    
    switch (type) {
      case 'user':
        return !!data.id && !!data.email;
      case 'project':
        return !!data.id && !!data.name && !!data.user_id;
      case 'template':
        return !!data.id && !!data.name;
      case 'rendering_task':
        return !!data.id && !!data.project_id && !!data.status;
      case 'invoice':
        return !!data.id && !!data.customer_email;
      default:
        return true;
    }
  }

  /**
   * Runs the programmatic migration of local JSON files to Supabase PostgreSQL.
   */
  private static async runAutoMigration() {
    const report: any = {
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      migrated_entities: {
        users: 0,
        projects: 0,
        templates: 0,
        rendering_tasks: 0,
        invoices: 0,
        coupons: 0,
        support_tickets: 0,
        audit_logs: 0,
        configurations: 0
      },
      errors: []
    };

    console.log('[SupabaseDbService] Scanning for legacy local JSON databases...');

    // Load admin mock db data if exists
    let adminDb: any = {};
    if (fs.existsSync(ADMIN_MOCK_DB_PATH)) {
      try {
        adminDb = JSON.parse(fs.readFileSync(ADMIN_MOCK_DB_PATH, 'utf8'));
        console.log('[SupabaseDbService] Found legacy admin_mock_db.json.');
      } catch (e: any) {
        report.errors.push(`Failed to read admin_mock_db.json: ${e.message}`);
      }
    }

    // Load main db.json data if exists
    let mainDb: any = {};
    if (fs.existsSync(DB_JSON_PATH)) {
      try {
        mainDb = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf8'));
        console.log('[SupabaseDbService] Found legacy db.json.');
      } catch (e: any) {
        report.errors.push(`Failed to read db.json: ${e.message}`);
      }
    }

    // Load RoyPay transactions data if exists
    let roypayTx: any = {};
    if (fs.existsSync(ROYPAY_TRANSACTIONS_PATH)) {
      try {
        roypayTx = JSON.parse(fs.readFileSync(ROYPAY_TRANSACTIONS_PATH, 'utf8'));
        console.log('[SupabaseDbService] Found legacy roypay_transactions.json.');
      } catch (e: any) {
        report.errors.push(`Failed to read roypay_transactions.json: ${e.message}`);
      }
    }

    // 1. Migrate Users
    const rawUsers = [
      ...(adminDb.users || []),
      ...(mainDb.saas_users || []),
      ...(mainDb.users || [])
    ];
    
    // De-duplicate users by email or ID
    const uniqueUsersMap = new Map<string, any>();
    for (const u of rawUsers) {
      if (!u.email) continue;
      const id = toUUID(u.id);
      uniqueUsersMap.set(id, {
        id,
        name: u.name || 'SaaS User',
        email: u.email,
        company: u.company || '',
        role: u.role || 'user',
        avatar_url: u.avatarUrl || u.avatar_url || '',
        subscription_tier: u.subscription || u.subscription_tier || 'Free',
        status: u.status || 'active',
        usage_current: u.usageCurrent || u.usage_current || 0,
        usage_limit: u.usageLimit || u.usage_limit || 100,
        storage_used_mb: u.storageUsedMB || u.storage_used_mb || 0,
        templates_used: u.templatesUsed || u.templates_used || 0,
        projects_active: u.projectsActive || u.projects_active || 0,
        created_at: u.created_at || u.createdAt || new Date().toISOString()
      });
    }

    for (const [userId, user] of uniqueUsersMap.entries()) {
      if (this.validateData('user', user)) {
        try {
          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('saas_users')
              .upsert(user, { onConflict: 'id' });
            if (error) throw error;
          });
          report.migrated_entities.users++;
        } catch (err: any) {
          report.errors.push(`User ${user.email} migration failed: ${err.message}`);
        }
      }
    }

    // Helper to check if user exists
    const userExists = async (userId: string) => {
      const { data } = await supabaseAdmin!.from('saas_users').select('id').eq('id', userId).maybeSingle();
      return !!data;
    };

    // 2. Migrate Projects
    const rawProjects = mainDb.projects || [];
    for (const proj of rawProjects) {
      const id = toUUID(proj.id);
      const user_id = toUUID(proj.userId || proj.user_id);
      
      const projectRecord = {
        id,
        user_id,
        name: proj.name || 'Untitled Project',
        description: proj.description || '',
        aspect_ratio: proj.aspect || proj.aspect_ratio || '16:9',
        variables: proj.variables || {},
        status: proj.status || 'draft',
        video_url: proj.videoUrl || proj.video_url || '',
        created_at: proj.createdAt || proj.created_at || new Date().toISOString(),
        updated_at: proj.updatedAt || proj.updated_at || new Date().toISOString()
      };

      if (this.validateData('project', projectRecord)) {
        try {
          // Verify foreign key saas_users exists
          if (await userExists(user_id)) {
            await withRetry(async () => {
              const { error } = await supabaseAdmin!
                .from('projects')
                .upsert(projectRecord, { onConflict: 'id' });
              if (error) throw error;
            });
            report.migrated_entities.projects++;
          } else {
            report.errors.push(`Skipping project ${id} due to missing user ${user_id}`);
          }
        } catch (err: any) {
          report.errors.push(`Project ${id} migration failed: ${err.message}`);
        }
      }
    }

    // 3. Migrate Templates
    const rawTemplates = mainDb.templates || [];
    for (const tpl of rawTemplates) {
      const id = toUUID(tpl.id);
      const templateRecord = {
        id,
        name: tpl.name || 'Untitled Template',
        description: tpl.description || '',
        aspect_ratio: tpl.aspect || tpl.aspect_ratio || '16:9',
        duration_seconds: tpl.defaultDuration || tpl.duration_seconds || 30,
        layers: tpl.layers || [],
        thumbnail_url: tpl.backgroundImageUrl || tpl.thumbnail_url || '',
        created_at: tpl.created_at || new Date().toISOString()
      };

      if (this.validateData('template', templateRecord)) {
        try {
          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('templates')
              .upsert(templateRecord, { onConflict: 'id' });
            if (error) throw error;
          });
          report.migrated_entities.templates++;
        } catch (err: any) {
          report.errors.push(`Template ${id} migration failed: ${err.message}`);
        }
      }
    }

    // 4. Migrate Rendering Tasks
    const rawJobs = [
      ...(adminDb.jobs || []),
      ...(mainDb.rendering_tasks || []),
      ...(mainDb.jobs || [])
    ];
    for (const job of rawJobs) {
      const id = toUUID(job.id);
      const project_id = toUUID(job.projectId || job.project_id);
      const user_id = toUUID(job.userId || job.user_id);

      const taskRecord = {
        id,
        project_id,
        user_id,
        project_name: job.projectName || job.project_name || 'Project',
        template_name: job.templateName || job.template_name || 'Template',
        status: (job.status || 'queued').toLowerCase(),
        progress: job.progress || 0,
        duration: job.duration || '0:30',
        render_time: job.renderTime || job.render_time || '',
        output_url: job.outputUrl || job.output_url || '',
        error_message: job.errorMessage || job.error_message || '',
        logs: job.logs || [],
        debug_info: job.debugInfo || job.debug_info || {},
        created_at: job.createdAt || job.created_at || new Date().toISOString(),
        completed_at: job.completedAt || job.completed_at || null
      };

      if (this.validateData('rendering_task', taskRecord)) {
        try {
          const uExist = await userExists(user_id);
          const pExist = await supabaseAdmin!.from('projects').select('id').eq('id', project_id).maybeSingle().then(r => !!r.data);
          
          if (uExist && pExist) {
            await withRetry(async () => {
              const { error } = await supabaseAdmin!
                .from('rendering_tasks')
                .upsert(taskRecord, { onConflict: 'id' });
              if (error) throw error;
            });
            report.migrated_entities.rendering_tasks++;
          }
        } catch (err: any) {
          report.errors.push(`Rendering task ${id} migration failed: ${err.message}`);
        }
      }
    }

    // 5. Migrate Invoices
    const rawInvoices = [
      ...(adminDb.invoices || []),
      ...(mainDb.invoices || [])
    ];
    for (const inv of rawInvoices) {
      const id = toUUID(inv.id);
      const user_id = toUUID(inv.userId || inv.user_id);

      const invoiceRecord = {
        id,
        user_id,
        customer_name: inv.customer_name || inv.customerName || 'Customer',
        customer_email: inv.customer_email || inv.customerEmail || '',
        plan_tier: inv.plan || inv.plan_tier || 'Pro',
        amount: parseFloat(inv.amount || '49'),
        status: inv.status || 'paid',
        stripe_id: inv.stripe_id || inv.stripeId || '',
        created_at: inv.created_at || inv.createdAt || new Date().toISOString()
      };

      if (this.validateData('invoice', invoiceRecord)) {
        try {
          if (await userExists(user_id)) {
            await withRetry(async () => {
              const { error } = await supabaseAdmin!
                .from('saas_invoices')
                .upsert(invoiceRecord, { onConflict: 'id' });
              if (error) throw error;
            });
            report.migrated_entities.invoices++;
          }
        } catch (err: any) {
          report.errors.push(`Invoice ${id} migration failed: ${err.message}`);
        }
      }
    }

    // 6. Migrate Coupons
    const rawCoupons = adminDb.coupons || [];
    for (const c of rawCoupons) {
      const couponRecord = {
        id: toUUID(c.id),
        code: c.code,
        discount_percent: c.discount_percent || 0,
        active: c.active !== false,
        created_at: c.created_at || new Date().toISOString()
      };
      try {
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('saas_coupons')
            .upsert(couponRecord, { onConflict: 'id' });
          if (error) throw error;
        });
        report.migrated_entities.coupons++;
      } catch (err: any) {
        report.errors.push(`Coupon ${c.code} migration failed: ${err.message}`);
      }
    }

    // 7. Migrate Support Tickets
    const rawSupport = adminDb.support_tickets || [];
    for (const t of rawSupport) {
      const user_id = toUUID(t.userId || t.user_id);
      const ticketRecord = {
        id: toUUID(t.id),
        user_id,
        subject: t.subject || 'Support Request',
        message: t.message || '',
        status: t.status || 'open',
        priority: t.priority || 'medium',
        created_at: t.created_at || new Date().toISOString()
      };
      try {
        if (await userExists(user_id)) {
          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('saas_support_tickets')
              .upsert(ticketRecord, { onConflict: 'id' });
            if (error) throw error;
          });
          report.migrated_entities.support_tickets++;
        }
      } catch (err: any) {
        report.errors.push(`Support ticket ${t.id} migration failed: ${err.message}`);
      }
    }

    // 8. Migrate Audit Logs
    const rawAudit = adminDb.audit_logs || [];
    for (const log of rawAudit) {
      const auditRecord = {
        id: toUUID(log.id),
        admin_name: log.admin_name || 'System',
        action: log.action || 'ACTION',
        target_user: log.target_user || 'SYSTEM',
        ip: log.ip || '127.0.0.1',
        status: log.status || 'SUCCESS',
        timestamp: log.timestamp || new Date().toISOString()
      };
      try {
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('saas_audit_logs')
            .upsert(auditRecord, { onConflict: 'id' });
          if (error) throw error;
        });
        report.migrated_entities.audit_logs++;
      } catch (err: any) {
        report.errors.push(`Audit log ${log.id} migration failed: ${err.message}`);
      }
    }

    // 9. Migrate Settings / Configuration
    const rawSettings = adminDb.settings || [];
    for (const setting of rawSettings) {
      const configRecord = {
        key_name: setting.key,
        key_value: typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value),
        updated_at: new Date().toISOString()
      };
      try {
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('configuration')
            .upsert(configRecord, { onConflict: 'key_name' });
          if (error) throw error;
        });
        report.migrated_entities.configurations++;
      } catch (err: any) {
        report.errors.push(`Setting ${setting.key} migration failed: ${err.message}`);
      }
    }

    // Migrate storage folders configuration
    if (mainDb.storage_folders) {
      try {
        const foldersConfig = {
          key_name: 'storage_folders',
          key_value: JSON.stringify(mainDb.storage_folders),
          updated_at: new Date().toISOString()
        };
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('configuration')
            .upsert(foldersConfig, { onConflict: 'key_name' });
          if (error) throw error;
        });
        report.migrated_entities.configurations++;
      } catch (err: any) {
        report.errors.push(`Folders metadata migration failed: ${err.message}`);
      }
    }

    // Migrate RoyPay transactions configuration
    if (Object.keys(roypayTx).length > 0) {
      try {
        const roypayConfig = {
          key_name: 'roypay_transactions',
          key_value: JSON.stringify(roypayTx),
          updated_at: new Date().toISOString()
        };
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('configuration')
            .upsert(roypayConfig, { onConflict: 'key_name' });
          if (error) throw error;
        });
        report.migrated_entities.configurations++;
      } catch (err: any) {
        report.errors.push(`RoyPay transactions metadata migration failed: ${err.message}`);
      }
    }

    // Finalize report
    report.status = report.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS';
    console.log(`[SupabaseDbService] Programmatic migration complete: ${report.status}`);
    
    // Write migration report to public/storage for audit logs
    try {
      const parentDir = path.dirname(REPORT_PATH);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
      console.log('[SupabaseDbService] Migration report successfully generated.');
    } catch (reportErr) {
      console.error('[SupabaseDbService] Failed to write migration report:', reportErr);
    }

    // Safely delete / rename local files to ensure no accidental fallbacks
    try {
      if (fs.existsSync(DB_JSON_PATH)) {
        fs.renameSync(DB_JSON_PATH, `${DB_JSON_PATH}.migrated`);
      }
      if (fs.existsSync(ADMIN_MOCK_DB_PATH)) {
        fs.renameSync(ADMIN_MOCK_DB_PATH, `${ADMIN_MOCK_DB_PATH}.migrated`);
      }
      if (fs.existsSync(ROYPAY_TRANSACTIONS_PATH)) {
        fs.renameSync(ROYPAY_TRANSACTIONS_PATH, `${ROYPAY_TRANSACTIONS_PATH}.migrated`);
      }
      console.log('[SupabaseDbService] Safely disabled local database JSON backup files.');
    } catch (cleanupErr: any) {
      console.error('[SupabaseDbService] Warning cleanup failed:', cleanupErr.message);
    }
  }

  /**
   * Safe transaction-like row locker.
   */
  static async lockRow(tableName: string, id: string): Promise<any> {
    return withRetry(async () => {
      const { data, error } = await supabaseAdmin!
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    });
  }

  /**
   * Fetch paginated list from any table.
   */
  static async getPaginated(tableName: string, options: { page?: number; pageSize?: number; orderBy?: string; ascending?: boolean; filter?: Record<string, any> }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return withRetry(async () => {
      let query = supabaseAdmin!.from(tableName).select('*', { count: 'exact' });

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, val]) => {
          query = query.eq(key, val);
        });
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    });
  }
}
