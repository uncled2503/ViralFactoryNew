import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { RedisService } from '../server/services/RedisService';
import { WorkerRegistry } from '../server/websocket/WorkerRegistry';
import { JobQueue } from '../server/render/JobQueue';

describe('Redis Scale Engine, Pub/Sub, Cache & Coordination Tests', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeAll(() => {
    originalEnv = { ...process.env };
    // Initialize RedisService (which naturally tries to connect and defaults to fallback if unavailable)
    RedisService.init();
  });

  afterEach(() => {
    // Restore env to avoid cross-test contamination
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  describe('Connection & Health Check Resilience', () => {
    it('should initialize and provide connection status', () => {
      const status = RedisService.getConnectionStatus();
      expect(['connected', 'disconnected', 'connecting', 'fallback']).toContain(status);
    });

    it('should return a healthy health check payload', () => {
      const health = RedisService.healthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('redisConnected');
      expect(health).toHaveProperty('metrics');
      expect(typeof health.redisConnected).toBe('boolean');
    });

    it('should track metrics correctly', () => {
      const metrics = RedisService.getMetrics();
      expect(metrics).toHaveProperty('commandsProcessed');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('publishes');
      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics).toHaveProperty('fallbackCount');
    });
  });

  describe('Environment Variable Priorities & Configuration Parsing', () => {
    it('should prioritize REDIS_URL and configure TLS correctly', () => {
      process.env.REDIS_URL = 'rediss://default:upstashpass@upstash-host.com:6379';
      process.env.REDIS_HOST = 'conflicting-host.com';
      process.env.REDIS_PORT = '9999';
      process.env.REDIS_PASSWORD = 'wrong-password';
      process.env.REDIS_TLS = 'true';

      (RedisService as any).client = null;
      (RedisService as any).rebuildClients();

      const client = (RedisService as any).client;
      expect(client).toBeDefined();
      
      expect(client.options.host).toBe('upstash-host.com');
      expect(client.options.port).toBe(6379);
      expect(client.options.password).toBe('upstashpass');
      expect(client.options.tls).toBeDefined();
      expect(client.options.tls.rejectUnauthorized).toBe(false);
    });

    it('should fallback to host, port, and password if REDIS_URL is absent', () => {
      delete process.env.REDIS_URL;
      process.env.REDIS_HOST = 'custom-redis-host.com';
      process.env.REDIS_PORT = '1234';
      process.env.REDIS_PASSWORD = 'my-secret-pass';
      process.env.REDIS_TLS = 'false';

      (RedisService as any).client = null;
      (RedisService as any).rebuildClients();

      const client = (RedisService as any).client;
      expect(client).toBeDefined();
      expect(client.options.host).toBe('custom-redis-host.com');
      expect(client.options.port).toBe(1234);
      expect(client.options.password).toBe('my-secret-pass');
      expect(client.options.tls).toBeUndefined();
    });

    it('should respect REDIS_ENABLED=false and enter fallback directly', () => {
      process.env.REDIS_ENABLED = 'false';
      
      (RedisService as any).client = null;
      (RedisService as any).status = 'disconnected';
      (RedisService as any).circuitState = 'CLOSED';

      RedisService.init();

      expect(RedisService.getConnectionStatus()).toBe('fallback');
      expect((RedisService as any).circuitState).toBe('OPEN');
    });
  });

  describe('Circuit Breaker & Fallback Resilience', () => {
    beforeEach(() => {
      (RedisService as any).consecutiveFailures = 0;
      (RedisService as any).circuitState = 'CLOSED';
      (RedisService as any).status = 'connected';
    });

    it('should trip Circuit Breaker to OPEN and switch to fallback on repeated failures', () => {
      expect((RedisService as any).circuitState).toBe('CLOSED');

      const mockError = new Error('Connection refused');
      (RedisService as any).handleRedisError(mockError, 'get');
      (RedisService as any).handleRedisError(mockError, 'get');
      
      expect((RedisService as any).circuitState).toBe('CLOSED');

      // Third failure triggers trip
      (RedisService as any).handleRedisError(mockError, 'get');

      expect((RedisService as any).circuitState).toBe('OPEN');
      expect(RedisService.getConnectionStatus()).toBe('fallback');
    });

    it('should route operations to fallback memory store when Circuit is OPEN', async () => {
      (RedisService as any).circuitState = 'OPEN';
      (RedisService as any).status = 'fallback';

      const key = 'cb:test:key';
      const val = 'CircuitBreakerValue';

      await RedisService.set(key, val);
      const retrieved = await RedisService.get(key);

      expect(retrieved).toBe(val);
    });
  });

  describe('Automatic Reconnection & State Synchronization', () => {
    it('should trigger state synchronization when connection is restored', async () => {
      // Back up original state to prevent downstream contamination
      const origClient = (RedisService as any).client;
      const origStatus = (RedisService as any).status;
      const origCircuit = (RedisService as any).circuitState;
      const origFailures = (RedisService as any).consecutiveFailures;

      try {
        (RedisService as any).circuitState = 'OPEN';
        (RedisService as any).status = 'fallback';

        // Write queue item inside fallback
        await RedisService.pushQueue('queue:logs:sync_test', { progress: 50, msg: 'Sync render' });

        // Register a dummy worker
        (WorkerRegistry as any).workers = new Map();
        const mockWorker = {
          id: 'sync-worker-01',
          getTelemetry: () => ({
            id: 'sync-worker-01',
            cores: 8,
            ram: 16,
            gpu: true,
            os: 'Linux',
            ffmpeg: '6.0',
            version: '1.0.0',
            status: 'idle',
            currentJobId: undefined
          })
        };
        WorkerRegistry.add(mockWorker as any);

        // Register an active job
        (JobQueue as any).jobs = new Map();
        const mockJob = JobQueue.createJob({
          userId: 'user-001',
          projectId: 'project-001',
          projectName: 'My Project',
          templateId: 'temp-001',
          templateName: 'Template 1',
          duration: '10',
          variables: {}
        });
        JobQueue.updateJob(mockJob.id, { status: 'Rendering', progress: 45 });

        // Mock clients to verify synced data sets
        const setKeys = new Map<string, string>();
        const hashKeys = new Map<string, string>();
        const pushedLists = new Map<string, string[]>();

        const mockClient = {
          hset: async (key: string, field: string, val: string) => {
            hashKeys.set(`${key}:${field}`, val);
          },
          rpush: async (key: string, val: string) => {
            if (!pushedLists.has(key)) pushedLists.set(key, []);
            pushedLists.get(key)!.push(val);
          },
          set: async (key: string, val: string) => {
            setKeys.set(key, val);
          },
          ping: async () => 'PONG'
        };

        (RedisService as any).client = mockClient;
        (RedisService as any).status = 'connected';
        (RedisService as any).circuitState = 'CLOSED';

        // Call synchronization handler
        await (RedisService as any).syncAfterReconnection();

        // Check worker synced correctly
        expect(hashKeys.has('cluster:workers:sync-worker-01')).toBe(true);
        const workerData = JSON.parse(hashKeys.get('cluster:workers:sync-worker-01')!);
        expect(workerData.cores).toBe(8);

        // Check queue sync
        expect(pushedLists.has('queue:logs:sync_test')).toBe(true);
        const logData = JSON.parse(pushedLists.get('queue:logs:sync_test')![0]);
        expect(logData.progress).toBe(50);

        // Check pending job sync
        const expectedJobKey = `job:status:${mockJob.id}`;
        expect(setKeys.has(expectedJobKey)).toBe(true);
        const syncedJob = JSON.parse(setKeys.get(expectedJobKey)!);
        expect(syncedJob.status).toBe('Rendering');
        expect(syncedJob.progress).toBe(45);
      } finally {
        // Cleanly restore original state
        (RedisService as any).client = origClient;
        (RedisService as any).status = origStatus;
        (RedisService as any).circuitState = origCircuit;
        (RedisService as any).consecutiveFailures = origFailures;
      }
    });
  });

  describe('Cache Operations', () => {
    it('should set, get, and delete cache values', async () => {
      const testKey = 'test:cache:key';
      const testVal = 'RedisScaleValue123';

      await RedisService.del(testKey);

      const initial = await RedisService.get(testKey);
      expect(initial).toBeNull();

      await RedisService.set(testKey, testVal);

      const read = await RedisService.get(testKey);
      expect(read).toBe(testVal);

      await RedisService.del(testKey);

      const final = await RedisService.get(testKey);
      expect(final).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      const testKey = 'test:cache:ttl';
      const testVal = 'TemporaryValue';

      await RedisService.set(testKey, testVal, 1);

      const immediate = await RedisService.get(testKey);
      expect(immediate).toBe(testVal);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expired = await RedisService.get(testKey);
      expect(expired).toBeNull();
    });
  });

  describe('Progress Queue (Fila de Progresso)', () => {
    it('should push, pop, and measure progress log updates in FIFO order', async () => {
      const queueName = 'test:queue:progress_updates';
      const log1 = { step: 'Initiated', progress: 10 };
      const log2 = { step: 'Exporting', progress: 75 };

      await RedisService.pushQueue(queueName, log1);
      await RedisService.pushQueue(queueName, log2);

      const len = await RedisService.getQueueLength(queueName);
      expect(len).toBe(2);

      const item1 = await RedisService.popQueue(queueName);
      expect(item1).toEqual(log1);

      const item2 = await RedisService.popQueue(queueName);
      expect(item2).toEqual(log2);

      const finalLen = await RedisService.getQueueLength(queueName);
      expect(finalLen).toBe(0);
    });
  });

  describe('Pub/Sub Messaging', () => {
    it('should subscribe, publish, and receive messages over channels', async () => {
      const channel = 'test:channel:alerts';
      const payload = JSON.stringify({ event: 'CLUSTER_SCALE_UP', nodes: 5 });
      let receivedMessage: string | null = null;

      await RedisService.subscribe(channel, (msg) => {
        receivedMessage = msg;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await RedisService.publish(channel, payload);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedMessage).toBe(payload);

      await RedisService.unsubscribe(channel);
    });
  });

  describe('Cluster Coordinator (Worker Node Registry)', () => {
    it('should register, heartbeat, query, and deregister worker nodes', async () => {
      const workerId = 'test-worker-cluster-node-99';
      const meta = {
        hostname: 'node-test-01.local',
        cores: 16,
        totalRam: 64,
        os: 'Linux x64'
      };

      await RedisService.registerWorkerInCluster(workerId, meta);

      let workers = await RedisService.getClusterWorkers();
      expect(workers.has(workerId)).toBe(true);
      expect(workers.get(workerId).hostname).toBe(meta.hostname);

      const telemetry = { cpuUsage: 12.5, ramUsage: 45.2, currentJobs: 1 };
      await RedisService.updateWorkerHeartbeatInCluster(workerId, telemetry);

      workers = await RedisService.getClusterWorkers();
      expect(workers.get(workerId).cpuUsage).toBe(telemetry.cpuUsage);
      expect(workers.get(workerId).ramUsage).toBe(telemetry.ramUsage);

      await RedisService.removeWorkerFromCluster(workerId);

      workers = await RedisService.getClusterWorkers();
      expect(workers.has(workerId)).toBe(false);
    });
  });
});
