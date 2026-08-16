import { WorkerConnection } from './WorkerConnection';
import { WorkerRegistry } from './WorkerRegistry';
import { JobQueue } from '../render/JobQueue';
import { RenderEngine } from '../render/RenderEngine';
import { JobDispatcher } from './JobDispatcher';
import { RedisService } from '../services/RedisService';

export class WorkerManager {
  /**
   * Registers a connected worker and updates the registry
   */
  static registerWorker(worker: WorkerConnection, payload: any): boolean {
    if (!payload.id) {
      console.warn('[WorkerManager] Attempted registration without valid ID.');
      return false;
    }

    worker.register({
      id: payload.id,
      cores: payload.cores,
      ram: payload.ram,
      gpu: payload.gpu,
      os: payload.os,
      ffmpeg: payload.ffmpeg,
      version: payload.version
    });

    if (payload.status === 'busy' && payload.currentJobId) {
      console.log(`[WorkerManager] Worker "${payload.id}" re-registered while busy with Job "${payload.currentJobId}". Restoring state...`);
      worker.status = 'busy';
      worker.currentJobId = payload.currentJobId;

      const job = JobQueue.getJob(payload.currentJobId);
      if (job && (job.status === 'Queued' || job.status === 'Preparing')) {
        console.log(`[WorkerManager] Successfully recovered active job "${payload.currentJobId}" for worker "${payload.id}".`);
        JobQueue.updateJob(payload.currentJobId, {
          status: 'Rendering'
        });
      }
    }

    WorkerRegistry.add(worker);

    // Sync to Redis cluster coordinator
    RedisService.registerWorkerInCluster(payload.id, {
      id: payload.id,
      cores: payload.cores,
      ram: payload.ram,
      gpu: payload.gpu,
      os: payload.os,
      ffmpeg: payload.ffmpeg,
      version: payload.version,
      status: payload.status || 'idle',
      currentJobId: payload.currentJobId
    }).catch(err => console.error('[WorkerManager] Redis cluster registry failed:', err.message));
    
    // Send acknowledgement
    worker.send('register_ack', { success: true, workerId: worker.id });

    // Instantly check for queued work
    JobDispatcher.distributeJobs();
    
    return true;
  }

  /**
   * Updates a worker's heartbeat and live telemetry
   */
  static updateHeartbeat(workerId: string, payload: any) {
    const worker = WorkerRegistry.get(workerId);
    if (worker) {
      worker.updateHeartbeat({
        cpuUsage: payload.cpuUsage || 0,
        ramUsage: payload.ramUsage || 0,
        currentJobs: payload.currentJobs,
        temperature: payload.temperature
      });
    }

    // Sync heartbeat metrics to Redis cluster coordinator
    RedisService.updateWorkerHeartbeatInCluster(workerId, {
      cpuUsage: payload.cpuUsage || 0,
      ramUsage: payload.ramUsage || 0,
      currentJobs: payload.currentJobs,
      temperature: payload.temperature
    }).catch(err => console.error('[WorkerManager] Redis cluster heartbeat failed:', err.message));
  }

  /**
   * Handles cleanup and job re-queuing when a worker disconnects or crashes
   */
  static handleDisconnect(workerId: string) {
    const worker = WorkerRegistry.get(workerId);
    if (!worker) return;

    console.warn(`[WorkerManager] Handling disconnect for worker: "${workerId}"`);

    // Re-schedule active rendering task if worker was rendering one
    if (worker.status === 'busy' && worker.currentJobId) {
      const jobId = worker.currentJobId;
      const job = JobQueue.getJob(jobId);
      
      if (job && (job.status !== 'Completed' && job.status !== 'Failed' && job.status !== 'Canceled')) {
        console.warn(`[WorkerManager] Job ${jobId} was active on "${workerId}". Re-queuing job back into the pipeline...`);
        
        const systemLog = `[SYSTEM] O Worker remoto "${workerId}" desconectou inesperadamente. A renderização foi devolvida para a fila.`;
        const updatedLogs = [...(job.logs || []), systemLog];

        JobQueue.updateJob(jobId, {
          status: 'Queued',
          progress: 0,
          logs: updatedLogs
        });

        RenderEngine.saveDbStatus(jobId, 'queued', 0, undefined, undefined, undefined, updatedLogs)
          .catch(err => console.error(`[WorkerManager] Failed saving rescheduled db state for ${jobId}:`, err.message));
      }
    }

    // Remove from active registry
    WorkerRegistry.remove(workerId);

    // Remove from Redis cluster registry
    RedisService.removeWorkerFromCluster(workerId)
      .catch(err => console.error('[WorkerManager] Redis cluster removal failed:', err.message));

    // See if other idle nodes can pick up work
    JobDispatcher.distributeJobs();
  }

  /**
   * Returns a list of connected workers formatted exactly as expected by the frontend RenderFarmTab
   */
  static async getWorkersForAdmin() {
    const localWorkers = WorkerRegistry.getAll().map(w => {
      const stats = w.getTelemetry();
      return {
        id: stats.id,
        name: stats.id, // mapped as name for RenderFarmTab
        hostname: stats.hostname,
        cores: stats.cores,
        totalRam: stats.totalRam,
        gpu: stats.gpu,
        os: stats.os,
        // Never expose the underlying render tool's real version banner over the API.
        engineVersion: 'Viral Engine 3.2',
        version: stats.version,
        ip: stats.ip,
        status: stats.status === 'busy' ? 'busy' : 'online', // compatibility mapping
        cpuUsage: stats.cpuUsage,
        memoryUsage: stats.ramUsage, // mapped to memoryUsage for RenderFarmTab
        currentJobId: stats.currentJobId,
        uptimeSeconds: stats.uptimeSeconds,
        lastActiveSecondsAgo: stats.lastActiveSecondsAgo,
        isLocal: true
      };
    });

    try {
      const clusterWorkersMap = await RedisService.getClusterWorkers();
      const result = [...localWorkers];

      for (const [id, stats] of clusterWorkersMap.entries()) {
        if (!result.some(w => w.id === id)) {
          result.push({
            id: stats.id || id,
            name: stats.id || id,
            hostname: stats.hostname || 'Remote Worker',
            cores: stats.cores || 1,
            totalRam: stats.ram || stats.totalRam || 0,
            gpu: stats.gpu || false,
            os: stats.os || 'Linux',
            engineVersion: 'Viral Engine 3.2',
            version: stats.version || '1.0.0',
            ip: stats.ip || '0.0.0.0',
            status: stats.status === 'busy' ? 'busy' : 'online',
            cpuUsage: stats.cpuUsage || 0,
            memoryUsage: stats.ramUsage || 0,
            currentJobId: stats.currentJobId,
            uptimeSeconds: stats.uptimeSeconds || 0,
            lastActiveSecondsAgo: Math.round((Date.now() - (stats.lastHeartbeat || Date.now())) / 1000),
            isLocal: false
          });
        }
      }
      return result;
    } catch (err: any) {
      console.error('[WorkerManager] Failed to fetch cluster workers from Redis:', err.message);
      return localWorkers;
    }
  }
}
