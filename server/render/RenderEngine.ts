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
import { PipelineManager } from './PipelineManager';
import { LocalDbMutex } from '../database/LocalDbMutex';
import { RedisService } from '../services/RedisService';

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
    return PipelineManager.run(jobId);
  }

  /**
   * Direct fetching of Project record from Supabase database or Server JSON database
   */
  private static async fetchProject(projectId: string, userId: string): Promise<any> {
    const cacheKey = `cache:project:${projectId}:${userId}`;
    try {
      const cached = await RedisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('[RenderEngine] Cache read error for project:', err);
    }

    let project: any = null;
    if (supabase) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
      if (data) project = data;

      if (!project) {
        const { data: dataById } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();
        if (dataById) project = dataById;
      }
    }

    if (!project) {
      project = this.getLocalDbItem('projects', { id: projectId });
    }

    if (project) {
      try {
        await RedisService.set(cacheKey, JSON.stringify(project), 60);
      } catch (err) {
        console.error('[RenderEngine] Cache write error for project:', err);
      }
    }
    return project;
  }

  /**
   * Direct fetching of Template record
   */
  private static async fetchTemplate(templateId: string, userId: string): Promise<any> {
    const cacheKey = `cache:template:${templateId}:${userId}`;
    try {
      const cached = await RedisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('[RenderEngine] Cache read error for template:', err);
    }

    let template: any = null;
    if (supabase) {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();
      if (data) template = data;
    }

    if (!template) {
      template = this.getLocalDbItem('templates', { id: templateId });
    }

    if (template) {
      try {
        await RedisService.set(cacheKey, JSON.stringify(template), 60);
      } catch (err) {
        console.error('[RenderEngine] Cache write error for template:', err);
      }
    }
    return template;
  }

  /**
   * Server-side local JSON file database manager
   */
  private static getLocalDbItem(table: string, filters: Record<string, any>): any {
    try {
      const dbData = LocalDbMutex.getDbDataSync();
      const items = dbData[table] || [];
      return items.find((item: any) => 
        Object.entries(filters).every(([key, val]) => {
          if (!val) return true;
          const altKey = key === 'user_id' ? 'userId' : key === 'userId' ? 'user_id' : key;
          return item[key] === val || item[altKey] === val;
        })
      ) || null;
    } catch {
      return null;
    }
  }

  /**
   * Writes job progress changes directly to Supabase or JSON file database
   */
  public static async saveDbStatus(
    jobId: string,
    status: string,
    progress: number,
    videoUrl?: string,
    renderTime?: string,
    errorMsg?: string,
    logs?: string[],
    debugInfo?: any
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
            error_message: errorMsg,
            logs: logs,
            debug_info: debugInfo
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
    await LocalDbMutex.runLocked((dbData) => {
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
        error_message: errorMsg,
        logs: logs || job?.logs,
        debug_info: debugInfo || job?.debugInfo
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
    }).catch((e) => {
      console.error('Failed to sync database:', e);
    });

    // --- REDIS SCALE ENGINE EXTENSIONS ---
    const jobState = {
      id: jobId,
      status: status,
      progress: progress,
      videoUrl: videoUrl,
      renderTime: renderTime,
      errorMsg: errorMsg,
      logs: logs,
      updatedAt: timeNow
    };

    try {
      // 1. Cache the current job state in Redis with a TTL of 2 minutes
      await RedisService.set(`job:state:${jobId}`, JSON.stringify(jobState), 120);

      // 2. Push the status change to the Redis Progress Queue (fila de progresso)
      await RedisService.pushQueue(`queue:progress:${jobId}`, jobState);

      // 3. Publish the job progress update to the cluster via Redis Pub/Sub
      await RedisService.publish('cluster:job_progress', JSON.stringify({
        jobId,
        status,
        progress,
        logs,
        videoUrl,
        renderTime,
        errorMsg
      }));
    } catch (redisErr: any) {
      console.error('[RenderEngine] Redis synchronization failed:', redisErr.message);
    }
  }

  /**
   * Registers a completed output inside rendered videos registry
   */
  public static async registerRenderedFile(userId: string, projectId: string, name: string, url: string) {
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
    await LocalDbMutex.runLocked((dbData) => {
      if (!dbData.storage_folders) dbData.storage_folders = [];
      
      let renderedFolder = dbData.storage_folders.find((f: any) => f.id === 'fld-rendered');
      if (!renderedFolder) {
        renderedFolder = {
          id: 'fld-rendered',
          name: 'Vídeos Renderizados',
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
    }).catch((e) => {
      console.error('Failed to sync database folder registration:', e);
    });
  }
}
