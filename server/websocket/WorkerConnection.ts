import { WebSocket } from 'ws';
import { RegisterPayload, HeartbeatPayload } from './Protocol';

export class WorkerConnection {
  readonly socket: WebSocket;
  readonly ip: string;
  readonly connectedAt: number;
  
  id!: string;
  hostname!: string;
  cores: number = 1;
  totalRam: number = 0; // GB
  gpu: string = 'N/A';
  os: string = 'Unknown';
  ffmpegVersion: string = 'N/A';
  version: string = '1.0.0';

  // Live metrics
  status: 'idle' | 'busy' = 'idle';
  cpuUsage: number = 0;
  ramUsage: number = 0;
  lastHeartbeat: number;
  currentJobId?: string;

  constructor(socket: WebSocket, ip: string) {
    this.socket = socket;
    this.ip = ip;
    this.connectedAt = Date.now();
    this.lastHeartbeat = Date.now();
  }

  /**
   * Registers worker metadata sent in the registration handshake
   */
  register(payload: RegisterPayload) {
    this.id = payload.id;
    this.hostname = payload.id; // use ID as visual display hostname too
    this.cores = payload.cores || 1;
    this.totalRam = payload.ram || 0;
    this.gpu = payload.gpu || 'N/A';
    this.os = payload.os || 'Unknown';
    this.ffmpegVersion = payload.ffmpeg || 'N/A';
    this.version = payload.version || '1.0.0';
    this.lastHeartbeat = Date.now();
  }

  /**
   * Updates state with received heartbeat details
   */
  updateHeartbeat(payload: HeartbeatPayload) {
    this.lastHeartbeat = Date.now();
    this.cpuUsage = payload.cpuUsage;
    this.ramUsage = payload.ramUsage;
  }

  /**
   * Safely sends a message down to the remote render node
   */
  send(type: string, payload?: any): boolean {
    if (this.socket.readyState !== WebSocket.OPEN) {
      console.warn(`[WorkerConnection] Cannot send to "${this.id}". Socket is not open.`);
      return false;
    }
    try {
      this.socket.send(JSON.stringify({ type, payload }));
      return true;
    } catch (err: any) {
      console.error(`[WorkerConnection] Failed sending message to "${this.id}":`, err.message);
      return false;
    }
  }

  /**
   * Gets clean JSON serialization of current telemetry stats
   */
  getTelemetry() {
    return {
      id: this.id,
      name: this.id, // compatibility with frontend name selector
      hostname: this.hostname,
      cores: this.cores,
      totalRam: this.totalRam,
      gpu: this.gpu,
      os: this.os,
      ffmpegVersion: this.ffmpegVersion,
      version: this.version,
      ip: this.ip,
      status: this.status,
      cpuUsage: this.cpuUsage,
      memoryUsage: this.ramUsage, // mapped as memoryUsage for UI compatibility
      ramUsage: this.ramUsage,
      currentJobId: this.currentJobId,
      lastActiveSecondsAgo: Math.round((Date.now() - this.lastHeartbeat) / 1000),
      uptimeSeconds: Math.round((Date.now() - this.connectedAt) / 1000)
    };
  }

  /**
   * Terminates the connection immediately
   */
  terminate() {
    try {
      this.socket.terminate();
    } catch {}
  }
}
