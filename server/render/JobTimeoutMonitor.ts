import { JobQueue } from './JobQueue';
import { WorkerRegistry } from '../websocket/WorkerRegistry';
import { RenderEngine } from './RenderEngine';
import { JobDispatcher } from '../websocket/JobDispatcher';
import { supabaseAdmin } from '../database/supabaseClient';

export class JobTimeoutMonitor {
  private static interval: NodeJS.Timeout | null = null;
  private static orphanInterval: NodeJS.Timeout | null = null;

  // How long a `rendering_tasks` row can sit at status 'queued' before we consider
  // it orphaned (the client wrote it optimistically but the /api/render/job request
  // that actually enqueues it in JobQueue never completed — e.g. the tab was closed
  // or the connection dropped mid-request). Generous window to avoid false positives
  // on slow requests; this is strictly for jobs the server never even received.
  private static readonly ORPHAN_QUEUE_THRESHOLD_MS = 2 * 60 * 1000;

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

    // Orphan sweep hits the database, so it runs on a much slower cadence than the
    // in-memory timeout check above.
    const orphanCheckIntervalMs = 60000; // Every 60 seconds
    this.orphanInterval = setInterval(async () => {
      try {
        await this.checkOrphanedQueuedTasks();
      } catch (err: any) {
        console.error('[JobTimeoutMonitor] Error during orphaned task check:', err.message);
      }
    }, orphanCheckIntervalMs);

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
    if (this.orphanInterval) {
      clearInterval(this.orphanInterval);
      this.orphanInterval = null;
    }
  }

  /**
   * Finds `rendering_tasks` rows stuck at status 'queued' that never actually made it
   * into the in-memory JobQueue (i.e. the request that should have created the real
   * job never completed). These would otherwise sit as "queued" forever with no
   * dispatch, no progress, and no way for the user to tell what happened. Marks them
   * as failed with an explanatory message so the UI shows a terminal, actionable state.
   */
  private static async checkOrphanedQueuedTasks() {
    if (!supabaseAdmin) return;

    const cutoff = new Date(Date.now() - this.ORPHAN_QUEUE_THRESHOLD_MS).toISOString();

    const { data, error } = await supabaseAdmin
      .from('rendering_tasks')
      .select('id, project_id, created_at')
      .eq('status', 'queued')
      .lt('created_at', cutoff);

    if (error) {
      console.error('[JobTimeoutMonitor] Failed to query for orphaned queued tasks:', error.message);
      return;
    }
    if (!data || data.length === 0) return;

    for (const row of data) {
      // If it's genuinely tracked in-memory, the normal dispatch/timeout flow owns it.
      if (JobQueue.getJob(row.id)) continue;

      const message = 'A solicitação de renderização não chegou a ser registrada no servidor (conexão interrompida antes da confirmação). Exclua esta tarefa e tente renderizar novamente.';
      console.warn(`[JobTimeoutMonitor] Orphaned queued task "${row.id}" never reached the job queue (created ${row.created_at}). Marking as failed.`);

      await RenderEngine.saveDbStatus(
        row.id,
        'failed',
        0,
        undefined,
        undefined,
        message,
        [`[SISTEMA] Tarefa nunca chegou a ser registrada na fila de processamento do servidor — marcada como falha automaticamente após ${this.ORPHAN_QUEUE_THRESHOLD_MS / 60000} minutos sem atividade.`]
      ).catch(err => console.error(`[JobTimeoutMonitor] Failed saving orphaned-task failure status for ${row.id}:`, err.message));

      // saveDbStatus only resets the project's status via its own JobQueue lookup, which
      // won't find this job (it never existed there) — reset it directly here instead,
      // so the project doesn't stay stuck showing "rendering" forever.
      if (row.project_id) {
        await supabaseAdmin
          .from('projects')
          .update({ status: 'failed' })
          .eq('id', row.project_id)
          .then(({ error: projErr }) => {
            if (projErr) console.error(`[JobTimeoutMonitor] Failed resetting project ${row.project_id} status:`, projErr.message);
          });
      }
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
