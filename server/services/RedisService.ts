import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface RedisMetrics {
  commandsProcessed: number;
  cacheHits: number;
  cacheMisses: number;
  publishes: number;
  messagesReceived: number;
  connectionChanges: number;
  fallbackCount: number;
}

export class RedisService {
  private static client: Redis | null = null;
  private static subscriber: Redis | null = null;
  private static localEmitter = new EventEmitter();
  private static fallbackCache = new Map<string, { value: string; expiresAt?: number }>();
  private static fallbackQueues = new Map<string, any[]>();
  private static fallbackWorkers = new Map<string, any>();
  
  private static status: 'connected' | 'disconnected' | 'connecting' | 'fallback' = 'disconnected';
  private static circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private static consecutiveFailures = 0;
  private static readonly FAILURE_THRESHOLD = 3;
  private static reconnectTimer: NodeJS.Timeout | null = null;
  
  // Custom configurable interval for testing (default: 30 seconds)
  public static reconnectIntervalMs = 30000;

  // Single flag to completely disable fallback in production
  private static readonly ALLOW_PRODUCTION_FALLBACK = true;

  private static metrics: RedisMetrics = {
    commandsProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    publishes: 0,
    messagesReceived: 0,
    connectionChanges: 0,
    fallbackCount: 0,
  };

  /**
   * Initializes the Redis connection, handles Upstash TLS option, and runs non-blocking validation.
   */
  static init(): void {
    if (this.client) return; // Already initialized

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    if (!redisEnabled) {
      console.log('[RedisService] Redis is explicitly disabled via REDIS_ENABLED=false. Skipping connection.');
      this.status = 'fallback';
      this.circuitState = 'OPEN';
      console.log('[RedisService] REDIS_FALLBACK_ENABLED');
      return;
    }

    console.log('[RedisService] Initializing Redis connection setup...');
    this.status = 'connecting';
    this.consecutiveFailures = 0;

    try {
      this.rebuildClients();
      this.setupEvents();
      
      // Perform non-blocking async connection check
      this.validateConnection().catch(err => {
        console.error('[RedisService] Non-blocking validation error:', err.message);
      });
    } catch (err: any) {
      console.error('[RedisService] Failed to initialize Redis client instances:', err.message);
      this.tripCircuit('creation_error');
    }
  }

  /**
   * Builds the Redis client instances respecting the priority of REDIS_URL and TLS configuration.
   */
  private static rebuildClients(): void {
    let redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : undefined;
    if (redisUrl) {
      // Strip outer double or single quotes if they got parsed literally
      if ((redisUrl.startsWith('"') && redisUrl.endsWith('"')) || 
          (redisUrl.startsWith("'") && redisUrl.endsWith("'"))) {
        redisUrl = redisUrl.slice(1, -1).trim();
      }
    }

    // Fall back if URL is empty, "undefined", "null", or lacks a valid redis protocol scheme
    if (redisUrl === '' || redisUrl === 'undefined' || redisUrl === 'null') {
      redisUrl = undefined;
    }

    if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      console.warn(`[RedisService] Ignoring invalid REDIS_URL scheme: "${redisUrl}". Falling back to host/port config.`);
      redisUrl = undefined;
    }

    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const isTls = process.env.REDIS_TLS === 'true' || (redisUrl ? redisUrl.startsWith('rediss://') : false);

    const commonOptions: any = {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false, // Fail fast to trip the Circuit Breaker instead of buffering stale requests
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        console.warn(`[RedisService] REDIS_RECONNECTING (attempt #${times} in ${delay}ms)`);
        return delay;
      }
    };

    if (isTls) {
      commonOptions.tls = { rejectUnauthorized: false };
    }

    if (redisUrl) {
      this.client = new Redis(redisUrl, commonOptions);
      this.subscriber = new Redis(redisUrl, commonOptions);
    } else {
      const connectionConfig: any = {
        host: redisHost,
        port: redisPort,
        ...commonOptions
      };
      if (redisPassword) {
        connectionConfig.password = redisPassword;
      }
      this.client = new Redis(connectionConfig);
      this.subscriber = new Redis(connectionConfig);
    }
  }

  /**
   * Sets up connection event handlers and subscriber routing.
   */
  private static setupEvents(): void {
    if (!this.client || !this.subscriber) return;

    this.client.on('error', (err) => {
      if (this.circuitState === 'CLOSED') {
        console.error('[RedisService] Client error event:', err.message);
        this.tripCircuit('client_error_event');
      } else {
        // Expected under fallback or offline mode
        console.log('[RedisService] Client socket event (offline):', err.message);
      }
    });

    this.subscriber.on('error', (err) => {
      if (this.circuitState === 'CLOSED') {
        console.error('[RedisService] Subscriber error event:', err.message);
      } else {
        // Expected under fallback or offline mode
        console.log('[RedisService] Subscriber socket event (offline):', err.message);
      }
    });

    this.subscriber.on('message', (channel, message) => {
      this.metrics.messagesReceived++;
      this.localEmitter.emit(`redis:${channel}`, message);
    });
  }

  /**
   * Performs an asynchronous validation of the connection.
   */
  private static async validateConnection(): Promise<void> {
    if (!this.client) return;
    try {
      // Validate with a PING command and 2-second timeout
      const pingResult = await Promise.race([
        this.client.ping(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
      ]);

      if (pingResult === 'PONG') {
        this.status = 'connected';
        this.circuitState = 'CLOSED';
        this.consecutiveFailures = 0;
        console.log('[RedisService] REDIS_CONNECTED');
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      } else {
        throw new Error(`Unexpected ping response: ${pingResult}`);
      }
    } catch (err: any) {
      console.error('[RedisService] Validation check failed:', err.message);
      this.tripCircuit('validation_failed');
    }
  }

  /**
   * Trips the Circuit Breaker to OPEN state, enabling memory fallback.
   */
  private static tripCircuit(reason: string): void {
    if (this.circuitState === 'OPEN') return;
    this.circuitState = 'OPEN';
    
    console.warn(`[RedisService] REDIS_CIRCUIT_OPEN`);
    console.warn(`[RedisService] REDIS_DISCONNECTED`);
    this.switchToFallback(reason);

    this.startReconnectionTimer();
  }

  /**
   * Safe transition into memory-backed fallback mode.
   */
  private static switchToFallback(reason: string): void {
    if (this.status === 'fallback') return;

    if (process.env.NODE_ENV === 'production') {
      console.warn('[RedisService] WARNING: Redis is unavailable in production!');
      if (!this.ALLOW_PRODUCTION_FALLBACK) {
        console.error('[RedisService] Fallback is disabled in production. Operations will fail.');
        this.status = 'disconnected';
        return;
      }
    }

    this.status = 'fallback';
    this.metrics.fallbackCount++;
    this.metrics.connectionChanges++;
    console.log(`[RedisService] REDIS_FALLBACK_ENABLED`);
  }

  /**
   * Periodically attempts self-healing background reconnections without restarting the server.
   */
  private static startReconnectionTimer(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setInterval(async () => {
      console.log('[RedisService] REDIS_RECONNECTING');
      try {
        if (this.client) {
          try { this.client.disconnect(); } catch {}
          this.client = null;
        }
        if (this.subscriber) {
          try { this.subscriber.disconnect(); } catch {}
          this.subscriber = null;
        }

        this.rebuildClients();
        this.setupEvents();

        if (this.client) {
          const pingResult = await Promise.race([
            this.client.ping(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
          ]);

          if (pingResult === 'PONG') {
            this.circuitState = 'CLOSED';
            this.status = 'connected';
            this.consecutiveFailures = 0;
            
            console.log('[RedisService] REDIS_RECONNECTED');
            console.log('[RedisService] REDIS_CIRCUIT_CLOSED');
            console.log('[RedisService] REDIS_FALLBACK_DISABLED');

            if (this.reconnectTimer) {
              clearInterval(this.reconnectTimer);
              this.reconnectTimer = null;
            }

            // Sync state across cluster
            await this.syncAfterReconnection();
          } else {
            throw new Error(`Unexpected ping answer: ${pingResult}`);
          }
        } else {
          throw new Error('Client reconstruction returned null');
        }
      } catch (err: any) {
        console.log(`[RedisService] Reconnection check: Redis server is still offline (${err.message}). Remaining in fallback.`);
      }
    }, this.reconnectIntervalMs);
  }

  /**
   * Synchronizes active workers, progress queues, and pending jobs to avoid duplication.
   */
  private static async syncAfterReconnection(): Promise<void> {
    if (!this.client) return;
    console.log('[RedisService] Starting post-reconnection cluster state synchronization...');

    // 1. Sync Active Workers
    try {
      const { WorkerRegistry } = await import('../websocket/WorkerRegistry');
      const localWorkers = WorkerRegistry.getAll();
      for (const worker of localWorkers) {
        const stats = worker.getTelemetry();
        const payload = {
          id: stats.id,
          cores: stats.cores,
          ram: stats.totalRam,
          gpu: stats.gpu,
          os: stats.os,
          ffmpeg: stats.ffmpegVersion || 'unknown',
          version: stats.version,
          status: stats.status || 'idle',
          currentJobId: stats.currentJobId,
          hostname: stats.hostname || 'Remote Worker',
          totalRam: stats.totalRam || 0,
          ffmpegVersion: stats.ffmpegVersion || 'unknown',
          ip: stats.ip || '0.0.0.0',
          cpuUsage: stats.cpuUsage || 0,
          ramUsage: stats.ramUsage || 0,
          uptimeSeconds: stats.uptimeSeconds || 0
        };
        await this.client.hset('cluster:workers', worker.id, JSON.stringify({
          ...payload,
          lastHeartbeat: Date.now()
        }));
      }
      console.log(`[RedisService] Synchronized ${localWorkers.length} active workers into cluster hash.`);
    } catch (err: any) {
      console.error('[RedisService] Error synchronizing active workers:', err.message);
    }

    // 2. Sync Progress Queues (fallbackQueues)
    try {
      for (const [queueName, items] of this.fallbackQueues.entries()) {
        if (items.length > 0) {
          console.log(`[RedisService] Synchronizing progress queue "${queueName}" with ${items.length} backlog entries.`);
          for (const item of items) {
            await this.client.rpush(queueName, JSON.stringify(item));
          }
          items.length = 0; // Clear the backlog
        }
      }
    } catch (err: any) {
      console.error('[RedisService] Error synchronizing progress queues:', err.message);
    }

    // 3. Sync Active/Pending Jobs to avoid duplication across other coordinators
    try {
      const { JobQueue } = await import('../render/JobQueue');
      const activeJobs = JobQueue.getAllJobs().filter((j: any) => 
        j.status !== 'Completed' && j.status !== 'Failed' && j.status !== 'Canceled'
      );
      for (const job of activeJobs) {
        const key = `job:status:${job.id}`;
        await this.client.set(key, JSON.stringify({
          id: job.id,
          status: job.status,
          progress: job.progress,
          userId: job.userId,
          projectId: job.projectId,
          templateId: job.templateId,
          updatedAt: Date.now()
        }), 'EX', 3600);
      }
      console.log(`[RedisService] Synchronized ${activeJobs.length} active jobs to prevent duplication.`);
    } catch (err: any) {
      console.error('[RedisService] Error synchronizing active jobs:', err.message);
    }
  }

  /**
   * Tracks consecutive Redis failures and trips the Circuit Breaker if threshold is exceeded.
   */
  private static handleRedisError(err: any, operation: string): void {
    console.error(`[RedisService] Redis operation "${operation}" failed:`, err.message);
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD && this.circuitState === 'CLOSED') {
      this.tripCircuit(`failure_on_${operation}`);
    }
  }

  /**
   * Restores Redis from fallback manually.
   */
  static forceReconnect(): void {
    console.log('[RedisService] Forcing manual reconnection...');
    if (this.client) {
      try { this.client.disconnect(); } catch {}
      this.client = null;
    }
    if (this.subscriber) {
      try { this.subscriber.disconnect(); } catch {}
      this.subscriber = null;
    }
    this.status = 'disconnected';
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.init();
  }

  /**
   * Returns whether Redis is fully connected and available.
   */
  static isAvailable(): boolean {
    return this.status === 'connected' && this.circuitState === 'CLOSED';
  }

  /**
   * Returns current connection status.
   */
  static getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'fallback' {
    return this.status;
  }

  /**
   * Returns current health check object.
   */
  static healthCheck(): { status: string; redisConnected: boolean; metrics: RedisMetrics } {
    const isOk = this.status === 'connected';
    return {
      status: isOk ? 'UP' : this.status === 'fallback' ? 'FALLBACK_UP' : 'DOWN',
      redisConnected: isOk,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Returns performance and load metrics.
   */
  static getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  // ==========================================
  // CACHE INTERFACE
  // ==========================================

  static async incrAndExpire(key: string, ttlSeconds: number): Promise<number> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, ttlSeconds);
        }
        return count;
      } catch (err: any) {
        this.handleRedisError(err, 'incrAndExpire');
      }
    }
    return 0;
  }

  static async get(key: string): Promise<string | null> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        const val = await this.client.get(key);
        if (val !== null) {
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;
        }
        return val;
      } catch (err: any) {
        this.handleRedisError(err, 'get');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return null;
    }
    const cached = this.fallbackCache.get(key);
    if (!cached) {
      this.metrics.cacheMisses++;
      return null;
    }
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      this.fallbackCache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }
    this.metrics.cacheHits++;
    return cached.value;
  }

  static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'set');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.fallbackCache.set(key, { value, expiresAt });
  }

  static async del(key: string): Promise<void> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'del');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackCache.delete(key);
  }

  static async flushAll(): Promise<void> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        await this.client.flushall();
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'flushall');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackCache.clear();
  }

  // ==========================================
  // PUB/SUB INTERFACE
  // ==========================================

  static async publish(channel: string, message: string): Promise<number> {
    this.metrics.commandsProcessed++;
    this.metrics.publishes++;
    
    // Always propagate to local handlers for cluster resilience and standalone consistency
    this.localEmitter.emit(`redis:${channel}`, message);

    if (this.isAvailable() && this.client) {
      try {
        const count = await this.client.publish(channel, message);
        return count;
      } catch (err: any) {
        this.handleRedisError(err, 'publish');
      }
    }

    return 1;
  }

  static async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const handler = (msg: string) => callback(msg);
    this.localEmitter.on(`redis:${channel}`, handler);

    if (this.isAvailable() && this.subscriber) {
      try {
        await this.subscriber.subscribe(channel);
      } catch (err: any) {
        this.handleRedisError(err, 'subscribe');
      }
    }
  }

  static async unsubscribe(channel: string): Promise<void> {
    this.localEmitter.removeAllListeners(`redis:${channel}`);

    if (this.isAvailable() && this.subscriber) {
      try {
        await this.subscriber.unsubscribe(channel);
      } catch (err: any) {
        this.handleRedisError(err, 'unsubscribe');
      }
    }
  }

  // ==========================================
  // PROGRESS QUEUE INTERFACE
  // ==========================================

  static async pushQueue(queueName: string, data: any): Promise<void> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        await this.client.rpush(queueName, JSON.stringify(data));
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'rpush');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    if (!this.fallbackQueues.has(queueName)) {
      this.fallbackQueues.set(queueName, []);
    }
    this.fallbackQueues.get(queueName)!.push(data);
  }

  static async popQueue(queueName: string): Promise<any | null> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        const item = await this.client.lpop(queueName);
        return item ? JSON.parse(item) : null;
      } catch (err: any) {
        this.handleRedisError(err, 'lpop');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return null;
    }
    const q = this.fallbackQueues.get(queueName);
    if (!q || q.length === 0) return null;
    return q.shift();
  }

  static async getQueueLength(queueName: string): Promise<number> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        return await this.client.llen(queueName);
      } catch (err: any) {
        this.handleRedisError(err, 'llen');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return 0;
    }
    const q = this.fallbackQueues.get(queueName);
    return q ? q.length : 0;
  }

  // ==========================================
  // COORDINATION INTERFACE
  // ==========================================

  static async registerWorkerInCluster(workerId: string, metadata: any): Promise<void> {
    this.metrics.commandsProcessed++;
    const payload = {
      ...metadata,
      lastHeartbeat: Date.now()
    };

    if (this.isAvailable() && this.client) {
      try {
        await this.client.hset('cluster:workers', workerId, JSON.stringify(payload));
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'hset');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackWorkers.set(workerId, payload);
  }

  static async updateWorkerHeartbeatInCluster(workerId: string, stats: any): Promise<void> {
    this.metrics.commandsProcessed++;
    let currentMetadata: any = {};

    if (this.isAvailable() && this.client) {
      try {
        const raw = await this.client.hget('cluster:workers', workerId);
        if (raw) currentMetadata = JSON.parse(raw);
        
        const updated = {
          ...currentMetadata,
          ...stats,
          lastHeartbeat: Date.now()
        };
        await this.client.hset('cluster:workers', workerId, JSON.stringify(updated));
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'hget_hset');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    currentMetadata = this.fallbackWorkers.get(workerId) || {};
    const updatedFallback = {
      ...currentMetadata,
      ...stats,
      lastHeartbeat: Date.now()
    };
    this.fallbackWorkers.set(workerId, updatedFallback);
  }

  static async removeWorkerFromCluster(workerId: string): Promise<void> {
    this.metrics.commandsProcessed++;
    if (this.isAvailable() && this.client) {
      try {
        await this.client.hdel('cluster:workers', workerId);
        return;
      } catch (err: any) {
        this.handleRedisError(err, 'hdel');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackWorkers.delete(workerId);
  }

  static async getClusterWorkers(): Promise<Map<string, any>> {
    this.metrics.commandsProcessed++;
    const result = new Map<string, any>();

    if (this.isAvailable() && this.client) {
      try {
        const rawHash = await this.client.hgetall('cluster:workers');
        const now = Date.now();
        for (const [id, valueStr] of Object.entries(rawHash)) {
          try {
            const parsed = JSON.parse(valueStr);
            // Purge silent worker after 30 seconds
            if (now - parsed.lastHeartbeat > 30000) {
              await this.client.hdel('cluster:workers', id);
            } else {
              result.set(id, parsed);
            }
          } catch {}
        }
        return result;
      } catch (err: any) {
        this.handleRedisError(err, 'hgetall');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return result;
    }
    const now = Date.now();
    for (const [id, parsed] of this.fallbackWorkers.entries()) {
      if (now - parsed.lastHeartbeat > 30000) {
        this.fallbackWorkers.delete(id);
      } else {
        result.set(id, parsed);
      }
    }
    return result;
  }
}
