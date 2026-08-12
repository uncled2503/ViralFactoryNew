import { WorkerConnection } from '../websocket/WorkerConnection';
import { WorkerRegistry } from '../websocket/WorkerRegistry';
import { WorkerManager } from '../websocket/WorkerManager';
import { JobQueue, RenderJob } from '../render/JobQueue';
import { RenderEngine } from '../render/RenderEngine';
import { JobDispatcher } from '../websocket/JobDispatcher';
import { AdminRepository } from '../repositories/AdminRepository';

export interface ScalingConfig {
  enabled: boolean;
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number; // queue size to trigger scale up
  scaleDownThreshold: number; // queue size to trigger scale down
  cooldownPeriod: number; // in seconds
}

export interface ScalingMetricPoint {
  timestamp: string;
  queueSize: number;
  activeJobs: number;
  activeWorkers: number;
  averageCpu: number;
  averageRam: number;
  averageRenderTime: number;
}

export interface ScalingLog {
  id: string;
  timestamp: string;
  type: 'SCALE_UP' | 'SCALE_DOWN' | 'HEALTH_CHECK' | 'CONFIG_CHANGE' | 'ERROR';
  message: string;
  details?: any;
}

export class AutoScalingService {
  private static config: ScalingConfig = {
    enabled: true,
    minWorkers: 0,
    maxWorkers: 8,
    scaleUpThreshold: 2,
    scaleDownThreshold: 0,
    cooldownPeriod: 15 // seconds
  };

  private static metricsHistory: ScalingMetricPoint[] = [];
  private static scalingLogs: ScalingLog[] = [];
  private static lastScaleUpTime: number = 0;
  private static lastScaleDownTime: number = 0;
  private static monitorInterval: NodeJS.Timeout | null = null;
  private static elasticWorkerIds: Set<string> = new Set();

  /**
   * Start the Auto Scaling monitoring loop
   */
  static start() {
    if (this.monitorInterval) return;

    this.logEvent('HEALTH_CHECK', 'Motor de Auto Scaling iniciado no Coordinator.');

    // Run monitoring every 5 seconds
    this.monitorInterval = setInterval(() => {
      try {
        this.monitorAndScale();
      } catch (err: any) {
        console.error('[AutoScalingService] Error in monitoring loop:', err.message);
        this.logEvent('ERROR', `Erro no loop de monitoramento: ${err.message}`);
      }
    }, 5000);

    // Initial check to satisfy minimum workers
    setTimeout(() => this.ensureMinimumWorkers(), 1000);
  }

  /**
   * Stop the monitoring loop
   */
  static stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.logEvent('HEALTH_CHECK', 'Motor de Auto Scaling parado.');
    }
  }

  /**
   * Get current configuration
   */
  static getConfig() {
    return this.config;
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<ScalingConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.logEvent('CONFIG_CHANGE', 'Configuração de Auto Scaling atualizada.', this.config);
    
    // Ensure we respect new minimums/maximums instantly
    this.ensureMinimumWorkers();
    this.ensureMaximumWorkersLimit();
  }

  /**
   * Get historical and live metrics
   */
  static getMetrics() {
    return {
      current: this.calculateCurrentMetrics(),
      history: this.metricsHistory,
      logs: this.scalingLogs,
      config: this.config
    };
  }

  /**
   * Clears historical scaling logs and metrics
   */
  static clearHistory() {
    this.metricsHistory = [];
    this.scalingLogs = [];
    this.logEvent('HEALTH_CHECK', 'Histórico de métricas e logs limpo pelo administrador.');
  }

  /**
   * Logs an auto-scaling event in-memory and to audit logs
   */
  private static logEvent(type: ScalingLog['type'], message: string, details?: any) {
    const log: ScalingLog = {
      id: `slog-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    this.scalingLogs.unshift(log);
    if (this.scalingLogs.length > 100) {
      this.scalingLogs.pop();
    }

    console.log(`[AutoScalingService] [${type}] ${message}`);

    // Persist to SaaS Audit Logs for durability
    AdminRepository.createAuditLog({
      admin_name: 'AutoScaler',
      action: `AUTOSCALE_${type}`,
      target_user: 'RENDER_FARM_CLUSTER',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      timestamp: log.timestamp
    }).catch(err => console.error('[AutoScalingService] Failed to create audit log:', err.message));
  }

  /**
   * Calculates dynamic metrics across the cluster
   */
  private static calculateCurrentMetrics(): ScalingMetricPoint {
    const allJobs = JobQueue.getAllJobs();
    const allWorkers = WorkerRegistry.getAll();

    const queueSize = allJobs.filter(j => j.status === 'Queued').length;
    const activeJobs = allJobs.filter(j => 
      j.status === 'Preparing' || 
      j.status === 'Rendering' || 
      j.status === 'Encoding' || 
      j.status === 'Saving'
    ).length;

    const activeWorkers = allWorkers.length;
    
    let totalCpu = 0;
    let totalRam = 0;
    allWorkers.forEach(w => {
      totalCpu += w.cpuUsage;
      totalRam += w.ramUsage;
    });

    const averageCpu = activeWorkers > 0 ? Math.round(totalCpu / activeWorkers) : 0;
    const averageRam = activeWorkers > 0 ? Math.round(totalRam / activeWorkers) : 0;

    // Average render time of completed jobs
    const completedJobs = allJobs.filter(j => j.status === 'Completed' && j.renderTime);
    let totalRenderTimeSeconds = 0;
    let renderTimesCount = 0;

    completedJobs.forEach(j => {
      if (j.renderTime) {
        // Handle format like "15s" or "0:15"
        const clean = j.renderTime.replace('s', '');
        let seconds = 0;
        if (clean.includes(':')) {
          const parts = clean.split(':');
          seconds = Number(parts[0]) * 60 + Number(parts[1]);
        } else {
          seconds = Number(clean);
        }
        if (!isNaN(seconds)) {
          totalRenderTimeSeconds += seconds;
          renderTimesCount++;
        }
      }
    });

    const averageRenderTime = renderTimesCount > 0 ? Math.round(totalRenderTimeSeconds / renderTimesCount) : 15;

    return {
      timestamp: new Date().toISOString(),
      queueSize,
      activeJobs,
      activeWorkers,
      averageCpu,
      averageRam,
      averageRenderTime
    };
  }

  /**
   * Main scaling loop evaluation
   */
  private static monitorAndScale() {
    const current = this.calculateCurrentMetrics();
    
    // Push to history
    this.metricsHistory.push(current);
    if (this.metricsHistory.length > 50) {
      this.metricsHistory.shift();
    }

    // Run health check on active elastic workers
    this.performHealthCheck();

    if (!this.config.enabled) return;

    const now = Date.now();
    const totalWorkers = WorkerRegistry.getAll().length;

    // 1. Evaluate Scale Up
    if (current.queueSize >= this.config.scaleUpThreshold || current.averageCpu > 80) {
      if (totalWorkers < this.config.maxWorkers) {
        const secondsSinceLastScaleUp = (now - this.lastScaleUpTime) / 1000;
        if (secondsSinceLastScaleUp >= this.config.cooldownPeriod) {
          this.scaleUp(current.queueSize, current.averageCpu);
        } else {
          console.log(`[AutoScalingService] Scale Up prevented by cooldown (${Math.round(this.config.cooldownPeriod - secondsSinceLastScaleUp)}s remaining)`);
        }
      }
    }

    // 2. Evaluate Scale Down
    else if (current.queueSize <= this.config.scaleDownThreshold) {
      if (totalWorkers > this.config.minWorkers) {
        const secondsSinceLastScaleDown = (now - this.lastScaleDownTime) / 1000;
        if (secondsSinceLastScaleDown >= this.config.cooldownPeriod) {
          this.scaleDown();
        } else {
          console.log(`[AutoScalingService] Scale Down prevented by cooldown (${Math.round(this.config.cooldownPeriod - secondsSinceLastScaleDown)}s remaining)`);
        }
      }
    }
  }

  /**
   * Ensures that the cluster is meeting the minimum worker counts
   */
  private static ensureMinimumWorkers() {
    if (!this.config.enabled) return;

    const totalWorkers = WorkerRegistry.getAll().length;
    if (totalWorkers < this.config.minWorkers) {
      const needed = this.config.minWorkers - totalWorkers;
      this.logEvent('SCALE_UP', `Cluster abaixo do limite mínimo de workers. Subindo ${needed} nó(s) elástico(s).`);
      
      for (let i = 0; i < needed; i++) {
        this.spawnElasticWorker();
      }
    }
  }

  /**
   * Ensures maximum worker limits are respected
   */
  private static ensureMaximumWorkersLimit() {
    const allWorkers = WorkerRegistry.getAll();
    if (allWorkers.length > this.config.maxWorkers) {
      const excess = allWorkers.length - this.config.maxWorkers;
      this.logEvent('SCALE_DOWN', `Cluster excede o limite máximo de ${this.config.maxWorkers} workers. Desligando ${excess} nós elásticos ociosos.`);
      
      let terminated = 0;
      for (const w of allWorkers) {
        if (this.elasticWorkerIds.has(w.id) && w.status === 'idle' && terminated < excess) {
          this.terminateElasticWorker(w.id);
          terminated++;
        }
      }
    }
  }

  /**
   * Action: Scales up by spinning up a new simulated/mock worker node
   */
  static scaleUp(queueSize: number, avgCpu: number): boolean {
    const totalWorkers = WorkerRegistry.getAll().length;
    if (totalWorkers >= this.config.maxWorkers) {
      console.log('[AutoScalingService] Maximum workers limit reached.');
      return false;
    }

    this.lastScaleUpTime = Date.now();
    const reason = queueSize >= this.config.scaleUpThreshold 
      ? `Fila de trabalhos acumulada (${queueSize} jobs aguardando)` 
      : `Sobrecarga média de CPU no cluster (${avgCpu}%)`;

    this.logEvent('SCALE_UP', `Ação de Scale Up acionada: ${reason}.`);
    this.spawnElasticWorker();
    return true;
  }

  /**
   * Action: Scales down by terminating an idle elastic worker node
   */
  static scaleDown(): boolean {
    const totalWorkers = WorkerRegistry.getAll().length;
    if (totalWorkers <= this.config.minWorkers) {
      console.log('[AutoScalingService] Minimum workers limit reached.');
      return false;
    }

    // Find an idle elastic worker
    const idleElasticWorker = WorkerRegistry.getAll().find(
      w => this.elasticWorkerIds.has(w.id) && w.status === 'idle'
    );

    if (idleElasticWorker) {
      this.lastScaleDownTime = Date.now();
      this.logEvent('SCALE_DOWN', `Ação de Scale Down acionada: Fila zerada e ociosa. Desligando nó elástico "${idleElasticWorker.id}".`);
      this.terminateElasticWorker(idleElasticWorker.id);
      return true;
    } else {
      console.log('[AutoScalingService] No idle elastic workers available for scale down.');
      return false;
    }
  }

  /**
   * Spawns a virtual elastic worker node and injects it into the WorkerRegistry
   */
  private static spawnElasticWorker() {
    const id = `worker-elastic-${Math.random().toString(36).substring(2, 6)}`;
    
    // Create a mock WebSocket interface to satisfy the WorkerConnection
    const mockSocket: any = {
      readyState: 1, // WebSocket.OPEN
      send: (message: string) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'start_job') {
            const payload = parsed.payload;
            this.simulateJobRendering(payload.jobId, payload, id);
          }
        } catch (err: any) {
          console.error(`[MockSocket ${id}] Error handling send:`, err.message);
        }
      },
      terminate: () => {
        console.log(`[MockSocket ${id}] Connection terminated.`);
      },
      close: () => {
        console.log(`[MockSocket ${id}] Connection closed.`);
      }
    };

    // Instantiate and register
    const worker = new WorkerConnection(mockSocket, '10.0.0.' + Math.floor(Math.random() * 254 + 1));
    
    // Register details in WorkerManager
    WorkerManager.registerWorker(worker, {
      id,
      cores: 4,
      ram: 16,
      gpu: 'NVIDIA T4 Tensor Core (Virtual)',
      os: 'Ubuntu 22.04 LTS (Elastic Cluster)',
      ffmpeg: 'v6.1-elastic-release',
      version: '1.2.0',
      status: 'idle'
    });

    // Mark as elastic
    this.elasticWorkerIds.add(id);

    // Initial heartbeat telemetry setup
    this.simulateElasticHeartbeat(id);

    this.logEvent('HEALTH_CHECK', `Nó elástico "${id}" provisionado e registrado no cluster com sucesso.`);
    
    // Distribute jobs instantly to pick up work
    JobDispatcher.distributeJobs();
  }

  /**
   * Shuts down and disconnects an elastic worker
   */
  private static terminateElasticWorker(workerId: string) {
    if (!this.elasticWorkerIds.has(workerId)) return;

    // Handle disconnect cleanup
    WorkerManager.handleDisconnect(workerId);
    this.elasticWorkerIds.delete(workerId);
    
    this.logEvent('HEALTH_CHECK', `Nó elástico "${workerId}" desprovisionado e removido do cluster.`);
  }

  /**
   * Periodically updates elastic worker heartbeats to simulate CPU and memory load
   */
  private static simulateElasticHeartbeat(workerId: string) {
    const update = () => {
      if (!this.elasticWorkerIds.has(workerId)) return;

      const worker = WorkerRegistry.get(workerId);
      if (worker) {
        // If busy, CPU usage is 85-100%, memory is 60-80%
        // If idle, CPU usage is 1-5%, memory is 15-25%
        const isBusy = worker.status === 'busy';
        const cpuUsage = isBusy ? Math.floor(Math.random() * 16) + 85 : Math.floor(Math.random() * 5) + 1;
        const ramUsage = isBusy ? Math.floor(Math.random() * 21) + 60 : Math.floor(Math.random() * 11) + 15;

        WorkerManager.updateHeartbeat(workerId, {
          cpuUsage,
          ramUsage,
          currentJobs: isBusy ? 1 : 0,
          temperature: isBusy ? '72°C' : '41°C'
        });
      }

      // Schedule next heartbeat in 5 seconds
      setTimeout(update, 5000);
    };

    update();
  }

  /**
   * Simulates full rendering stages for elastic workers with log trails
   */
  private static simulateJobRendering(jobId: string, payload: any, workerId: string) {
    const steps = [
      { status: 'Preparing' as const, progress: 10, logs: ['[AUTOSCALER] Inicializando ambiente virtual de rendering...', '[AUTOSCALER] Carregando assets e fontes estruturais...'] },
      { status: 'Rendering' as const, progress: 30, logs: ['[AUTOSCALER] Processando camadas do template...', '[AUTOSCALER] Renderizando frames do vídeo H.264...'] },
      { status: 'Rendering' as const, progress: 65, logs: ['[AUTOSCALER] Renderização de frames 50% concluída...', '[AUTOSCALER] Compondo áudios, legendas e trilhas...'] },
      { status: 'Encoding' as const, progress: 85, logs: ['[AUTOSCALER] Codificando vídeo para presets de redes sociais...', '[AUTOSCALER] Otimizando bitrate do arquivo final mp4...'] },
      { status: 'Saving' as const, progress: 95, logs: ['[AUTOSCALER] Salvando arquivo final na nuvem...', '[AUTOSCALER] Gerando thumbnail em alta resolução...'] },
      { status: 'Completed' as const, progress: 100, logs: ['[AUTOSCALER] Vídeo renderizado com sucesso no cluster elástico!', '[AUTOSCALER] Upload completo. Job concluído.'] }
    ];

    let currentStep = 0;

    const executeStep = async () => {
      // Check if the worker is still registered (not scaled down in the middle)
      if (!this.elasticWorkerIds.has(workerId)) {
        console.log(`[AutoScaling] Job ${jobId} simulation aborted because worker ${workerId} was terminated.`);
        return;
      }

      const worker = WorkerRegistry.get(workerId);
      if (!worker) return;

      // Check if job is still active / not canceled
      const job = JobQueue.getJob(jobId);
      if (!job || job.status === 'Canceled') {
        console.log(`[AutoScaling] Job ${jobId} was canceled. Aborting simulation.`);
        if (worker) {
          worker.status = 'idle';
          worker.currentJobId = undefined;
        }
        return;
      }

      const step = steps[currentStep];

      // Update in-memory job progress
      JobQueue.updateProgress(jobId, step.status, step.progress);
      
      const existingLogs = job.logs || [];
      const newLogs = [...existingLogs, ...step.logs];
      JobQueue.updateJob(jobId, { logs: newLogs });

      if (step.status === 'Completed') {
        worker.status = 'idle';
        worker.currentJobId = undefined;

        const outputUrl = `https://supabase.co/storage/v1/object/public/rendered/render_${jobId}.mp4`;
        const thumbnailUrl = `https://supabase.co/storage/v1/object/public/rendered/thumb_${jobId}.jpg`;
        const renderTime = `${Math.floor(Math.random() * 8) + 4}s`;

        JobQueue.updateJob(jobId, {
          status: 'Completed',
          progress: 100,
          renderTime,
          outputUrl,
          thumbnailUrl,
          completedAt: new Date().toISOString(),
          logs: newLogs
        });

        await RenderEngine.saveDbStatus(
          jobId,
          'completed',
          100,
          outputUrl,
          renderTime,
          undefined,
          newLogs
        );

        // Register rendered file
        try {
          await RenderEngine.registerRenderedFile(
            job.userId,
            job.projectId,
            job.projectName,
            outputUrl
          );
        } catch (err: any) {
          console.error('[AutoScaling] Error registering rendered file:', err.message);
        }

        // Trigger job dispatcher immediately
        JobDispatcher.distributeJobs();

      } else {
        // Update DB progress
        await RenderEngine.saveDbStatus(
          jobId,
          step.status === 'Preparing' ? 'Preparing' as any : 'processing',
          step.progress,
          undefined,
          undefined,
          undefined,
          newLogs
        );

        // Run next step in 1200ms
        currentStep++;
        setTimeout(executeStep, 1200);
      }
    };

    executeStep();
  }

  /**
   * Background health checks and failovers
   * Verifies if any elastic worker is stuck in a 'busy' status for too long
   */
  private static performHealthCheck() {
    const now = Date.now();
    const allWorkers = WorkerRegistry.getAll();

    allWorkers.forEach(w => {
      if (this.elasticWorkerIds.has(w.id) && w.status === 'busy' && w.currentJobId) {
        // If a worker has been busy on the same job for more than 45 seconds, assume it is stuck (health check fails)
        const job = JobQueue.getJob(w.currentJobId);
        if (job) {
          const startedTime = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
          const runningDurationSeconds = (now - startedTime) / 1000;

          if (runningDurationSeconds > 45) {
            this.logEvent('HEALTH_CHECK', `AVISO: Nó elástico "${w.id}" detectado como travado (Job "${w.currentJobId}" rodando há ${Math.round(runningDurationSeconds)}s). Reiniciando nó.`);
            
            // Re-queue the job and reset worker
            const jobId = w.currentJobId;
            
            // Terminate the worker
            this.terminateElasticWorker(w.id);

            // Re-spawn to maintain limits
            this.spawnElasticWorker();

            // Re-queue job
            const systemLog = `[SYSTEM] O Worker elástico "${w.id}" falhou no health check. A renderização foi devolvida para a fila.`;
            const updatedLogs = [...(job.logs || []), systemLog];

            JobQueue.updateJob(jobId, {
              status: 'Queued',
              progress: 0,
              logs: updatedLogs
            });

            RenderEngine.saveDbStatus(jobId, 'queued', 0, undefined, undefined, undefined, updatedLogs)
              .catch(err => console.error('[AutoScaling] Failed rescheduling stuck job:', err.message));
          }
        }
      }
    });
  }
}
