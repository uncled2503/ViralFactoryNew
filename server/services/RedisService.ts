import Redis, { RedisOptions } from 'ioredis';
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

  // Active channel subscription tracking for resubscription on reconnect
  private static subscribedChannels = new Set<string>();
  private static channelHandlers = new Map<string, Set<(message: string) => void>>();

  // Fallback storage
  private static fallbackCache = new Map<string, { value: string; expiresAt?: number }>();
  private static fallbackQueues = new Map<string, unknown[]>();
  private static fallbackWorkers = new Map<string, any>();

  // Service state
  private static status: 'connected' | 'disconnected' | 'connecting' | 'fallback' = 'disconnected';
  private static circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private static consecutiveFailures = 0;
  private static readonly FAILURE_THRESHOLD = 3;

  private static lastCircuitOpenTime = 0;
  private static readonly CIRCUIT_COOLDOWN_MS = 15000; // 15s cooldown before probing HALF_OPEN

  private static healthCheckTimer: NodeJS.Timeout | null = null;
  private static shutdownHooksRegistered = false;

  private static lastLatencyMs = -1;
  private static lastConnectionChangeTime = Date.now();

  // Configurable reconnect interval for testing / fallback (default: 30s)
  public static reconnectIntervalMs = 30000;

  // Flag for production fallback behavior
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
   * Initializes the Redis service, builds clients, registers event listeners and health checks.
   */
  public static init(): void {
    if (this.client) {
      console.log('[Redis] RedisService is already initialized.');
      return;
    }

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';
    if (!redisEnabled) {
      console.log('[Redis] Redis is explicitly disabled via REDIS_ENABLED=false.');
      this.status = 'fallback';
      this.circuitState = 'OPEN';
      console.log('[Redis] Falling back to Memory');
      return;
    }

    console.log('[Redis] Initializing Redis connection...');
    this.status = 'connecting';
    this.consecutiveFailures = 0;

    this.setupShutdownHooks();

    try {
      this.buildClients();
      this.startHealthCheckLoop();

      // Non-blocking wait for ready state
      this.waitForReady(this.client, 5000).then((isReady) => {
        if (isReady) {
          console.log('[Redis] Initial connection ready.');
        } else {
          console.warn('[Redis] Initial connection attempt timed out. Remaining in fallback mode.');
          this.tripCircuit('initial_connection_timeout');
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Redis] Failed to initialize clients: ${msg}`);
      this.tripCircuit('init_exception');
    }
  }

  /**
   * Builds connection configuration options for ioredis with full Upstash & TLS support.
   */
  private static parseConnectionOptions(): { url?: string; options: RedisOptions } {
    let redisUrl = process.env.REDIS_URL ? process.env.REDIS_URL.trim() : undefined;

    if (redisUrl) {
      // Strip quotes if present
      if (
        (redisUrl.startsWith('"') && redisUrl.endsWith('"')) ||
        (redisUrl.startsWith("'") && redisUrl.endsWith("'"))
      ) {
        redisUrl = redisUrl.slice(1, -1).trim();
      }
      if (redisUrl === '' || redisUrl === 'undefined' || redisUrl === 'null') {
        redisUrl = undefined;
      }
    }

    if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      console.warn(`[Redis] Ignoring invalid REDIS_URL scheme: "${redisUrl}". Falling back to host/port.`);
      redisUrl = undefined;
    }

    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const isTls = process.env.REDIS_TLS === 'true' || (redisUrl ? redisUrl.startsWith('rediss://') : false);

    const commonOptions: RedisOptions = {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false, // Fail fast so commands are not executed when disconnected
      lazyConnect: false,
      keepAlive: 5000, // Send TCP keepalive packets every 5s to maintain active serverless/Upstash connections
      retryStrategy: (times: number) => {
        if (process.env.REDIS_ENABLED === 'false') return null;
        const delay = Math.min(times * 200, 3000);
        console.warn(`[Redis] Reconnecting... (attempt #${times} in ${delay}ms)`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
        if (targetErrors.some((e) => err.message.includes(e))) {
          console.warn(`[Redis] Forcing reconnect due to error: ${err.message}`);
          return true;
        }
        return false;
      },
    };

    if (isTls) {
      let servername = redisHost;
      if (redisUrl) {
        try {
          const parsed = new URL(redisUrl);
          servername = parsed.hostname;
        } catch {
          // fallback to redisHost
        }
      }
      commonOptions.tls = {
        rejectUnauthorized: false,
        servername,
      };
    }

    if (redisUrl) {
      return { url: redisUrl, options: commonOptions };
    }

    const configOptions: RedisOptions = {
      ...commonOptions,
      host: redisHost,
      port: redisPort,
    };
    if (redisPassword) {
      configOptions.password = redisPassword;
    }

    return { options: configOptions };
  }

  /**
   * Instantiates Redis client and subscriber instances.
   */
  private static buildClients(): void {
    const { url, options } = this.parseConnectionOptions();

    if (url) {
      this.client = new Redis(url, options);
      this.subscriber = new Redis(url, options);
    } else {
      this.client = new Redis(options);
      this.subscriber = new Redis(options);
    }

    this.attachEvents(this.client, 'main');
    this.attachEvents(this.subscriber, 'subscriber');
  }

  /**
   * Attaches ioredis event listeners for clean state management and detailed logging.
   */
  private static attachEvents(redisInstance: Redis, role: 'main' | 'subscriber'): void {
    redisInstance.on('connect', () => {
      console.log(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} Connecting...`);
    });

    redisInstance.on('ready', () => {
      console.log(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} Ready`);

      if (role === 'main') {
        this.status = 'connected';
        this.metrics.connectionChanges++;
        this.consecutiveFailures = 0;
        this.lastConnectionChangeTime = Date.now();

        if (this.circuitState !== 'CLOSED') {
          this.circuitState = 'CLOSED';
          console.log('[Redis] Circuit CLOSED');
          console.log('[Redis] Redis recovered');
        }

        this.syncAfterReconnection().catch((err) => {
          console.error(`[Redis] Error during post-reconnect synchronization: ${err.message}`);
        });
      } else if (role === 'subscriber') {
        this.resubscribeChannels().catch((err) => {
          console.error(`[Redis] Error resubscribing channels: ${err.message}`);
        });
      }
    });

    redisInstance.on('error', (err: Error) => {
      const isTransientReset =
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('EPIPE') ||
        err.message.includes('ECONNREFUSED');

      if (isTransientReset) {
        console.warn(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} socket reset (${err.message}). Auto-reconnecting...`);
      } else {
        console.error(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} error: ${err.message}`);
      }
    });

    redisInstance.on('close', () => {
      console.log(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} connection closed`);
    });

    redisInstance.on('reconnecting', () => {
      console.log(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} Reconnecting...`);
    });

    redisInstance.on('end', () => {
      console.log(`[Redis] ${role === 'main' ? 'Main' : 'Subscriber'} connection ended`);
      if (role === 'main' && this.status === 'connected') {
        this.status = 'disconnected';
        this.metrics.connectionChanges++;
        this.lastConnectionChangeTime = Date.now();
      }
    });

    if (role === 'subscriber') {
      redisInstance.on('message', (channel: string, message: string) => {
        this.metrics.messagesReceived++;
        this.localEmitter.emit(`redis:${channel}`, message);
      });
    }
  }

  /**
   * Helper that waits for a client to reach 'ready' status without throwing.
   */
  public static async waitForReady(client: Redis | null, timeoutMs = 5000): Promise<boolean> {
    if (!client) return false;
    if (client.status === 'ready') return true;

    return new Promise<boolean>((resolve) => {
      let timer: NodeJS.Timeout | null = null;

      const onReady = () => {
        cleanup();
        resolve(true);
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        client.removeListener('ready', onReady);
        client.removeListener('error', onError);
        client.removeListener('end', onError);
      };

      timer = setTimeout(() => {
        cleanup();
        resolve(client.status === 'ready');
      }, timeoutMs);

      client.once('ready', onReady);
      client.once('error', onError);
      client.once('end', onError);
    });
  }

  /**
   * Returns true only when client instance exists, status is 'ready', and circuit breaker is NOT OPEN.
   */
  private static isClientReady(client: Redis | null): boolean {
    return client !== null && client.status === 'ready' && this.circuitState !== 'OPEN';
  }

  /**
   * Public health indicator.
   */
  public static isAvailable(): boolean {
    return this.isClientReady(this.client) && this.status === 'connected' && this.circuitState === 'CLOSED';
  }

  /**
   * Public connection status.
   */
  public static getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'fallback' {
    return this.status;
  }

  /**
   * Handles consecutive failure count and trips the Circuit Breaker to OPEN state.
   */
  private static handleRedisError(err: Error, operation: string): void {
    console.error(`[Redis] Redis operation "${operation}" failed: ${err.message}`);
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD && this.circuitState === 'CLOSED') {
      this.tripCircuit(`failure_on_${operation}`);
    }
  }

  /**
   * Trips the Circuit Breaker to OPEN state and engages fallback.
   */
  private static tripCircuit(reason: string): void {
    if (this.circuitState === 'OPEN') return;

    this.circuitState = 'OPEN';
    this.lastCircuitOpenTime = Date.now();
    console.warn(`[Redis] Circuit OPEN (Reason: ${reason})`);
    console.warn('[Redis] REDIS_DISCONNECTED');

    this.switchToFallback();
  }

  /**
   * Safely switches application mode to memory fallback.
   */
  private static switchToFallback(): void {
    if (this.status === 'fallback') return;

    if (process.env.NODE_ENV === 'production') {
      console.warn('[Redis] WARNING: Redis is unavailable in production!');
      if (!this.ALLOW_PRODUCTION_FALLBACK) {
        console.error('[Redis] Fallback is disabled in production.');
        this.status = 'disconnected';
        return;
      }
    }

    this.status = 'fallback';
    this.metrics.fallbackCount++;
    this.metrics.connectionChanges++;
    this.lastConnectionChangeTime = Date.now();
    console.log('[Redis] Falling back to Memory');
  }

  /**
   * Starts non-blocking periodic health checks.
   */
  private static startHealthCheckLoop(): void {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.runHealthCheck();
    }, 15000); // Check every 15s
  }

  /**
   * Runs an active health check ping and manages Circuit Breaker states (CLOSED, OPEN, HALF_OPEN).
   */
  public static async runHealthCheck(): Promise<{
    status: string;
    redisConnected: boolean;
    circuitState: string;
    latencyMs: number;
    metrics: RedisMetrics;
  }> {
    const now = Date.now();

    if (this.circuitState === 'OPEN') {
      // Check if cooldown has passed to attempt HALF_OPEN state
      if (now - this.lastCircuitOpenTime >= this.CIRCUIT_COOLDOWN_MS) {
        console.log('[Redis] Circuit HALF_OPEN (probing connection...)');
        this.circuitState = 'HALF_OPEN';

        if (this.client && (this.client.status === 'close' || this.client.status === 'end')) {
          this.client.connect().catch(() => {});
        }
      }
    }

    if (this.client) {
      if (this.circuitState === 'HALF_OPEN' && this.client.status !== 'ready') {
        // Wait up to 2000ms for client to reach ready state before probing ping
        await this.waitForReady(this.client, 2000);
      }

      if (this.client.status === 'ready') {
        try {
          const start = Date.now();
          const pingRes = await Promise.race([
            this.client.ping(),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 3000)),
          ]);

          if (pingRes === 'PONG') {
            this.lastLatencyMs = Date.now() - start;
            console.log(`[Redis] Ping ${this.lastLatencyMs}ms`);

            if (this.circuitState === 'OPEN' || this.circuitState === 'HALF_OPEN') {
              this.circuitState = 'CLOSED';
              this.status = 'connected';
              this.consecutiveFailures = 0;
              console.log('[Redis] Circuit CLOSED');
              console.log('[Redis] Redis recovered');
            }

            return {
              status: 'UP',
              redisConnected: true,
              circuitState: this.circuitState,
              latencyMs: this.lastLatencyMs,
              metrics: { ...this.metrics },
            };
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Redis] Health check ping failed: ${msg}`);
          this.handleRedisError(new Error(msg), 'health_check');
        }
      }
    }

    return {
      status: this.status === 'connected' ? 'UP' : this.status === 'fallback' ? 'FALLBACK_UP' : 'DOWN',
      redisConnected: this.isClientReady(this.client),
      circuitState: this.circuitState,
      latencyMs: -1,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Exposes structured health check metrics for admin routes.
   */
  public static healthCheck(): {
    status: string;
    redisConnected: boolean;
    circuitState: string;
    metrics: RedisMetrics;
  } {
    const isOk = this.isAvailable();
    return {
      status: isOk ? 'UP' : this.status === 'fallback' ? 'FALLBACK_UP' : 'DOWN',
      redisConnected: isOk,
      circuitState: this.circuitState,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Returns current performance and volume metrics.
   */
  public static getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  /**
   * Force manual reconnection, tearing down sockets cleanly and re-initializing.
   */
  public static forceReconnect(): void {
    console.log('[Redis] Forcing manual reconnection...');
    this.disposeClients();
    this.status = 'disconnected';
    this.circuitState = 'CLOSED';
    this.consecutiveFailures = 0;
    this.init();
  }

  /**
   * Resubscribes all tracked channels when the subscriber connection is ready.
   */
  private static async resubscribeChannels(): Promise<void> {
    if (!this.isClientReady(this.subscriber) || this.subscribedChannels.size === 0) return;

    const channels = Array.from(this.subscribedChannels);
    try {
      await this.subscriber!.subscribe(...channels);
      console.log(`[Redis] Re-subscribed to ${channels.length} channels: ${channels.join(', ')}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Redis] Failed to re-subscribe to channels: ${msg}`);
    }
  }

  /**
   * Synchronizes cluster state (workers, pending queues, jobs) post reconnection.
   */
  private static async syncAfterReconnection(): Promise<void> {
    if (!this.isClientReady(this.client)) return;
    console.log('[Redis] Starting post-reconnection cluster state synchronization...');

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
          uptimeSeconds: stats.uptimeSeconds || 0,
          lastHeartbeat: Date.now(),
        };
        await this.client!.hset('cluster:workers', worker.id, JSON.stringify(payload));
      }
      if (localWorkers.length > 0) {
        console.log(`[Redis] Synchronized ${localWorkers.length} active workers into cluster hash.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Redis] Error synchronizing active workers: ${msg}`);
    }

    // 2. Sync Progress Queues (fallbackQueues)
    try {
      for (const [queueName, items] of this.fallbackQueues.entries()) {
        if (items.length > 0) {
          console.log(`[Redis] Synchronizing progress queue "${queueName}" with ${items.length} entries.`);
          for (const item of items) {
            await this.client!.rpush(queueName, JSON.stringify(item));
          }
          items.length = 0;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Redis] Error synchronizing progress queues: ${msg}`);
    }

    // 3. Sync Active Jobs
    try {
      const { JobQueue } = await import('../render/JobQueue');
      const activeJobs = JobQueue.getAllJobs().filter(
        (j: { status: string }) => j.status !== 'Completed' && j.status !== 'Failed' && j.status !== 'Canceled'
      );
      for (const job of activeJobs) {
        const key = `job:status:${job.id}`;
        await this.client!.set(
          key,
          JSON.stringify({
            id: job.id,
            status: job.status,
            progress: job.progress,
            userId: job.userId,
            projectId: job.projectId,
            templateId: job.templateId,
            updatedAt: Date.now(),
          }),
          'EX',
          3600
        );
      }
      if (activeJobs.length > 0) {
        console.log(`[Redis] Synchronized ${activeJobs.length} active jobs to prevent duplication.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Redis] Error synchronizing active jobs: ${msg}`);
    }
  }

  // ==========================================
  // CACHE INTERFACE
  // ==========================================

  public static async incrAndExpire(key: string, ttlSeconds: number): Promise<number> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        const count = await this.client!.incr(key);
        if (count === 1) {
          await this.client!.expire(key, ttlSeconds);
        }
        return count;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'incrAndExpire');
      }
    }

    // Memory Fallback for Rate Limiter
    const cached = this.fallbackCache.get(key);
    const now = Date.now();
    let currentVal = 0;

    if (cached && (!cached.expiresAt || now <= cached.expiresAt)) {
      currentVal = parseInt(cached.value, 10) || 0;
    }

    currentVal++;
    const expiresAt = now + ttlSeconds * 1000;
    this.fallbackCache.set(key, { value: String(currentVal), expiresAt });
    return currentVal;
  }

  public static async get(key: string): Promise<string | null> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        const val = await this.client!.get(key);
        if (val !== null) {
          this.metrics.cacheHits++;
        } else {
          this.metrics.cacheMisses++;
        }
        return val;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'get');
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

  public static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        if (ttlSeconds) {
          await this.client!.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client!.set(key, value);
        }
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'set');
      }
    }

    // Fallback Mode
    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.fallbackCache.set(key, { value, expiresAt });
  }

  public static async del(key: string): Promise<void> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        await this.client!.del(key);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'del');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackCache.delete(key);
  }

  public static async flushAll(): Promise<void> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        await this.client!.flushall();
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'flushall');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }
    this.fallbackCache.clear();
  }

  // ==========================================
  // PUB/SUB INTERFACE
  // ==========================================

  public static async publish(channel: string, message: string): Promise<number> {
    this.metrics.commandsProcessed++;
    this.metrics.publishes++;

    // Local in-process broadcast for local subscribers
    this.localEmitter.emit(`redis:${channel}`, message);

    if (this.isClientReady(this.client)) {
      try {
        return await this.client!.publish(channel, message);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'publish');
      }
    }

    return 1;
  }

  public static async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
    }

    const handlerSet = this.channelHandlers.get(channel)!;
    handlerSet.add(callback);

    const eventName = `redis:${channel}`;
    this.localEmitter.on(eventName, callback);

    this.subscribedChannels.add(channel);

    if (this.isClientReady(this.subscriber)) {
      try {
        await this.subscriber!.subscribe(channel);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'subscribe');
      }
    }
  }

  public static async unsubscribe(channel: string, callback?: (message: string) => void): Promise<void> {
    const eventName = `redis:${channel}`;

    if (callback) {
      this.localEmitter.removeListener(eventName, callback);
      const handlerSet = this.channelHandlers.get(channel);
      if (handlerSet) {
        handlerSet.delete(callback);
        if (handlerSet.size === 0) {
          this.channelHandlers.delete(channel);
          this.subscribedChannels.delete(channel);
        }
      }
    } else {
      this.localEmitter.removeAllListeners(eventName);
      this.channelHandlers.delete(channel);
      this.subscribedChannels.delete(channel);
    }

    if (!this.subscribedChannels.has(channel) && this.isClientReady(this.subscriber)) {
      try {
        await this.subscriber!.unsubscribe(channel);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'unsubscribe');
      }
    }
  }

  // ==========================================
  // QUEUE INTERFACE
  // ==========================================

  public static async pushQueue(queueName: string, data: unknown): Promise<void> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        await this.client!.rpush(queueName, JSON.stringify(data));
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'rpush');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }

    if (!this.fallbackQueues.has(queueName)) {
      this.fallbackQueues.set(queueName, []);
    }
    this.fallbackQueues.get(queueName)!.push(data);
  }

  public static async popQueue(queueName: string): Promise<unknown | null> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        const item = await this.client!.lpop(queueName);
        return item ? JSON.parse(item) : null;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'lpop');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return null;
    }

    const q = this.fallbackQueues.get(queueName);
    if (!q || q.length === 0) return null;
    return q.shift();
  }

  public static async getQueueLength(queueName: string): Promise<number> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        return await this.client!.llen(queueName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'llen');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return 0;
    }

    const q = this.fallbackQueues.get(queueName);
    return q ? q.length : 0;
  }

  // ==========================================
  // CLUSTER COORDINATION INTERFACE
  // ==========================================

  public static async registerWorkerInCluster(workerId: string, metadata: any): Promise<void> {
    this.metrics.commandsProcessed++;
    const payload = {
      ...metadata,
      lastHeartbeat: Date.now(),
    };

    if (this.isClientReady(this.client)) {
      try {
        await this.client!.hset('cluster:workers', workerId, JSON.stringify(payload));
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'hset');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }

    this.fallbackWorkers.set(workerId, payload);
  }

  public static async updateWorkerHeartbeatInCluster(
    workerId: string,
    stats: any
  ): Promise<void> {
    this.metrics.commandsProcessed++;
    let currentMetadata: any = {};

    if (this.isClientReady(this.client)) {
      try {
        const raw = await this.client!.hget('cluster:workers', workerId);
        if (raw) currentMetadata = JSON.parse(raw);

        const updated = {
          ...currentMetadata,
          ...stats,
          lastHeartbeat: Date.now(),
        };
        await this.client!.hset('cluster:workers', workerId, JSON.stringify(updated));
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'hget_hset');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }

    currentMetadata = this.fallbackWorkers.get(workerId) || {};
    const updatedFallback = {
      ...currentMetadata,
      ...stats,
      lastHeartbeat: Date.now(),
    };
    this.fallbackWorkers.set(workerId, updatedFallback);
  }

  public static async removeWorkerFromCluster(workerId: string): Promise<void> {
    this.metrics.commandsProcessed++;

    if (this.isClientReady(this.client)) {
      try {
        await this.client!.hdel('cluster:workers', workerId);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'hdel');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return;
    }

    this.fallbackWorkers.delete(workerId);
  }

  public static async getClusterWorkers(): Promise<Map<string, any>> {
    this.metrics.commandsProcessed++;
    const result = new Map<string, any>();

    if (this.isClientReady(this.client)) {
      try {
        const rawHash = await this.client!.hgetall('cluster:workers');
        const now = Date.now();

        for (const [id, valueStr] of Object.entries(rawHash)) {
          try {
            const parsed = JSON.parse(valueStr);
            const lastHeartbeat = typeof parsed.lastHeartbeat === 'number' ? parsed.lastHeartbeat : 0;

            if (now - lastHeartbeat > 30000) {
              await this.client!.hdel('cluster:workers', id);
            } else {
              result.set(id, parsed);
            }
          } catch {
            // ignore invalid JSON
          }
        }
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.handleRedisError(new Error(msg), 'hgetall');
      }
    }

    if (process.env.NODE_ENV === 'production' && !this.ALLOW_PRODUCTION_FALLBACK) {
      return result;
    }

    const now = Date.now();
    for (const [id, parsed] of this.fallbackWorkers.entries()) {
      const lastHeartbeat = typeof parsed.lastHeartbeat === 'number' ? parsed.lastHeartbeat : 0;
      if (now - lastHeartbeat > 30000) {
        this.fallbackWorkers.delete(id);
      } else {
        result.set(id, parsed);
      }
    }

    return result;
  }

  // ==========================================
  // SHUTDOWN & DISPOSAL
  // ==========================================

  private static disposeClients(): void {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch {
        // ignore
      }
      this.client = null;
    }

    if (this.subscriber) {
      try {
        this.subscriber.disconnect();
      } catch {
        // ignore
      }
      this.subscriber = null;
    }
  }

  public static async dispose(): Promise<void> {
    console.log('[Redis] Shutting down RedisService...');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.localEmitter.removeAllListeners();
    this.subscribedChannels.clear();
    this.channelHandlers.clear();

    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        this.subscriber.disconnect();
      }
      this.subscriber = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
    }

    this.status = 'disconnected';
    this.circuitState = 'CLOSED';
    console.log('[Redis] Shutdown complete.');
  }

  private static setupShutdownHooks(): void {
    if (this.shutdownHooksRegistered) return;
    this.shutdownHooksRegistered = true;

    const onShutdown = async (signal: string) => {
      console.log(`[Redis] Received ${signal}, disposing RedisService...`);
      await this.dispose();
    };

    process.once('SIGINT', () => onShutdown('SIGINT'));
    process.once('SIGTERM', () => onShutdown('SIGTERM'));
  }
}
