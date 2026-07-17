import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import WebSocket, { WebSocketServer } from 'ws';
import { WorkerRegistry } from '../server/websocket/WorkerRegistry';
import { WorkerManager } from '../server/websocket/WorkerManager';
import { HeartbeatManager } from '../server/websocket/HeartbeatManager';
import { WorkerConnection } from '../server/websocket/WorkerConnection';
import { JobQueue } from '../server/render/JobQueue';
import { JobDispatcher } from '../server/websocket/JobDispatcher';
import { LocalDbMutex } from '../server/database/LocalDbMutex';

describe('Modular WebSocket Coordinator & Worker Farm Cluster Tests', () => {
  let server: any;
  let wss: WebSocketServer;
  let port: number;

  beforeAll(async () => {
    server = createServer();
    wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: any, socket: any, head: any) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        port = address.port;
        resolve();
      });
    });

    // Seed the database with test projects/templates for dispatch testing
    await LocalDbMutex.runLocked((db) => {
      if (!db.projects) db.projects = [];
      if (!db.templates) db.templates = [];

      db.projects.push({
        id: 'proj-failover',
        user_id: 'user-failover',
        name: 'Failover Project',
        presetId: 'tiktok',
        variables: {}
      });

      db.templates.push({
        id: 'tpl-failover',
        name: 'Failover Template',
        defaultDuration: 10
      });
    });
  });

  afterAll(async () => {
    // Cleanup seeded records
    await LocalDbMutex.runLocked((db) => {
      db.projects = db.projects?.filter((p: any) => p.id !== 'proj-failover') || [];
      db.templates = db.templates?.filter((t: any) => t.id !== 'tpl-failover') || [];
    }).catch(() => {});

    await new Promise<void>((resolve) => {
      wss.close(() => {
        server.close(() => {
          resolve();
        });
      });
    });
  });

  it('should register a worker and process its properties correctly', async () => {
    const wsClient = new WebSocket(`ws://127.0.0.1:${port}`);

    const registrationPromise = new Promise<void>((resolve, reject) => {
      wss.once('connection', (ws) => {
        const conn = new WorkerConnection(ws, '127.0.0.1');
        
        ws.once('message', async (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            expect(parsed.type).toBe('register');
            expect(parsed.payload.id).toBe('test-worker-001');

            const success = WorkerManager.registerWorker(conn, parsed.payload);
            expect(success).toBe(true);

            // Verify active worker is listed in registry
            const activeWorkers = await WorkerManager.getWorkersForAdmin();
            const matched = activeWorkers.find(w => w.id === 'test-worker-001');
            expect(matched).toBeDefined();
            expect(matched?.hostname).toBe('test-worker-001');
            expect(matched?.status).toBe('online');
            
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    wsClient.on('open', () => {
      wsClient.send(JSON.stringify({
        type: 'register',
        payload: {
          id: 'test-worker-001',
          cores: 8,
          ram: 16,
          gpu: 'NVIDIA RTX 4090',
          os: 'Linux (Test)',
          ffmpeg: 'ffmpeg',
          version: '1.0.0'
        }
      }));
    });

    await registrationPromise;
    wsClient.close();
  });

  it('should monitor and update worker metrics via heartbeat packets', async () => {
    const wsClient = new WebSocket(`ws://127.0.0.1:${port}`);

    const heartbeatPromise = new Promise<void>((resolve, reject) => {
      wss.once('connection', (ws) => {
        const conn = new WorkerConnection(ws, '127.0.0.1');
        WorkerManager.registerWorker(conn, {
          id: 'test-worker-002',
          cores: 4,
          ram: 8,
          gpu: 'Intel',
          os: 'Linux',
          ffmpeg: 'ffmpeg',
          version: '1.0.0'
        });

        ws.on('message', async (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.type === 'heartbeat') {
              expect(parsed.payload.cpuUsage).toBe(42);
              expect(parsed.payload.ramUsage).toBe(65);

              WorkerManager.updateHeartbeat('test-worker-002', parsed.payload);

              const workers = await WorkerManager.getWorkersForAdmin();
              const matched = workers.find(w => w.id === 'test-worker-002');
              expect(matched?.cpuUsage).toBe(42);
              expect(matched?.memoryUsage).toBe(65);

              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    wsClient.on('open', () => {
      wsClient.send(JSON.stringify({
        type: 'heartbeat',
        payload: {
          cpuUsage: 42,
          ramUsage: 65
        }
      }));
    });

    await heartbeatPromise;
    wsClient.close();
  });

  it('should redistribute jobs if a worker disconnects or times out', async () => {
    // Clear any remaining workers from the registry first to guarantee clean isolated tests
    WorkerRegistry.getAll().forEach(w => WorkerRegistry.remove(w.id));

    // 1. Create a queued job
    const job = JobQueue.createJob({
      userId: 'user-failover',
      projectId: 'proj-failover',
      projectName: 'Failover Project',
      templateId: 'tpl-failover',
      templateName: 'Failover Template',
      duration: '0:10',
      variables: {}
    });

    expect(job.status).toBe('Queued');

    // 2. Register worker
    const mockSocket: any = {
      send: vi.fn().mockReturnValue(true),
      on: vi.fn(),
      readyState: 1
    };
    const conn = new WorkerConnection(mockSocket, '127.0.0.1');
    WorkerManager.registerWorker(conn, {
      id: 'test-worker-failover',
      cores: 4,
      ram: 8,
      gpu: 'Mock',
      os: 'MockOS',
      ffmpeg: 'ffmpeg',
      version: '1.0.0'
    });

    // 3. Dispatch job to worker
    await JobDispatcher.distributeJobs();

    // Verify job is now owned by worker
    expect(conn.status).toBe('busy');
    expect(conn.currentJobId).toBe(job.id);
    expect(JobQueue.getJob(job.id)?.status).toBe('Preparing');

    // 4. Trigger sudden disconnect
    WorkerManager.handleDisconnect('test-worker-failover');

    // Job should fall back to 'Queued' status to be re-processed by another worker
    const refetchedJob = JobQueue.getJob(job.id);
    expect(refetchedJob?.status).toBe('Queued');
  });
});
