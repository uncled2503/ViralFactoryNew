import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient';
import { toUUID, toUUIDNullable, withRetry } from './SupabaseDbService';

const BUILTIN_TEMPLATES = [
  {
    id: 'tmp-reels-subtitles',
    name: 'Legendas Dinâmicas Neon',
    description: 'Template ideal para Reels, TikTok e Shorts com legendas destacadas e barra de progresso.',
    aspect: '9:16',
    defaultDuration: 30,
    scenesCount: 1,
    backgroundImageUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-video',
        type: 'video',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        order: 1,
        placeholder: 'Vídeo Principal'
      },
      {
        id: 'layer-subtitles',
        type: 'subtitles',
        x: 100,
        y: 1400,
        width: 880,
        height: 200,
        order: 10,
        font: 'Montserrat',
        size: 52,
        color: '#FFFFFF',
        weight: 'bold',
        strokeEnabled: true,
        strokeColor: '#000000',
        strokeWidth: 4
      }
    ]
  },
  {
    id: 'tmp-viral-split',
    name: 'Corte Viral Top/Bottom',
    description: 'Layout clássico com vídeo no topo e gameplay/loop satisfatório na base.',
    aspect: '9:16',
    defaultDuration: 30,
    scenesCount: 1,
    backgroundImageUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-video-top',
        type: 'video',
        x: 0,
        y: 0,
        width: 1080,
        height: 960,
        order: 1,
        placeholder: 'Vídeo do Topo'
      },
      {
        id: 'layer-video-bottom',
        type: 'video',
        x: 0,
        y: 960,
        width: 1080,
        height: 960,
        order: 2,
        placeholder: 'Gameplay/Fundo'
      }
    ]
  }
];

export class LocalDbMutex {
  private static queue: (() => Promise<void>)[] = [];
  private static isProcessing = false;

  // In-memory cache synced with Supabase PostgreSQL
  private static cachedDbData: any = null;
  private static isLoaded = false;
  private static writeTimeout: NodeJS.Timeout | null = null;

  /**
   * Pre-loads the entire database from Supabase PostgreSQL tables into memory.
   */
  public static async loadDb(): Promise<any> {
    if (this.isLoaded && this.cachedDbData !== null) {
      return this.cachedDbData;
    }

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      // Safe offline/test fallback inside memory
      if (this.cachedDbData === null) {
        this.cachedDbData = {
          saas_users: [],
          users: [],
          projects: [],
          templates: [],
          rendering_tasks: [],
          storage_folders: [],
          support_tickets: [],
          audit_logs: [],
          coupons: [],
          invoices: [],
          settings: [
            { id: 's-1', key: 'saas_name', value: 'Viral Factory', description: 'Nome da plataforma SaaS' },
            { id: 's-2', key: 'saas_email', value: 'support@viralfactory.com', description: 'E-mail oficial' },
            { id: 's-3', key: 'stripe_secret_key', value: '', description: 'Chave secreta do Stripe' },
            { id: 's-4', key: 'feature_flags', value: JSON.stringify({ aiSubtitles: true, batchRenders: false, stripeLive: false, offlineFallbackAuth: true, telemetryLogs: false }), description: 'FeatureFlags dinâmicas' }
          ]
        };
        this.cachedDbData.users = this.cachedDbData.saas_users;
      }
      this.isLoaded = true;
      return this.cachedDbData;
    }
    
    console.log('[LocalDbMutex] Preloading complete database cache from Supabase PostgreSQL...');
    try {
      const [usersRes, projectsRes, templatesRes, tasksRes, foldersRes, settingsRes, couponsRes, supportRes, auditRes, invoicesRes] = await Promise.all([
        supabaseAdmin.from('saas_users').select('*'),
        supabaseAdmin.from('projects').select('*'),
        supabaseAdmin.from('templates').select('*'),
        supabaseAdmin.from('rendering_tasks').select('*'),
        supabaseAdmin.from('configuration').select('*').eq('key_name', 'storage_folders').maybeSingle(),
        supabaseAdmin.from('configuration').select('*'),
        supabaseAdmin.from('saas_coupons').select('*'),
        supabaseAdmin.from('saas_support_tickets').select('*'),
        supabaseAdmin.from('saas_audit_logs').select('*'),
        supabaseAdmin.from('saas_invoices').select('*')
      ]);

      const saas_users = (usersRes && usersRes.data) ? usersRes.data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        company: u.company,
        role: u.role,
        avatarUrl: u.avatar_url,
        subscription: u.subscription_tier,
        status: u.status,
        usageCurrent: u.usage_current,
        usageLimit: u.usage_limit,
        storageUsedMB: u.storage_used_mb,
        templatesUsed: u.templates_used,
        projectsActive: u.projects_active,
        createdAt: u.created_at
      })) : [];

      const projects = (projectsRes && projectsRes.data) ? projectsRes.data.map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        description: p.description,
        aspect: p.aspect_ratio,
        variables: p.variables,
        status: p.status,
        videoUrl: p.video_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })) : [];

      const templates = (templatesRes && templatesRes.data) ? templatesRes.data.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        aspect: t.aspect_ratio,
        defaultDuration: t.duration_seconds,
        layers: t.layers,
        backgroundImageUrl: t.thumbnail_url,
        createdAt: t.created_at
      })) : [];

      const rendering_tasks = (tasksRes && tasksRes.data) ? tasksRes.data.map(t => ({
        id: t.id,
        projectId: t.project_id,
        userId: t.user_id,
        projectName: t.project_name,
        templateName: t.template_name,
        status: t.status,
        progress: t.progress,
        duration: t.duration,
        renderTime: t.render_time,
        outputUrl: t.output_url,
        errorMessage: t.error_message,
        logs: t.logs,
        debugInfo: t.debug_info,
        createdAt: t.created_at,
        completedAt: t.completed_at
      })) : [];

      let storage_folders: any[] = [];
      if (foldersRes && foldersRes.data && foldersRes.data.key_value) {
        try {
          storage_folders = typeof foldersRes.data.key_value === 'string' 
            ? JSON.parse(foldersRes.data.key_value) 
            : foldersRes.data.key_value;
        } catch (e) {
          console.error('[LocalDbMutex] Failed to parse storage_folders json:', e);
        }
      }

      const settings = (settingsRes && settingsRes.data) ? settingsRes.data.filter(s => s.key_name !== 'storage_folders' && s.key_name !== 'roypay_transactions').map(s => ({
        id: `cfg-${s.key_name}`,
        key: s.key_name,
        value: s.key_value,
        description: ''
      })) : [];

      const coupons = (couponsRes && couponsRes.data) ? couponsRes.data : [];
      const support_tickets = (supportRes && supportRes.data) ? supportRes.data : [];
      const audit_logs = (auditRes && auditRes.data) ? auditRes.data : [];
      const invoices = (invoicesRes && invoicesRes.data) ? invoicesRes.data : [];

      const existingTplIds = new Set(templates.map((t: any) => t.id));
      for (const bt of BUILTIN_TEMPLATES) {
        if (!existingTplIds.has(bt.id)) {
          templates.push(bt);
        }
      }

      this.cachedDbData = {
        saas_users,
        users: saas_users,
        projects,
        templates,
        rendering_tasks,
        storage_folders,
        settings,
        coupons,
        support_tickets,
        audit_logs,
        invoices
      };
      
      console.log(`[LocalDbMutex] Preloaded ${saas_users.length} users, ${projects.length} projects, ${templates.length} templates, ${rendering_tasks.length} tasks.`);
    } catch (err: any) {
      console.error('[LocalDbMutex] Failed to preload data from Supabase:', err.message || err);
      this.cachedDbData = {
        saas_users: [],
        users: [],
        projects: [],
        templates: [...BUILTIN_TEMPLATES],
        rendering_tasks: [],
        storage_folders: [],
        settings: [],
        coupons: [],
        support_tickets: [],
        audit_logs: [],
        invoices: []
      };
    }

    this.isLoaded = true;
    return this.cachedDbData;
  }

  /**
   * Returns cached DB data synchronously.
   */
  public static getDbDataSync(): any {
    if (!this.isLoaded || this.cachedDbData === null) {
      // Perform initial memory fallback
      this.cachedDbData = {
        saas_users: [],
        users: [],
        projects: [],
        templates: [...BUILTIN_TEMPLATES],
        rendering_tasks: [],
        storage_folders: [],
        support_tickets: [],
        audit_logs: [],
        coupons: [],
        invoices: [],
        settings: [
          { id: 's-1', key: 'saas_name', value: 'Viral Factory', description: 'Nome da plataforma SaaS' },
          { id: 's-2', key: 'saas_email', value: 'support@viralfactory.com', description: 'E-mail oficial' },
          { id: 's-3', key: 'stripe_secret_key', value: '', description: 'Chave secreta do Stripe' },
          { id: 's-4', key: 'feature_flags', value: JSON.stringify({ aiSubtitles: true, batchRenders: false, stripeLive: false, offlineFallbackAuth: true, telemetryLogs: false }), description: 'FeatureFlags dinâmicas' }
        ]
      };
      this.cachedDbData.users = this.cachedDbData.saas_users;
      this.isLoaded = true;
    }
    return this.cachedDbData;
  }

  /**
   * Flushes any pending writes to Supabase PostgreSQL immediately.
   */
  public static async flush(): Promise<void> {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
    }
    if (this.cachedDbData !== null) {
      await this.saveToSupabase(this.cachedDbData);
    }
  }

  /**
   * Runs an operation with exclusive write lock to prevent race conditions.
   */
  public static async runLocked<T>(fn: (dbData: any) => Promise<T> | T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const dbData = await this.loadDb();
          const result = await fn(dbData);

          if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
          }
          
          this.writeTimeout = setTimeout(async () => {
            this.writeTimeout = null;
            await this.saveToSupabase(dbData);
          }, 500); // 500ms debounce

          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (err) {
          console.error('[LocalDbMutex] Fail in database atomic write sequence:', err);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Performs the background upserts to corresponding Supabase PostgreSQL tables.
   */
  private static async saveToSupabase(dbData: any): Promise<void> {
    if (!isSupabaseConfigured() || !supabaseAdmin) return;
    
    console.log('[LocalDbMutex] Synchronizing changes to Supabase PostgreSQL...');
    try {
      // 1. Sync Users
      const usersToSync = dbData.saas_users || dbData.users;
      if (usersToSync && usersToSync.length > 0) {
        for (const u of usersToSync) {
          const userRecord = {
            id: toUUID(u.id),
            name: u.name,
            email: u.email,
            company: u.company || '',
            role: u.role || 'user',
            avatar_url: u.avatarUrl || u.avatar_url || '',
            subscription: u.subscription || u.subscription_tier || 'Free',
            subscription_tier: u.subscription || u.subscription_tier || 'Free',
            status: u.status || 'active',
            usage_current: u.usageCurrent !== undefined ? u.usageCurrent : (u.usage_current || 0),
            usage_limit: u.usageLimit !== undefined ? u.usageLimit : (u.usage_limit || 100),
            storage_used_mb: u.storageUsedMB !== undefined ? u.storageUsedMB : (u.storage_used_mb || 0),
            templates_used: u.templatesUsed !== undefined ? u.templatesUsed : (u.templates_used || 0),
            projects_active: u.projectsActive !== undefined ? u.projectsActive : (u.projects_active || 0),
            created_at: u.createdAt || u.created_at || new Date().toISOString()
          };
          
          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('saas_users')
              .upsert(userRecord, { onConflict: 'id' });
            if (error) throw error;
          });
        }
      }

      // 2. Sync Projects
      if (dbData.projects && dbData.projects.length > 0) {
        for (const p of dbData.projects) {
          const projectRecord = {
            id: toUUID(p.id),
            user_id: toUUID(p.userId || p.user_id),
            template_id: toUUIDNullable(p.templateId || p.template_id),
            name: p.name || 'Untitled',
            description: p.description || '',
            aspect: p.aspect || p.aspect_ratio || '16:9',
            aspect_ratio: p.aspect || p.aspect_ratio || '16:9',
            variables: p.variables || {},
            status: p.status || 'draft',
            video_url: p.videoUrl || p.video_url || '',
            created_at: p.createdAt || p.created_at || new Date().toISOString(),
            updated_at: p.updatedAt || p.updated_at || new Date().toISOString()
          };

          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('projects')
              .upsert(projectRecord, { onConflict: 'id' });
            if (error) throw error;
          });
        }
      }

      // 3. Sync Templates
      if (dbData.templates && dbData.templates.length > 0) {
        for (const t of dbData.templates) {
          const templateRecord = {
            id: toUUID(t.id),
            name: t.name || 'Untitled Template',
            description: t.description || '',
            aspect_ratio: t.aspect || t.aspect_ratio || '16:9',
            duration_seconds: t.defaultDuration || t.duration_seconds || 30,
            layers: t.layers || [],
            thumbnail_url: t.backgroundImageUrl || t.thumbnail_url || '',
            created_at: t.createdAt || t.created_at || new Date().toISOString()
          };

          await withRetry(async () => {
            const { error } = await supabaseAdmin!
              .from('templates')
              .upsert(templateRecord, { onConflict: 'id' });
            if (error) throw error;
          });
        }
      }

      // 4. Sync Rendering Tasks
      if (dbData.rendering_tasks && dbData.rendering_tasks.length > 0) {
        for (const t of dbData.rendering_tasks) {
          const taskRecord = {
            id: toUUID(t.id),
            project_id: toUUIDNullable(t.projectId || t.project_id),
            user_id: toUUID(t.userId || t.user_id),
            project_name: t.projectName || t.project_name || 'Project',
            template_name: t.templateName || t.template_name || 'Template',
            status: (t.status || 'queued').toLowerCase(),
            progress: t.progress || 0,
            duration: t.duration || '0:30',
            render_time: t.renderTime || t.render_time || '',
            output_url: t.outputUrl || t.output_url || '',
            error_message: t.errorMessage || t.error_message || '',
            logs: t.logs || [],
            debug_info: t.debugInfo || t.debug_info || {},
            created_at: t.createdAt || t.created_at || new Date().toISOString(),
            completed_at: t.completedAt || t.completed_at || null
          };

          await withRetry(async () => {
            if (taskRecord.project_id) {
              const { data: projExists } = await supabaseAdmin!
                .from('projects')
                .select('id')
                .eq('id', taskRecord.project_id)
                .maybeSingle();

              if (!projExists) {
                await supabaseAdmin!.from('projects').upsert({
                  id: taskRecord.project_id,
                  user_id: taskRecord.user_id,
                  name: taskRecord.project_name || 'Project',
                  status: 'draft',
                  created_at: new Date().toISOString()
                }, { onConflict: 'id' });
              }
            }

            const { error } = await supabaseAdmin!
              .from('rendering_tasks')
              .upsert(taskRecord, { onConflict: 'id' });
            if (error) throw error;
          });
        }
      }

      // 5. Sync Storage Folders in Configuration
      if (dbData.storage_folders) {
        const foldersConfig = {
          key_name: 'storage_folders',
          key_value: JSON.stringify(dbData.storage_folders),
          updated_at: new Date().toISOString()
        };
        await withRetry(async () => {
          const { error } = await supabaseAdmin!
            .from('configuration')
            .upsert(foldersConfig, { onConflict: 'key_name' });
          if (error) throw error;
        });
      }

      console.log('[LocalDbMutex] Synchronized changes to Supabase successfully.');
    } catch (err: any) {
      console.error('[LocalDbMutex] Background Supabase synchronization failed:', err.message || err);
    }
  }
}

// Flush cache on exit
process.on('SIGINT', async () => {
  console.log('[LocalDbMutex] SIGINT received. Flushing cache...');
  await LocalDbMutex.flush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[LocalDbMutex] SIGTERM received. Flushing cache...');
  await LocalDbMutex.flush();
  process.exit(0);
});

process.on('exit', () => {
  // Graceful exit handler
});
