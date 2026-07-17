/**
 * Facade compatibility file pointing to the new Modular WebSocket Coordinator
 */

import { WebSocketCoordinator } from '../websocket/WebSocketCoordinator';
import { WorkerManager } from '../websocket/WorkerManager';
import { JobDispatcher } from '../websocket/JobDispatcher';

export interface ConnectedWorker {
  id: string;
  socket: any;
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
  /**
   * Initializes the WebSocket server on top of the Express HTTP server
   */
  static init(server: any) {
    WebSocketCoordinator.init(server);
  }

  /**
   * Attempts to distribute next queued jobs to available workers
   */
  static distributeJobs() {
    JobDispatcher.distributeJobs();
  }

  /**
   * Fetches active connected workers and their heartbeats for admin status monitoring
   */
  static async getWorkers() {
    return await WorkerManager.getWorkersForAdmin();
  }

  /**
   * Clean up on server close
   */
  static shutdown() {
    WebSocketCoordinator.shutdown();
  }
}
