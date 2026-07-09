import { JobQueue, RenderJob } from '../queue/JobQueue.js';
import { supabase } from '../database/supabase.js';
import { logger } from '../utils/logger.js';

export class RenderService {
  static async submitJob(params: {
    userId: string;
    projectId: string;
    templateId: string;
    duration?: number;
    variables?: Record<string, any>;
  }): Promise<RenderJob> {
    const duration = params.duration || 30;
    const variables = params.variables || {};

    // 1. Create locally in-memory queue job
    const job = JobQueue.createJob({
      userId: params.userId,
      projectId: params.projectId,
      templateId: params.templateId,
      duration,
      variables
    });

    // 2. Insert record into Supabase database if configured
    if (supabase) {
      try {
        const { error } = await supabase.from('rendering_tasks').insert({
          id: job.id,
          user_id: params.userId,
          project_id: params.projectId,
          template_id: params.templateId,
          status: 'queued',
          progress: 0,
          duration: `${duration}s`,
          variables: JSON.stringify(variables),
          created_at: job.createdAt
        });

        if (error) {
          logger.error(`[RenderService] Error inserting render job into Supabase:`, error);
        } else {
          logger.info(`[RenderService] Successfully registered job ${job.id} in Supabase`);
        }
      } catch (err) {
        logger.error(`[RenderService] Failed to insert render job into Supabase:`, err);
      }
    }

    return job;
  }

  static getJobStatus(id: string): RenderJob | null {
    const job = JobQueue.getJob(id);
    return job || null;
  }

  static cancelJob(id: string): boolean {
    const job = JobQueue.getJob(id);
    if (!job) return false;

    JobQueue.cancelJob(id);
    return true;
  }
}
export default RenderService;
