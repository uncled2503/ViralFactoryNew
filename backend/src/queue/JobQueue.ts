export type JobStatus = 
  | 'queued' 
  | 'preparing' 
  | 'rendering' 
  | 'encoding' 
  | 'saving' 
  | 'completed' 
  | 'failed' 
  | 'canceled';

export interface RenderJob {
  id: string;
  userId: string;
  projectId: string;
  templateId: string;
  status: JobStatus;
  progress: number;
  duration: number; // in seconds
  outputUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  variables: Record<string, any>;
}

export class JobQueue {
  private static jobs: Map<string, RenderJob> = new Map();
  private static queue: string[] = [];

  static createJob(params: {
    userId: string;
    projectId: string;
    templateId: string;
    duration: number;
    variables: Record<string, any>;
  }): RenderJob {
    const job: RenderJob = {
      id: `job-${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      projectId: params.projectId,
      templateId: params.templateId,
      status: 'queued',
      progress: 0,
      duration: params.duration || 30,
      createdAt: new Date().toISOString(),
      variables: params.variables || {}
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
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

  static updateJob(id: string, updates: Partial<RenderJob>) {
    const job = this.jobs.get(id);
    if (job) {
      const updated = { ...job, ...updates };
      this.jobs.set(id, updated);
      if (['completed', 'failed', 'canceled'].includes(updates.status || '')) {
        this.queue = this.queue.filter(qid => qid !== id);
      }
    }
  }

  static getNextJob(): RenderJob | undefined {
    if (this.queue.length === 0) return undefined;
    for (const id of this.queue) {
      const job = this.jobs.get(id);
      if (job && job.status === 'queued') {
        return job;
      }
    }
    return undefined;
  }

  static cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (job && ['queued', 'preparing'].includes(job.status)) {
      this.updateJob(id, { status: 'canceled', progress: 0 });
    }
  }
}
