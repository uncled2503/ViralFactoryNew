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
