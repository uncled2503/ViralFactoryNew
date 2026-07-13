import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { JobQueue, RenderJob } from './JobQueue';
import { RenderEngine } from './RenderEngine';
import { TemplateEngine } from './TemplateEngine';
import { LayerEngine } from './LayerEngine';
import { ExportPresetManager } from './ExportPresetManager';
import { StorageManager } from './Storage';
import fs from 'fs';
import path from 'path';

export interface ConnectedWorker {
  id: string;
  socket: WebSocket;
  hostname: string;
  os: string;
  totalRam: number;
  cpuUsage: number;
  ramUsage: number;
  version: string;
  lastHeartbeat: number;
  status: 'idle' | 'busy';
  currentJobId?: string;
}

export class WorkerWebSocketServer {
  private static wss: WebSocketServer | null = null;
  private static workers: Map<string, ConnectedWorker> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes the WebSocket server on top of the Express HTTP server
   */
  static init(server: any) {
    console.log('[WorkerWS] Initializing Render Worker WebSocket Server...');
    this.wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade manually to routing /ws/worker
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

      if (pathname === '/ws/worker') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      let workerId: string | null = null;

      console.log('[WorkerWS] New raw connection established.');

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          const { type, payload } = data;

          if (type === 'register') {
            workerId = payload.id || `worker-${Math.random().toString(36).substring(2, 6)}`;
            console.log(`[WorkerWS] Worker "${workerId}" registered. Host: ${payload.hostname}, OS: ${payload.os}, RAM: ${payload.totalRam} GB`);

            this.workers.set(workerId, {
              id: workerId,
              socket: ws,
              hostname: payload.hostname || 'Unknown',
              os: payload.os || 'Unknown',
              totalRam: payload.totalRam || 0,
              cpuUsage: 0,
              ramUsage: 0,
              version: payload.version || '1.0.0',
              lastHeartbeat: Date.now(),
              status: 'idle'
            });

            // Acknowledge registration
            ws.send(JSON.stringify({ type: 'register_ack', payload: { success: true, workerId } }));

            // Trigger job queue check
            this.distributeJobs();
          } 
          else if (type === 'heartbeat') {
            if (!workerId) return;
            const worker = this.workers.get(workerId);
            if (worker) {
              worker.lastHeartbeat = Date.now();
              worker.cpuUsage = payload.cpuUsage || 0;
              worker.ramUsage = payload.ramUsage || 0;
            }
          } 
          else if (type === 'job_progress') {
            if (!workerId) return;
            const { jobId, status, progress, logs } = payload;
            console.log(`[WorkerWS] Job ${jobId} progress reported by ${workerId}: ${status} - ${progress}%`);
            
            // Update in-memory Job state
            JobQueue.updateProgress(jobId, status, progress);
            if (logs && logs.length > 0) {
              JobQueue.updateJob(jobId, { logs });
            }

            // Sync with DB
            await RenderEngine.saveDbStatus(
              jobId,
              status === 'Completed' ? 'completed' : status === 'Failed' ? 'failed' : 'processing',
              progress,
              undefined,
              undefined,
              undefined,
              logs
            );
          } 
          else if (type === 'job_completed') {
            if (!workerId) return;
            const { jobId, outputUrl, thumbnailUrl, previewUrl, renderTime, logs, debugInfo } = payload;
            console.log(`[WorkerWS] Job ${jobId} successfully COMPLETED by worker ${workerId}!`);

            // Update local worker state to idle
            const worker = this.workers.get(workerId);
            if (worker) {
              worker.status = 'idle';
              worker.currentJobId = undefined;
            }

            // Update in-memory Job queue
            JobQueue.updateJob(jobId, {
              status: 'Completed',
              progress: 100,
              renderTime,
              outputUrl,
              thumbnailUrl,
              completedAt: new Date().toISOString(),
              logs,
              debugInfo
            });

            // Save status in DB/Supabase
            await RenderEngine.saveDbStatus(
              jobId,
              'completed',
              100,
              outputUrl,
              renderTime,
              undefined,
              logs,
              debugInfo
            );

            // Fetch user ID of job
            const jobObj = JobQueue.getJob(jobId);
            if (jobObj) {
              await (RenderEngine as any).registerRenderedFile(
                jobObj.userId,
                jobObj.projectId,
                jobObj.projectName,
                outputUrl
              );
            }

            // Trigger next queue check
            this.distributeJobs();
          } 
          else if (type === 'job_failed') {
            if (!workerId) return;
            const { jobId, error, logs, debugInfo } = payload;
            console.error(`[WorkerWS] Job ${jobId} FAILED on worker ${workerId}: ${error}`);

            // Update worker status
            const worker = this.workers.get(workerId);
            if (worker) {
              worker.status = 'idle';
              worker.currentJobId = undefined;
            }

            // Update job queue
            JobQueue.updateJob(jobId, {
              status: 'Failed',
              progress: 0,
              error: error || 'Erro desconhecido durante a renderização no worker remoto.',
              logs,
              debugInfo
            });

            // Save failed status to DB
            await RenderEngine.saveDbStatus(
              jobId,
              'failed',
              0,
              undefined,
              undefined,
              error || 'Erro no render worker',
              logs,
              debugInfo
            );

            // Trigger next queue check
            this.distributeJobs();
          }
        } catch (err) {
          console.error('[WorkerWS] Error parsing WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        if (workerId) {
          console.warn(`[WorkerWS] Worker "${workerId}" disconnected.`);
          this.handleWorkerDisconnect(workerId);
        } else {
          console.log('[WorkerWS] Unregistered client closed connection.');
        }
      });

      ws.on('error', (err) => {
        console.error(`[WorkerWS] Socket error on worker ${workerId || 'unregistered'}:`, err);
      });
    });

    // Start background check for dead workers (heartbeat timeout)
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 10000);

    // Listen to job queue emitters to automatically distribute jobs
    JobQueue.emitter.on('jobAdded', () => {
      this.distributeJobs();
    });

    JobQueue.emitter.on('queueChanged', () => {
      this.distributeJobs();
    });
  }

  /**
   * Periodically check heartbeats and drop dead workers
   */
  private static checkHeartbeats() {
    const now = Date.now();
    const timeout = 25000; // 25 seconds heartbeat timeout

    for (const [id, worker] of this.workers.entries()) {
      if (now - worker.lastHeartbeat > timeout) {
        console.warn(`[WorkerWS] Worker "${id}" timed out. No heartbeat for ${Math.round((now - worker.lastHeartbeat) / 1000)}s. Dropping...`);
        worker.socket.terminate();
        this.handleWorkerDisconnect(id);
      }
    }
  }

  /**
   * Gracefully handle a worker disconnecting or crashing
   */
  private static handleWorkerDisconnect(workerId: string) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    // If worker was rendering a job, reset that job to 'Queued'
    if (worker.status === 'busy' && worker.currentJobId) {
      const jobId = worker.currentJobId;
      const job = JobQueue.getJob(jobId);
      if (job && (job.status !== 'Completed' && job.status !== 'Failed' && job.status !== 'Canceled')) {
        console.warn(`[WorkerWS] Job ${jobId} was active on disconnected worker "${workerId}". Rescheduling back to Queued status...`);
        
        // Return to queued
        JobQueue.updateJob(jobId, {
          status: 'Queued',
          progress: 0,
          logs: [...(job.logs || []), `[SYSTEM] O Worker remoto "${workerId}" desconectou inesperadamente. A tarefa foi devolvida para a fila.`]
        });

        RenderEngine.saveDbStatus(
          jobId,
          'queued',
          0,
          undefined,
          undefined,
          undefined,
          JobQueue.getJob(jobId)?.logs
        ).catch(() => {});
      }
    }

    this.workers.delete(workerId);
    
    // Distribute jobs if there are other idle workers
    this.distributeJobs();
  }

  /**
   * Fetches an idle worker
   */
  private static getIdleWorker(): ConnectedWorker | null {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker;
      }
    }
    return null;
  }

  /**
   * Attempts to distribute next queued jobs to available workers
   */
  static async distributeJobs() {
    // Find next Queued job
    const nextJob = JobQueue.getNextJob();
    if (!nextJob) return;

    // Find available worker
    const idleWorker = this.getIdleWorker();
    if (!idleWorker) {
      console.log('[WorkerWS] Job in queue but no idle workers available. Waiting for active workers to complete or new workers to connect.');
      return;
    }

    console.log(`[WorkerWS] Dispatching Job ${nextJob.id} to worker "${idleWorker.id}"`);

    // Mark worker as busy
    idleWorker.status = 'busy';
    idleWorker.currentJobId = nextJob.id;

    // Transition Job state
    JobQueue.updateProgress(nextJob.id, 'Preparing', 5);
    await RenderEngine.saveDbStatus(nextJob.id, 'Preparing', 5, undefined, undefined, undefined, [
      `[SYSTEM] Job despachado com sucesso para o render-worker remoto: "${idleWorker.id}"`
    ]);

    // Gather project & template data to build complete composite layers for worker
    try {
      const projectData = await (RenderEngine as any).fetchProject(nextJob.projectId, nextJob.userId);
      const templateData = await (RenderEngine as any).fetchTemplate(nextJob.templateId, nextJob.userId);

      if (!projectData || !templateData) {
        throw new Error(`Projeto ${nextJob.projectId} ou Template ${nextJob.templateId} não encontrado.`);
      }

      const vars = nextJob.variables || projectData.variables || {};
      const baseTemplateJson = TemplateEngine.getTemplateJson(templateData, projectData);
      
      if (!baseTemplateJson) {
        throw new Error('Falha ao compilar JSON estruturado do template.');
      }

      const compiledTemplateJson = TemplateEngine.compile(baseTemplateJson, vars);
      const renderLayers = LayerEngine.compileLayers(compiledTemplateJson);
      
      const presetId = nextJob.variables?.presetId || projectData?.presetId || projectData?.preset || compiledTemplateJson?.presetId || 'tiktok';
      const preset = ExportPresetManager.getPreset(presetId);

      let videoDuration = Number(compiledTemplateJson?.duration || nextJob.variables?.duration || projectData?.variables?.duration || 30);
      if (nextJob.variables?.isSandbox) {
        videoDuration = 3;
      }

      // Send start_job event to worker
      idleWorker.socket.send(JSON.stringify({
        type: 'start_job',
        payload: {
          jobId: nextJob.id,
          userId: nextJob.userId,
          projectId: nextJob.projectId,
          projectName: nextJob.projectName,
          duration: videoDuration,
          layers: renderLayers,
          preset: preset,
          variables: vars
        }
      }));

    } catch (err: any) {
      console.error(`[WorkerWS] Failed to compile job payload for worker. Rejecting job: ${err.message}`);
      
      // Mark worker as idle again
      idleWorker.status = 'idle';
      idleWorker.currentJobId = undefined;

      // Fail the job immediately
      JobQueue.updateJob(nextJob.id, {
        status: 'Failed',
        progress: 0,
        error: err.message
      });

      await RenderEngine.saveDbStatus(
        nextJob.id,
        'failed',
        0,
        undefined,
        undefined,
        err.message
      );

      // Re-trigger distribution for other jobs
      this.distributeJobs();
    }
  }

  /**
   * Fetches active connected workers and their heartbeats for admin status monitoring
   */
  static getWorkers() {
    return Array.from(this.workers.values()).map(w => ({
      id: w.id,
      hostname: w.hostname,
      os: w.os,
      totalRam: w.totalRam,
      cpuUsage: w.cpuUsage,
      ramUsage: w.ramUsage,
      version: w.version,
      status: w.status,
      currentJobId: w.currentJobId,
      lastActiveSecondsAgo: Math.round((Date.now() - w.lastHeartbeat) / 1000)
    }));
  }

  /**
   * Clean up on server close
   */
  static shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss?.close();
  }
}
