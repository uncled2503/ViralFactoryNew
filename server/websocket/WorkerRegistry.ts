import { WorkerConnection } from './WorkerConnection';

export class WorkerRegistry {
  private static workers: Map<string, WorkerConnection> = new Map();

  /**
   * Adds a new active worker node to the registry
   */
  static add(worker: WorkerConnection) {
    if (!worker.id) return;
    this.workers.set(worker.id, worker);
    console.log(`[WorkerRegistry] Added worker "${worker.id}" to cluster registry.`);
  }

  /**
   * Retrieves a specific worker node by its unique ID
   */
  static get(id: string): WorkerConnection | undefined {
    return this.workers.get(id);
  }

  /**
   * Removes a worker node from the cluster
   */
  static remove(id: string): boolean {
    const deleted = this.workers.delete(id);
    if (deleted) {
      console.log(`[WorkerRegistry] Removed worker "${id}" from cluster registry.`);
    }
    return deleted;
  }

  /**
   * Lists all connected active worker connections
   */
  static getAll(): WorkerConnection[] {
    return Array.from(this.workers.values());
  }

  /**
   * Returns list of workers currently available to render jobs
   */
  static getIdleWorkers(): WorkerConnection[] {
    return this.getAll().filter(w => w.status === 'idle');
  }

  /**
   * Computes dynamic performance metric aggregates
   */
  static getClusterStats() {
    const all = this.getAll();
    const idleCount = all.filter(w => w.status === 'idle').length;
    const busyCount = all.filter(w => w.status === 'busy').length;
    
    let totalCores = 0;
    let totalRamGB = 0;
    
    all.forEach(w => {
      totalCores += w.cores;
      totalRamGB += w.totalRam;
    });

    return {
      onlineCount: all.length,
      idleCount,
      busyCount,
      totalCores,
      totalRamGB
    };
  }
}
