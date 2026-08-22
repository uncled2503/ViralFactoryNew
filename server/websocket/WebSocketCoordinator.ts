import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { WorkerConnection } from './WorkerConnection';
import { WorkerManager } from './WorkerManager';
import { HeartbeatManager } from './HeartbeatManager';
import { JobQueue } from '../render/JobQueue';
import { RenderEngine } from '../render/RenderEngine';
import { JobDispatcher } from './JobDispatcher';
import { AutoScalingService } from '../services/AutoScalingService';

export class WebSocketCoordinator {
  private static wss: WebSocketServer | null = null;
  private static ipConnections: Map<string, Set<WebSocket>> = new Map();
  private static dbSaveThrottleMap: Map<string, { lastSavedTime: number; lastSavedProgress: number }> = new Map();

  /**
   * Strips any log line that references the underlying render tool (name, flags, raw
   * command strings, process output) before it's persisted or sent to a client — workers
   * report low-level implementation detail in their logs that should never leave this
   * process as-is.
   */
  private static sanitizeLogs(logs: string[] | undefined | null): string[] {
    if (!logs || logs.length === 0) return [];
    return logs.filter(line => !/ffmpeg/i.test(line));
  }

  /**
   * Redacts the underlying render tool's name from error messages reported by workers,
   * without discarding the rest of the message (exit codes, reasons, etc are still useful).
   */
  private static sanitizeErrorMessage(message: string | undefined | null): string | undefined {
    if (!message) return message || undefined;
    return message.replace(/ffmpeg/gi, 'motor de renderização');
  }

  /**
   * Initializes the WebSocket Coordinator on the existing HTTP Server
   */
  static init(server: any) {
    console.log('=====================================================');
    console.log('⚡ STARTING VIRAL FACTORY DISTRIBUTED WEBSOCKET COORDINATOR');
    console.log('   Endpoint:   /ws/worker');
    console.log('=====================================================');

    this.wss = new WebSocketServer({ noServer: true });

    // Safely hook upgrade events for our dedicated render endpoint
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        if (url.pathname === '/ws/worker') {
          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        }
      } catch (err: any) {
        console.error('[WebSocketCoordinator] Upgrade routing error:', err.message);
      }
    });

    // Wire connections
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const rawIp = req.socket.remoteAddress || '127.0.0.1';
      const ip = rawIp.replace(/^::ffff:/, ''); // normalize IPv6-mapped IPv4 addresses
      
      const maxWsConnections = parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '10', 10);
      if (!this.ipConnections.has(ip)) {
        this.ipConnections.set(ip, new Set());
      }
      const connectionsForIp = this.ipConnections.get(ip)!;

      if (connectionsForIp.size >= maxWsConnections) {
        const logData = {
          event: 'MALICIOUS_ATTEMPT',
          type: 'WEBSOCKET_ABUSE_LIMIT_EXCEEDED',
          ip,
          details: `IP reached maximum WebSocket connection limit of ${maxWsConnections}`,
          timestamp: new Date().toISOString()
        };
        console.warn(JSON.stringify(logData));

        ws.close(4003, 'Too many connections from this IP');
        return;
      }

      connectionsForIp.add(ws);

      const connection = new WorkerConnection(ws, ip);
      let registeredId: string | null = null;

      console.log(`[WebSocketCoordinator] New incoming TCP connection from IP: ${ip}`);

      ws.on('message', async (messageData: string) => {
        try {
          const parsed = JSON.parse(messageData);
          const { type, payload } = parsed;

          console.log(`[COORDINATOR] Message received from worker "${registeredId || 'unregistered'}": type="${type}"`);

          // Guard against malformed JSON packets
          if (!type) {
            console.warn('[WebSocketCoordinator] Received packet without a type:', parsed);
            return;
          }

          if (type === 'register') {
            // Opt-in shared-secret check: only enforced when WORKER_SECRET is set server-side,
            // so existing trusted-network deployments (docker-compose, same-host) keep working
            // unchanged. Required once a worker connects over the public internet.
            const requiredSecret = process.env.WORKER_SECRET;
            if (requiredSecret && payload?.secret !== requiredSecret) {
              console.warn(`[WebSocketCoordinator] Rejected worker registration from ${ip}: invalid or missing WORKER_SECRET.`);
              ws.close(4001, 'Unauthorized: invalid worker secret');
              return;
            }

            const success = WorkerManager.registerWorker(connection, payload);
            if (success) {
              registeredId = payload.id;
              console.log(`[WebSocketCoordinator] Worker successfully registered: "${registeredId}" from ${ip}`);
            }
          }
          else if (type === 'heartbeat') {
            if (!registeredId) return;
            WorkerManager.updateHeartbeat(registeredId, payload);
          } 
          else if (type === 'job_progress') {
            if (!registeredId) return;
            const { jobId, status, progress, logs: rawLogs } = payload;
            const logs = this.sanitizeLogs(rawLogs);
            console.log(`[WebSocketCoordinator] [Job ${jobId}] Progress updated: ${status} - ${progress}% (${registeredId})`);

            // Always update live in-memory cache immediately
            JobQueue.updateProgress(jobId, status, progress);
            if (logs && logs.length > 0) {
              JobQueue.updateJob(jobId, { logs });
            }

            // Throttle intermediate database status saves (e.g. status === 'Rendering' or 'Encoding' or 'Preparing')
            const isFinalState = status === 'Completed' || status === 'Failed' || status === 'Canceled';
            const throttleData = this.dbSaveThrottleMap.get(jobId);
            const now = Date.now();
            
            let shouldSaveDb = isFinalState;
            if (!shouldSaveDb) {
              if (!throttleData) {
                shouldSaveDb = true;
              } else {
                const timeDiff = now - throttleData.lastSavedTime;
                const progressDiff = progress - throttleData.lastSavedProgress;
                // Save if progress increased by >= 10% OR more than 2000ms has elapsed since last DB write
                if (progressDiff >= 10 || timeDiff >= 2000) {
                  shouldSaveDb = true;
                }
              }
            }

            if (shouldSaveDb) {
              this.dbSaveThrottleMap.set(jobId, { lastSavedTime: now, lastSavedProgress: progress });
              
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
          } 
          else if (type === 'job_completed') {
            if (!registeredId) return;
            const { jobId, outputUrl, thumbnailUrl, previewUrl, renderTime, logs: rawLogs, debugInfo: rawDebugInfo } = payload;
            // Never persist or forward the raw render command / process output — only
            // generic, non-identifying telemetry (timing, size, resolution, etc).
            const { command, stdout, stderr, ...debugInfo } = rawDebugInfo || {};
            const logs = this.sanitizeLogs(rawLogs);
            console.log(`[WebSocketCoordinator] [Job ${jobId}] COMPLETED by worker "${registeredId}" in ${renderTime}!`);

            // Clear database write throttle entry
            this.dbSaveThrottleMap.delete(jobId);

            // Mark worker as available
            connection.status = 'idle';
            connection.currentJobId = undefined;

            // Save state in-memory
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

            // Save state in Database
            await RenderEngine.saveDbStatus(
              jobId,
              'completed',
              100,
              outputUrl,
              renderTime,
              undefined,
              logs,
              debugInfo,
              thumbnailUrl
            );

            // Fetch and register final user outputs
            const job = JobQueue.getJob(jobId);
            if (job) {
              try {
                await RenderEngine.registerRenderedFile(
                  job.userId,
                  job.projectId,
                  job.projectName,
                  outputUrl
                );
              } catch (regErr: any) {
                console.error(`[WebSocketCoordinator] Failed to register completed video in DB:`, regErr.message);
              }
            }

            // Immediately check for other jobs
            JobDispatcher.distributeJobs();
          } 
          else if (type === 'job_failed') {
            if (!registeredId) return;
            const { jobId, error: rawError, logs: rawLogs, debugInfo: rawDebugInfo } = payload;
            const { command, stdout, stderr, ...debugInfo } = rawDebugInfo || {};
            const logs = this.sanitizeLogs(rawLogs);
            const error = this.sanitizeErrorMessage(rawError);
            console.error(`[WebSocketCoordinator] [Job ${jobId}] FAILED on "${registeredId}": ${rawError}`);

            // Clear database write throttle entry
            this.dbSaveThrottleMap.delete(jobId);

            // Restore worker state
            connection.status = 'idle';
            connection.currentJobId = undefined;

            // Set failed states
            JobQueue.updateJob(jobId, {
              status: 'Failed',
              progress: 0,
              error: error || 'Falha no processamento remoto da renderização.',
              logs,
              debugInfo
            });

            await RenderEngine.saveDbStatus(
              jobId,
              'failed',
              0,
              undefined,
              undefined,
              error || 'Falha no processamento remoto da renderização.',
              logs,
              debugInfo
            );

            // Process next jobs
            JobDispatcher.distributeJobs();
          }
        } catch (err: any) {
          console.error('[WebSocketCoordinator] Error processing socket message:', err.message);
        }
      });

      ws.on('close', () => {
        const connSet = this.ipConnections.get(ip);
        if (connSet) {
          connSet.delete(ws);
          if (connSet.size === 0) {
            this.ipConnections.delete(ip);
          }
        }

        if (registeredId) {
          console.warn(`[WebSocketCoordinator] Worker disconnected: "${registeredId}"`);
          WorkerManager.handleDisconnect(registeredId);
        } else {
          console.log('[WebSocketCoordinator] Temporary raw client socket closed.');
        }
      });

      ws.on('error', (err: any) => {
        console.error(`[WebSocketCoordinator] Connection error on worker "${registeredId || 'Unregistered'}":`, err.message);
      });
    });

    // Start checking heartbeats and bind disconnect events
    HeartbeatManager.startMonitoring((timeoutWorkerId) => {
      WorkerManager.handleDisconnect(timeoutWorkerId);
    });

    // Start Auto Scaling Engine
    AutoScalingService.start();

    // Listen to queue events to dispatch automatically
    JobQueue.emitter.on('jobAdded', () => {
      JobDispatcher.distributeJobs();
    });

    JobQueue.emitter.on('queueChanged', () => {
      JobDispatcher.distributeJobs();
    });
  }

  /**
   * Triggers cleanup on shutdown
   */
  static shutdown() {
    HeartbeatManager.stopMonitoring();
    AutoScalingService.stop();
    this.wss?.close();
  }
}
