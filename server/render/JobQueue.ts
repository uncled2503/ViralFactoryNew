import { EventEmitter } from 'events';
import { LocalDbMutex } from '../database/LocalDbMutex';

export type JobStatus = 
  | 'Queued' 
  | 'Preparing' 
  | 'Rendering' 
  | 'Encoding' 
  | 'Saving' 
  | 'Completed' 
  | 'Failed' 
  | 'Canceled';

export interface RenderJob {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  templateId: string;
  templateName: string;
  status: JobStatus;
  progress: number;
  duration: string;
  renderTime?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  startedAt?: string;
  attempts?: number;
  variables: any;
  logs?: string[];
  debugInfo?: any;
  priority?: 'high' | 'medium' | 'low';
}

class JobQueueEmitter extends EventEmitter {}

export class JobQueue {
  private static jobs: Map<string, RenderJob> = new Map();
  private static queue: string[] = [];
  static emitter = new JobQueueEmitter();

  /**
   * Run memory pruning and automatic cleanup of ancient logs/jobs.
   * Keeps memory footprint small and prevents slow accumulation.
   */
  public static pruneOldJobsAndLogs() {
    const maxJobsInMemory = 50;
    const allJobs = Array.from(this.jobs.values());
    
    // Sort jobs by createdAt descending
    allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // If we exceed maxJobsInMemory, we delete the oldest completed/failed/canceled jobs from the map
    if (this.jobs.size > maxJobsInMemory) {
      const jobsToKeep = allJobs.slice(0, maxJobsInMemory);
      const keysToKeep = new Set(jobsToKeep.map(j => j.id));
      
      for (const [id, job] of this.jobs.entries()) {
        if (!keysToKeep.has(id)) {
          // Only prune jobs that are in a final state to avoid breaking active renders
          if (job.status === 'Completed' || job.status === 'Failed' || job.status === 'Canceled') {
            this.jobs.delete(id);
          }
        }
      }
    }

    // Clean/truncate logs of final state jobs to conserve memory
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const job of this.jobs.values()) {
      if (job.status === 'Completed' || job.status === 'Failed' || job.status === 'Canceled') {
        const completedTime = job.completedAt ? new Date(job.completedAt).getTime() : new Date(job.createdAt).getTime();
        if (completedTime < fiveMinutesAgo && job.logs && job.logs.length > 50) {
          // Truncate logs to keep only a summary (last 10 lines)
          job.logs = [
            `[Pruned logs for memory conservation. Original lines: ${job.logs.length}]`,
            ...job.logs.slice(-10)
          ];
        }
      }
    }
  }

  static createJob(params: {
    userId: string;
    projectId: string;
    projectName: string;
    templateId: string;
    templateName: string;
    duration: string;
    variables: any;
  }): RenderJob {
    this.pruneOldJobsAndLogs();

    const db = LocalDbMutex.getDbDataSync();
    const user = (db.saas_users || []).find((u: any) => u.id === params.userId);
    const tier = user?.subscription_tier || 'Starter';
    const priority = tier === 'Business' ? 'high' : tier === 'Pro' ? 'medium' : 'low';

    const job: RenderJob = {
      id: `job-${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      projectId: params.projectId,
      projectName: params.projectName,
      templateId: params.templateId,
      templateName: params.templateName,
      status: 'Queued',
      progress: 0,
      duration: params.duration,
      createdAt: new Date().toISOString(),
      variables: params.variables,
      priority
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    
    this.emitter.emit('jobAdded', job);
    this.emitter.emit('queueChanged');
    return job;
  }

  static getJob(id: string): RenderJob | undefined {
    return this.jobs.get(id);
  }

  static getAllJobs(): RenderJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static getUserJobs(userId: string): RenderJob[] {
    return this.getAllJobs().filter(j => j.userId === userId);
  }

  static updateJob(id: string, updates: Partial<RenderJob>) {
    const job = this.jobs.get(id);
    if (job) {
      const updated = { ...job, ...updates };
      this.jobs.set(id, updated);
      this.emitter.emit('jobUpdated', updated);
      
      if (updates.status === 'Completed' || updates.status === 'Failed' || updates.status === 'Canceled') {
        this.queue = this.queue.filter(qid => qid !== id);
        this.emitter.emit('queueChanged');
        this.pruneOldJobsAndLogs();
      }
    }
  }

  static updateProgress(id: string, status: JobStatus, progress: number) {
    this.updateJob(id, { status, progress });
  }

  static getNextJob(): RenderJob | undefined {
    if (this.queue.length === 0) return undefined;
    
    // Filter out queued jobs
    const queuedJobs = this.queue
      .map(id => this.jobs.get(id))
      .filter((job): job is RenderJob => !!job && job.status === 'Queued');

    if (queuedJobs.length === 0) return undefined;

    // Sort by priority (high > medium > low), then by createdAt (FIFO)
    queuedJobs.sort((a, b) => {
      const pA = a.priority || 'low';
      const pB = b.priority || 'low';
      const weights = { high: 3, medium: 2, low: 1 };
      
      const diff = (weights[pB] || 1) - (weights[pA] || 1);
      if (diff !== 0) return diff;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return queuedJobs[0];
  }

  static cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (job && (job.status === 'Queued' || job.status === 'Preparing')) {
      this.updateJob(id, { status: 'Canceled', progress: 0 });
    }
  }

  static async recoverJobsFromDb() {
    try {
      console.log('[JobQueue] Running startup crash recovery check...');
      const dbData = await LocalDbMutex.loadDb();
      const tasks = dbData.rendering_tasks || [];
      
      let recoveredCount = 0;
      for (const t of tasks) {
        if (t && (t.status === 'queued' || t.status === 'processing' || t.status === 'Preparing' || t.status === 'Rendering' || t.status === 'Encoding' || t.status === 'Saving')) {
          // Check if already loaded to prevent duplicate recovery
          if (this.jobs.has(t.id)) continue;

          // Map string priority to weight or default
          const userInDb = (dbData.saas_users || []).find((u: any) => u.id === t.user_id);
          const tier = userInDb?.subscription_tier || 'Starter';
          const priority = tier === 'Business' ? 'high' : tier === 'Pro' ? 'medium' : 'low';

          const job: RenderJob = {
            id: t.id,
            userId: t.user_id || t.userId,
            projectId: t.project_id || t.projectId,
            projectName: t.project_name || t.projectName || 'Project',
            templateId: t.template_id || t.templateId,
            templateName: t.template_name || t.templateName || 'Template',
            status: 'Queued', // Reset to Queued so it gets picked up again
            progress: 0,
            duration: t.duration || '0:30',
            createdAt: t.created_at || t.createdAt || new Date().toISOString(),
            variables: t.variables || {},
            priority,
            logs: t.logs || []
          };

          this.jobs.set(job.id, job);
          this.queue.push(job.id);
          recoveredCount++;
        }
      }
      
      if (recoveredCount > 0) {
        console.log(`[JobQueue] Successfully recovered ${recoveredCount} unfinished/stuck jobs from database!`);
        this.emitter.emit('queueChanged');
        
        // Trigger distribution via JobDispatcher
        const { JobDispatcher } = await import('../websocket/JobDispatcher');
        JobDispatcher.distributeJobs();
      } else {
        console.log('[JobQueue] No unfinished/stuck jobs found in database to recover.');
      }
    } catch (err: any) {
      console.error('[JobQueue] Error during startup crash recovery:', err.message);
    }
  }
}
