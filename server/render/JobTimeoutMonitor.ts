import { JobQueue } from './JobQueue';
import { WorkerRegistry } from '../websocket/WorkerRegistry';
import { RenderEngine } from './RenderEngine';
import { JobDispatcher } from '../websocket/JobDispatcher';

export class JobTimeoutMonitor {
  private static interval: NodeJS.Timeout | null = null;

  /**
   * Starts the background timer to monitor stuck rendering jobs
   */
  static start() {
    if (this.interval) return;

    const checkIntervalMs = 5000; // Check every 5 seconds
    this.interval = setInterval(async () => {
      try {
        await this.checkTimeouts();
      } catch (err: any) {
        console.error('[JobTimeoutMonitor] Error during timeout check:', err.message);
      }
    }, checkIntervalMs);

    console.log('[JobTimeoutMonitor] Automatic job timeout monitor and failover scheduler started.');
  }

  /**
   * Stops the background monitor
   */
  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[JobTimeoutMonitor] Automatic job timeout monitor stopped.');
    }
  }

  /**
   * Scans all tracked jobs for timeouts, canceling and re-queueing as configured
   */
  private static async checkTimeouts() {
    const jobs = JobQueue.getAllJobs();
    const now = Date.now();
    
    const timeoutMinutes = parseFloat(process.env.JOB_TIMEOUT_MINUTES || '10');
    const timeoutMs = parseInt(process.env.JOB_TIMEOUT_MS || String(timeoutMinutes * 60 * 1000), 10);
    const maxAttempts = parseInt(process.env.JOB_MAX_ATTEMPTS || '3', 10);

    for (const job of jobs) {
      const isProcessing = ['Preparing', 'Rendering', 'Encoding', 'Saving'].includes(job.status);
      if (!isProcessing) continue;

      // Initialize startedAt if not set
      if (!job.startedAt) {
        job.startedAt = new Date().toISOString();
        JobQueue.updateJob(job.id, { startedAt: job.startedAt });
        continue;
      }

      const startedTime = new Date(job.startedAt).getTime();
      const elapsed = now - startedTime;

      if (elapsed > timeoutMs) {
        const attempts = (job.attempts || 0) + 1;
        
        // Structured log for potentially malicious or stuck job attempt
        const logData = {
          event: 'MALICIOUS_ATTEMPT',
          type: 'JOB_TIMEOUT_EXCEEDED',
          jobId: job.id,
          userId: job.userId,
          projectId: job.projectId,
          templateId: job.templateId,
          attempts,
          maxAttempts,
          elapsedMs: elapsed,
          timeoutLimitMs: timeoutMs,
          timestamp: new Date().toISOString()
        };
        console.warn(JSON.stringify(logData));

        // Reset worker node associated with this timed-out job
        const activeWorkers = WorkerRegistry.getAll();
        const activeWorker = activeWorkers.find(w => w.currentJobId === job.id);
        if (activeWorker) {
          console.warn(`[JobTimeoutMonitor] Resetting busy worker "${activeWorker.id}" that timed out on job ${job.id}`);
          activeWorker.status = 'idle';
          activeWorker.currentJobId = undefined;
          
          try {
            activeWorker.send('cancel_job', { jobId: job.id, reason: 'Job timed out on control plane.' });
          } catch (e) {
            // ignore socket errors on cancel payload
          }
        }

        if (attempts < maxAttempts) {
          const systemLog = `[SYSTEM] O job estourou o limite de tempo (${timeoutMinutes} min). Reenviando automaticamente para a fila (Tentativa ${attempts + 1} de ${maxAttempts}).`;
          const updatedLogs = [...(job.logs || []), systemLog];

          console.log(`[JobTimeoutMonitor] Job ${job.id} timed out. Re-queuing (attempt ${attempts + 1}/${maxAttempts}).`);

          JobQueue.updateJob(job.id, {
            status: 'Queued',
            progress: 0,
            startedAt: undefined, // cleared so next dispatcher sets it fresh
            attempts,
            logs: updatedLogs
          });

          await RenderEngine.saveDbStatus(job.id, 'queued', 0, undefined, undefined, undefined, updatedLogs)
            .catch(err => console.error(`[JobTimeoutMonitor] Failed saving rescheduled db status for ${job.id}:`, err.message));

        } else {
          const systemLog = `[SYSTEM_ERROR] O job falhou definitivamente após estourar o limite máximo de ${maxAttempts} tentativas de timeout.`;
          const updatedLogs = [...(job.logs || []), systemLog];

          console.error(`[JobTimeoutMonitor] Job ${job.id} exceeded max timeout attempts (${maxAttempts}). Setting to Failed.`);

          JobQueue.updateJob(job.id, {
            status: 'Failed',
            progress: 0,
            attempts,
            error: `Render job timed out after reaching maximum of ${maxAttempts} attempts.`,
            logs: updatedLogs
          });

          await RenderEngine.saveDbStatus(
            job.id,
            'failed',
            0,
            undefined,
            undefined,
            `Render job timed out after reaching maximum of ${maxAttempts} attempts.`,
            updatedLogs
          ).catch(err => console.error(`[JobTimeoutMonitor] Failed saving failed db status for ${job.id}:`, err.message));
        }

        // Trigger next distributions immediately
        JobDispatcher.distributeJobs();
      }
    }
  }
}
