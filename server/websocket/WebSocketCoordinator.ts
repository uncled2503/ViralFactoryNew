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
            const { jobId, status, progress, logs } = payload;
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
            const { jobId, outputUrl, thumbnailUrl, previewUrl, renderTime, logs, debugInfo } = payload;
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
            const { jobId, error, logs, debugInfo } = payload;
            console.error(`[WebSocketCoordinator] [Job ${jobId}] FAILED on "${registeredId}": ${error}`);

            // Clear database write throttle entry
            this.dbSaveThrottleMap.delete(jobId);

            // Restore worker state
            connection.status = 'idle';
            connection.currentJobId = undefined;

            // Set failed states
            JobQueue.updateJob(jobId, {
              status: 'Failed',
              progress: 0,
              error: error || 'Remote rendering process failed.',
              logs,
              debugInfo
            });

            await RenderEngine.saveDbStatus(
              jobId,
              'failed',
              0,
              undefined,
              undefined,
              error || 'Remote worker rendering failure.',
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
