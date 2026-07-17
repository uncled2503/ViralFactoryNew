/**
 * Protocol Definitions for the Viral Factory Distributed Render Farm
 */

export interface RegisterPayload {
  id: string;
  cores?: number;
  ram?: number; // Total RAM in GB
  gpu?: string;
  os?: string;
  ffmpeg?: string;
  version?: string;
}

export interface HeartbeatPayload {
  cpuUsage: number;
  ramUsage: number;
  currentJobs?: string[];
  temperature?: number;
}

export interface JobProgressPayload {
  jobId: string;
  status: string;
  progress: number;
  logs?: string[];
}

export interface JobCompletedPayload {
  jobId: string;
  outputUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  renderTime: string;
  logs?: string[];
  debugInfo?: any;
}

export interface JobFailedPayload {
  jobId: string;
  error: string;
  logs?: string[];
  debugInfo?: any;
}

export interface WebSocketMessage {
  type: 'register' | 'register_ack' | 'heartbeat' | 'start_job' | 'abort_job' | 'job_progress' | 'job_completed' | 'job_failed';
  payload?: any;
}
