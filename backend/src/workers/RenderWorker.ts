import { JobQueue } from '../queue/JobQueue.js';
import { FFmpegRenderer } from '../render/FFmpegRenderer.js';
import { StorageManager } from '../storage/StorageManager.js';
import { logger } from '../utils/logger.js';
import { supabase } from '../database/supabase.js';

export class RenderWorker {
  private id: string;
  private isProcessing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(id = `worker-${Math.random().toString(36).substring(2, 6)}`) {
    this.id = id;
    logger.info(`[RenderWorker ${this.id}] Initialized`);
  }

  start() {
    logger.info(`[RenderWorker ${this.id}] Starting queue listener...`);
    this.pollInterval = setInterval(() => this.checkQueue(), 1000);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info(`[RenderWorker ${this.id}] Stopped`);
  }

  private async checkQueue() {
    if (this.isProcessing) return;

    const nextJob = JobQueue.getNextJob();
    if (nextJob) {
      this.isProcessing = true;
      logger.info(`[RenderWorker ${this.id}] Processing job: ${nextJob.id}`);
      
      const startTime = Date.now();
      const outputFilename = `${nextJob.id}_${Date.now()}.mp4`;
      const tempOutputPath = StorageManager.getTempPath(outputFilename);
      const finalOutputPath = StorageManager.getOutputPath(outputFilename);

      try {
        // Update in-memory and supabase state
        JobQueue.updateJob(nextJob.id, { status: 'preparing', progress: 5 });
        await this.syncJobToSupabase(nextJob.id, 'preparing', 5);

        // Run rendering via native FFmpeg compiler
        JobQueue.updateJob(nextJob.id, { status: 'rendering', progress: 10 });
        await this.syncJobToSupabase(nextJob.id, 'rendering', 10);

        await FFmpegRenderer.render(nextJob, tempOutputPath, async (progress) => {
          const status = progress < 90 ? 'rendering' : 'encoding';
          JobQueue.updateJob(nextJob.id, { status, progress });
          await this.syncJobToSupabase(nextJob.id, status, progress);
        });

        // Copy from temp to final storage
        JobQueue.updateJob(nextJob.id, { status: 'saving', progress: 95 });
        await this.syncJobToSupabase(nextJob.id, 'saving', 95);

        // Move/write final file
        const fs = await import('fs');
        fs.renameSync(tempOutputPath, finalOutputPath);

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        const outputUrl = StorageManager.getPublicUrl(outputFilename);

        // Update complete status
        JobQueue.updateJob(nextJob.id, {
          status: 'completed',
          progress: 100,
          outputUrl,
          completedAt: new Date().toISOString()
        });

        await this.syncJobToSupabase(nextJob.id, 'completed', 100, outputUrl, `${durationSeconds}s`);
        logger.info(`[RenderWorker ${this.id}] Job completed successfully: ${nextJob.id} in ${durationSeconds}s`);

      } catch (err: any) {
        logger.error(`[RenderWorker ${this.id}] Job failed: ${nextJob.id}`, err);
        StorageManager.cleanTempFile(tempOutputPath);

        JobQueue.updateJob(nextJob.id, {
          status: 'failed',
          progress: 0,
          error: err.message || 'Unknown render engine failure'
        });

        await this.syncJobToSupabase(nextJob.id, 'failed', 0, undefined, undefined, err.message);
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private async syncJobToSupabase(
    jobId: string,
    status: string,
    progress: number,
    outputUrl?: string,
    renderTime?: string,
    errorMessage?: string
  ) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('rendering_tasks')
        .update({
          status,
          progress,
          output_url: outputUrl,
          render_time: renderTime,
          error_message: errorMessage,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined
        })
        .eq('id', jobId);

      if (error) {
        logger.error(`[RenderWorker] Failed to sync job state to Supabase:`, error);
      }
    } catch (err) {
      logger.error(`[RenderWorker] Failed to communicate with Supabase:`, err);
    }
  }

  getStatus() {
    return {
      id: this.id,
      isProcessing: this.isProcessing,
      status: this.isProcessing ? 'busy' : 'idle'
    };
  }
}
export default RenderWorker;
