import { EventEmitter } from 'events';

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
  variables: any;
}

class JobQueueEmitter extends EventEmitter {}

export class JobQueue {
  private static jobs: Map<string, RenderJob> = new Map();
  private static queue: string[] = [];
  static emitter = new JobQueueEmitter();

  static createJob(params: {
    userId: string;
    projectId: string;
    projectName: string;
    templateId: string;
    templateName: string;
    duration: string;
    variables: any;
  }): RenderJob {
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
      variables: params.variables
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
      }
    }
  }

  static updateProgress(id: string, status: JobStatus, progress: number) {
    this.updateJob(id, { status, progress });
  }

  static getNextJob(): RenderJob | undefined {
    if (this.queue.length === 0) return undefined;
    
    // Find first Queued job
    for (const id of this.queue) {
      const job = this.jobs.get(id);
      if (job && job.status === 'Queued') {
        return job;
      }
    }
    return undefined;
  }

  static cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (job && (job.status === 'Queued' || job.status === 'Preparing')) {
      this.updateJob(id, { status: 'Canceled', progress: 0 });
    }
  }
}
