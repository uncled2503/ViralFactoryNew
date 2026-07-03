import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { JobQueue, RenderJob, JobStatus } from './JobQueue';
import { StorageManager } from './Storage';
import { TemplateEngine } from './TemplateEngine';
import { LayerEngine } from './LayerEngine';
import { TextEngine } from './TextEngine';
import { ExportEngine } from './ExportEngine';
import { OutputManager } from './OutputManager';

// Initialize server-side Supabase if config is provided
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project-id.supabase.co';

const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;

export class RenderEngine {
  /**
   * Main entrypoint to process an active rendering Job
   */
  static async processJob(jobId: string): Promise<RenderJob> {
    const job = JobQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const startTime = Date.now();
    console.log(`[RenderEngine] Starting job ${jobId} for user ${job.userId}`);

    try {
      // Step 1: PREPARING (Download assets, initialize storage)
      JobQueue.updateProgress(jobId, 'Preparing', 10);
      await this.saveDbStatus(jobId, 'Preparing', 10);

      // Resolve database project and template instances
      const projectData = await this.fetchProject(job.projectId, job.userId);
      const templateData = await this.fetchTemplate(job.templateId, job.userId);

      if (!projectData || !templateData) {
        throw new Error('Required project or template data is missing from the database');
      }

      // 2. TEMPLATE ENGINE (Compile variables and layouts)
      console.log('[RenderEngine] Resolving layout constraints via TemplateEngine');
      const compiledLayout = TemplateEngine.compile(templateData, projectData);

      // 3. TEXT ENGINE (Replace merge tags in headlines and subtitles)
      console.log('[RenderEngine] Processing dynamic text substitutions via TextEngine');
      if (compiledLayout.headline) {
        compiledLayout.headline.text = TextEngine.parse(compiledLayout.headline.text, job.variables);
      }
      if (compiledLayout.subheadline) {
        compiledLayout.subheadline.text = TextEngine.parse(compiledLayout.subheadline.text, job.variables);
      }
      if (compiledLayout.cta) {
        compiledLayout.cta.text = TextEngine.parse(compiledLayout.cta.text, job.variables);
      }
      if (compiledLayout.subtitles && compiledLayout.subtitles.text) {
        compiledLayout.subtitles.text = compiledLayout.subtitles.text.map(t => 
          TextEngine.parse(t, job.variables)
        );
      }

      // 4. LAYER ENGINE (Arrange stack order: BG -> Video -> Logo -> Subtitles -> CTA -> Progress Bar)
      console.log('[RenderEngine] Layering render composite stack via LayerEngine');
      const renderLayers = LayerEngine.compileLayers(compiledLayout);

      // 5. EXPORT ENGINE (Assemble video layout and invoke stream compiler)
      JobQueue.updateProgress(jobId, 'Rendering', 25);
      await this.saveDbStatus(jobId, 'processing', 25);

      const fileName = `${job.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}.mp4`;
      const tempOutputPath = StorageManager.getTempPath(fileName);

      console.log('[RenderEngine] Spawning rendering process');
      
      // Execute render compilation and listen for frame updates
      await ExportEngine.render(renderLayers, tempOutputPath, async (percent) => {
        const renderStatus: JobStatus = percent < 50 ? 'Rendering' : 'Encoding';
        const dbStatus = 'processing';
        JobQueue.updateProgress(jobId, renderStatus, percent);
        await this.saveDbStatus(jobId, dbStatus, percent);
      });

      // 6. SAVING AND POST-PROCESSING (Upload final file, generate thumbnails)
      JobQueue.updateProgress(jobId, 'Saving', 90);
      await this.saveDbStatus(jobId, 'processing', 90);

      const permanentVideoUrl = StorageManager.saveToStorage(tempOutputPath, 'rendered', fileName);
      const publicVideoPath = StorageManager.getStoragePath('rendered', fileName);

      // Extract high resolution frame thumbnail
      const thumbFileName = fileName.replace('.mp4', '.jpg');
      const tempThumbPath = StorageManager.getTempPath(thumbFileName);
      const publicThumbPath = StorageManager.getStoragePath('rendered', thumbFileName);
      
      await OutputManager.generateThumbnail(publicVideoPath, tempThumbPath);
      const permanentThumbUrl = StorageManager.saveToStorage(tempThumbPath, 'rendered', thumbFileName);

      const renderDurationSeconds = Math.round((Date.now() - startTime) / 1000);
      const renderTimeStr = `${renderDurationSeconds}s`;

      const completedJobUpdates = {
        status: 'Completed' as const,
        progress: 100,
        renderTime: renderTimeStr,
        outputUrl: permanentVideoUrl,
        thumbnailUrl: permanentThumbUrl,
        completedAt: new Date().toISOString()
      };

      // Update in-memory JobQueue state
      JobQueue.updateJob(jobId, completedJobUpdates);

      // Save complete status to databases
      await this.saveDbStatus(jobId, 'completed', 100, permanentVideoUrl, renderTimeStr);
      await this.registerRenderedFile(job.userId, job.projectId, job.projectName, permanentVideoUrl);

      console.log(`[RenderEngine] Job ${jobId} rendered successfully in ${renderTimeStr}`);
      return JobQueue.getJob(jobId)!;

    } catch (err: any) {
      console.error(`[RenderEngine] Rendering job ${jobId} failed:`, err);
      const failedJobUpdates = {
        status: 'Failed' as const,
        progress: 0,
        error: err.message || 'Erro inesperado no pipeline de renderização'
      };

      JobQueue.updateJob(jobId, failedJobUpdates);
      await this.saveDbStatus(jobId, 'failed', 0, undefined, undefined, err.message);
      
      throw err;
    }
  }

  /**
   * Direct fetching of Project record from Supabase database or Server JSON database
   */
  private static async fetchProject(projectId: string, userId: string): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return data;
    }

    // Fallback Server database (public/storage/db.json)
    return this.getLocalDbItem('projects', { id: projectId, user_id: userId });
  }

  /**
   * Direct fetching of Template record
   */
  private static async fetchTemplate(templateId: string, userId: string): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();
      if (!error && data) return data;
    }

    return this.getLocalDbItem('templates', { id: templateId });
  }

  /**
   * Server-side local JSON file database manager
   */
  private static getLocalDbItem(table: string, filters: Record<string, any>): any {
    try {
      const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
      if (!fs.existsSync(dbPath)) return null;
      
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const items = dbData[table] || [];
      return items.find((item: any) => 
        Object.entries(filters).every(([key, val]) => item[key] === val)
      ) || null;
    } catch {
      return null;
    }
  }

  /**
   * Writes job progress changes directly to Supabase or JSON file database
   */
  private static async saveDbStatus(
    jobId: string,
    status: string,
    progress: number,
    videoUrl?: string,
    renderTime?: string,
    errorMsg?: string
  ) {
    const timeNow = new Date().toISOString();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('rendering_tasks')
          .update({
            status: status,
            progress: progress,
            output_url: videoUrl,
            render_time: renderTime,
            completed_at: status === 'completed' ? timeNow : undefined,
            error_message: errorMsg
          })
          .eq('id', jobId);

        if (!error && videoUrl) {
          // Sync project status to completed
          await supabase
            .from('projects')
            .update({ status: status === 'completed' ? 'completed' : 'rendering', video_url: videoUrl })
            .eq('id', JobQueue.getJob(jobId)?.projectId);
        }
      } catch (err) {
        console.warn('Supabase DB Sync failed in RenderEngine, saving to file:', err);
      }
    }

    // Always update Server JSON file-database for local/offline preview consistency
    try {
      const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
      const parentDir = path.dirname(dbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const dbData = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : {};
      
      // Update task list
      if (!dbData.rendering_tasks) dbData.rendering_tasks = [];
      const taskIndex = dbData.rendering_tasks.findIndex((t: any) => t.id === jobId);
      const job = JobQueue.getJob(jobId);

      const taskData = {
        id: jobId,
        project_id: job?.projectId,
        user_id: job?.userId,
        project_name: job?.projectName,
        template_name: job?.templateName,
        status: status,
        progress: progress,
        duration: job?.duration || '0:30',
        render_time: renderTime,
        output_url: videoUrl,
        created_at: job?.createdAt,
        completed_at: status === 'completed' ? timeNow : undefined,
        error_message: errorMsg
      };

      if (taskIndex !== -1) {
        dbData.rendering_tasks[taskIndex] = { ...dbData.rendering_tasks[taskIndex], ...taskData };
      } else {
        dbData.rendering_tasks.push(taskData);
      }

      // Update project status
      if (job?.projectId) {
        if (!dbData.projects) dbData.projects = [];
        const projIndex = dbData.projects.findIndex((p: any) => p.id === job.projectId);
        if (projIndex !== -1) {
          dbData.projects[projIndex].status = status === 'completed' ? 'completed' : 'rendering';
          if (videoUrl) {
            dbData.projects[projIndex].videoUrl = videoUrl;
            dbData.projects[projIndex].video_url = videoUrl;
          }
          dbData.projects[projIndex].updatedAt = timeNow;
        }
      }

      // Sync offline user video counters
      if (job?.userId && status === 'completed') {
        if (!dbData.saas_users) dbData.saas_users = [];
        const userIndex = dbData.saas_users.findIndex((u: any) => u.id === job.userId);
        if (userIndex !== -1) {
          dbData.saas_users[userIndex].usage_current = (dbData.saas_users[userIndex].usage_current || 0) + 1;
          dbData.saas_users[userIndex].usageCurrent = dbData.saas_users[userIndex].usage_current;
        }
      }

      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    } catch (e) {
      console.error('Failed to sync server db.json file:', e);
    }
  }

  /**
   * Registers a completed output inside rendered videos registry
   */
  private static async registerRenderedFile(userId: string, projectId: string, name: string, url: string) {
    const sizeMb = StorageManager.getFileSizeMB(path.join(process.cwd(), 'public', url));
    const timestamp = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('rendered_videos').insert({
          id: `rnd-vid-${Math.random().toString(36).substring(2, 9)}`,
          user_id: userId,
          project_id: projectId,
          name: name,
          size_mb: parseFloat(sizeMb.toFixed(2)),
          url: url,
          created_at: timestamp
        });
      } catch (e) {}
    }

    // Sync to Server JSON database folders uploads structure
    try {
      const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
      if (fs.existsSync(dbPath)) {
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        
        if (!dbData.storage_folders) dbData.storage_folders = [];
        
        let renderedFolder = dbData.storage_folders.find((f: any) => f.id === 'fld-rendered');
        if (!renderedFolder) {
          renderedFolder = {
            id: 'fld-rendered',
            name: 'Vídos Renderizados',
            path: '/rendered',
            description: 'Vídeos finais prontos para publicação',
            files: []
          };
          dbData.storage_folders.push(renderedFolder);
        }

        renderedFolder.files.push({
          id: `f-rnd-${Date.now()}`,
          name: `${name.toLowerCase().replace(/\s+/g, '_')}_final.mp4`,
          size: `${sizeMb.toFixed(1)} MB`,
          type: 'render',
          url: url,
          createdAt: timestamp
        });

        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
      }
    } catch (e) {}
  }
}
