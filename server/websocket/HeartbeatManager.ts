import { WorkerRegistry } from './WorkerRegistry';

export class HeartbeatManager {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static timeoutLimitMs = 25000; // 25 seconds heartbeat tolerance

  /**
   * Starts monitoring loop for all active workers
   */
  static startMonitoring(onTimeoutDrop: (workerId: string) => void) {
    this.stopMonitoring();
    console.log('[HeartbeatManager] Starting background worker connection monitoring...');
    
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      const workers = WorkerRegistry.getAll();

      workers.forEach(worker => {
        const inactiveTime = now - worker.lastHeartbeat;
        if (inactiveTime > this.timeoutLimitMs) {
          console.warn(`[HeartbeatManager] Worker "${worker.id}" missed heartbeats for ${Math.round(inactiveTime / 1000)}s. Dropping unresponsive connection.`);
          
          // Terminate connection
          worker.terminate();
          
          // Unregister and notify coordinator to reschedule jobs
          WorkerRegistry.remove(worker.id);
          onTimeoutDrop(worker.id);
        }
      });
    }, 10000);
  }

  /**
   * Stops the check loop
   */
  static stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
