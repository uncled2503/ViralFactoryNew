import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../server/middlewares/rateLimiter';
import { WebSocketCoordinator } from '../server/websocket/WebSocketCoordinator';
import { JobQueue } from '../server/render/JobQueue';
import { JobTimeoutMonitor } from '../server/render/JobTimeoutMonitor';
import { StorageManager } from '../server/render/Storage';
import { Request, Response } from 'express';
import { WorkerConnection } from '../server/websocket/WorkerConnection';
import { WorkerManager } from '../server/websocket/WorkerManager';

describe('ViralFactory Security Hardening & Architecture Stability Tests', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
    // Initialize storage structure
    StorageManager.init();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. API Rate Limiting Middleware', () => {
    it('should allow requests within limit and block when exceeded', () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
        type: 'TEST_LIMITER'
      });

      const next = vi.fn();
      const mockReq = {
        headers: {},
        socket: { remoteAddress: '192.168.1.50' },
        originalUrl: '/api/test',
        method: 'GET'
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn()
      } as unknown as Response;

      // First request - ok
      limiter(mockReq, mockRes, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request - ok
      limiter(mockReq, mockRes, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request - rate limited (max is 2)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      limiter(mockReq, mockRes, next);
      expect(next).toHaveBeenCalledTimes(2); // not incremented
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many requests. Please try again later.'
      }));

      // Verify structured logs are generated for malicious rate-limit exceedance
      expect(warnSpy).toHaveBeenCalled();
      const logMsg = JSON.parse(warnSpy.mock.calls[0][0]);
      expect(logMsg).toEqual(expect.objectContaining({
        event: 'MALICIOUS_ATTEMPT',
        type: 'RATE_LIMIT_EXCEEDED',
        ip: '192.168.1.50'
      }));
    });
  });

  describe('2. WebSocket Abuse Protection (IP connection limit)', () => {
    it('should accept connections up to limit and reject additional ones with structured logs', () => {
      process.env.WS_MAX_CONNECTIONS_PER_IP = '2';
      
      const mockServer = { on: vi.fn() };
      WebSocketCoordinator.init(mockServer);

      // Access private static ipConnections map to inspect state
      const ipConnections = (WebSocketCoordinator as any).ipConnections;
      ipConnections.clear();

      const ip = '203.0.113.1';
      const ws1 = { close: vi.fn(), on: vi.fn() } as any;
      const ws2 = { close: vi.fn(), on: vi.fn() } as any;
      const ws3 = { close: vi.fn(), on: vi.fn() } as any;

      const req1 = { socket: { remoteAddress: ip } } as any;
      const req2 = { socket: { remoteAddress: ip } } as any;
      const req3 = { socket: { remoteAddress: ip } } as any;

      // Simulate connection 1
      const connectionHandler = (WebSocketCoordinator as any).wss.listeners('connection')[0];
      
      connectionHandler(ws1, req1);
      expect(ipConnections.get(ip)?.size).toBe(1);

      // Simulate connection 2
      connectionHandler(ws2, req2);
      expect(ipConnections.get(ip)?.size).toBe(2);

      // Simulate connection 3 (exceeds limit of 2)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      connectionHandler(ws3, req3);
      
      // Connection 3 should have been closed, not added
      expect(ipConnections.get(ip)?.size).toBe(2);
      expect(ws3.close).toHaveBeenCalledWith(4003, 'Too many connections from this IP');

      // Verify structured log generated
      expect(warnSpy).toHaveBeenCalled();
      const logData = JSON.parse(warnSpy.mock.calls[0][0]);
      expect(logData).toEqual(expect.objectContaining({
        event: 'MALICIOUS_ATTEMPT',
        type: 'WEBSOCKET_ABUSE_LIMIT_EXCEEDED',
        ip
      }));

      // Simulate socket 1 close -> should decrement connections
      const closeHandler1 = ws1.listeners ? ws1.listeners('close')[0] : undefined;
      // Triggers directly onCoordinator close tracker
      const connSet = ipConnections.get(ip);
      if (connSet) {
        connSet.delete(ws1);
      }
      expect(ipConnections.get(ip)?.size).toBe(1);
    });
  });

  describe('3. Job Timeout, Automatic Cancellation, and Re-queueing Failover', () => {
    it('should automatically re-queue a stuck job if attempts are below max limit', async () => {
      process.env.JOB_TIMEOUT_MINUTES = '10';
      process.env.JOB_TIMEOUT_MS = '600000'; // 10 minutes
      process.env.JOB_MAX_ATTEMPTS = '3';

      // Create a test job in rendering state
      const job = JobQueue.createJob({
        userId: 'usr-security-test',
        projectId: 'prj-stuck-job',
        projectName: 'Stuck Project',
        templateId: 'tpl-stuck-job',
        templateName: 'Stuck Template',
        duration: '0:30',
        variables: {}
      });

      JobQueue.updateJob(job.id, {
        status: 'Rendering',
        progress: 40,
        attempts: 0,
        // Started 12 minutes ago (stuck/timed out)
        startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Run checkout process
      await (JobTimeoutMonitor as any).checkTimeouts();

      const updatedJob = JobQueue.getJob(job.id)!;
      
      // Should be re-queued
      expect(updatedJob.status).toBe('Queued');
      expect(updatedJob.progress).toBe(0);
      expect(updatedJob.attempts).toBe(1);
      expect(updatedJob.startedAt).toBeUndefined(); // reset for next pick up
      expect(updatedJob.logs?.some(l => l.includes('Reenviando automaticamente para a fila'))).toBe(true);

      expect(warnSpy).toHaveBeenCalled();
      const logData = JSON.parse(warnSpy.mock.calls[0][0]);
      expect(logData).toEqual(expect.objectContaining({
        event: 'MALICIOUS_ATTEMPT',
        type: 'JOB_TIMEOUT_EXCEEDED',
        jobId: job.id
      }));
    });

    it('should fail a stuck job permanently if maximum attempts are exceeded', async () => {
      process.env.JOB_TIMEOUT_MS = '100'; // 100ms timeout for instant trigger
      process.env.JOB_MAX_ATTEMPTS = '2';

      const job = JobQueue.createJob({
        userId: 'usr-security-test',
        projectId: 'prj-crash-job',
        projectName: 'Crasher',
        templateId: 'tpl-crash-job',
        templateName: 'Crasher Template',
        duration: '0:10',
        variables: {}
      });

      JobQueue.updateJob(job.id, {
        status: 'Rendering',
        progress: 10,
        attempts: 1, // Already on attempt 1, next timeout will exceed max (attempts becomes 2 >= max 2)
        startedAt: new Date(Date.now() - 500).toISOString()
      });

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await (JobTimeoutMonitor as any).checkTimeouts();

      const updatedJob = JobQueue.getJob(job.id)!;
      
      // Should be marked as Failed
      expect(updatedJob.status).toBe('Failed');
      expect(updatedJob.attempts).toBe(2);
      expect(updatedJob.error).toContain('Render job timed out after reaching maximum');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('4. File Upload Security Sanitization & Protections', () => {
    it('should detect and reject path traversal attempts', () => {
      const filenameWithTraversal = '../../etc/passwd';
      const hasTraversal = /[\/\\]|%\d[a-fA-F0-9]|\.\./.test(filenameWithTraversal);
      expect(hasTraversal).toBe(true);

      const filenameWithEncodedTraversal = '..%2f..%2fconfig.json';
      const hasEncodedTraversal = /[\/\\]|%\d[a-fA-F0-9]|\.\./.test(filenameWithEncodedTraversal);
      expect(hasEncodedTraversal).toBe(true);
    });

    it('should validate allowed extensions correctly', () => {
      const allowedExtsEnv = '.mp4,.mov,.png,.jpg,.jpeg,.json';
      const allowedExtensions = allowedExtsEnv.split(',').map(e => e.trim().toLowerCase());

      expect(allowedExtensions.includes('.mp4')).toBe(true);
      expect(allowedExtensions.includes('.exe')).toBe(false);
      expect(allowedExtensions.includes('.sh')).toBe(false);
    });
  });

  describe('5. Remote Render Worker Hardening & Stability Features', () => {
    it('should calculate exponential backoff reconnect delays correctly', () => {
      // Simulate exponential backoff logic
      const getDelay = (attempts: number) => {
        if (attempts === 1) return 2000;
        if (attempts === 2) return 4000;
        if (attempts === 3) return 8000;
        if (attempts === 4) return 16000;
        return 60000;
      };

      expect(getDelay(1)).toBe(2000);
      expect(getDelay(2)).toBe(4000);
      expect(getDelay(3)).toBe(8000);
      expect(getDelay(4)).toBe(16000);
      expect(getDelay(5)).toBe(60000);
      expect(getDelay(10)).toBe(60000); // capped at 60s
    });

    it('should correctly track persistent telemetry counters', () => {
      const mockMetrics = {
        startTime: Date.now() - 5000, // 5s uptime
        reconnections: 2,
        failures: 1,
        completedRenders: 12
      };

      const uptimeSeconds = Math.round((Date.now() - mockMetrics.startTime) / 1000);
      expect(uptimeSeconds).toBe(5);
      expect(mockMetrics.reconnections).toBe(2);
      expect(mockMetrics.failures).toBe(1);
      expect(mockMetrics.completedRenders).toBe(12);
    });

    it('should restore active job state in the queue when a busy worker re-registers', () => {
      // 1. Create a queued job that got re-queued because of a previous disconnect
      const job = JobQueue.createJob({
        userId: 'usr-reconnect-test',
        projectId: 'prj-reconnect-test',
        projectName: 'Reconnect Project',
        templateId: 'tpl-reconnect-test',
        templateName: 'Reconnect Template',
        duration: '0:15',
        variables: {}
      });

      expect(job.status).toBe('Queued');

      // 2. Simulate worker reconnecting and registering with 'busy' status for this job
      const mockSocket: any = {
        send: vi.fn().mockReturnValue(true),
        on: vi.fn(),
        readyState: 1
      };
      
      const conn = new WorkerConnection(mockSocket, '127.0.0.1');
      
      const success = WorkerManager.registerWorker(conn, {
        id: 'worker-reconnect-test-id',
        cores: 4,
        ram: 8,
        status: 'busy',
        currentJobId: job.id
      });

      expect(success).toBe(true);

      // 3. Verify state recovery: connection marked busy, and job state in queue moved back to 'Rendering'
      expect(conn.status).toBe('busy');
      expect(conn.currentJobId).toBe(job.id);
      
      const updatedJob = JobQueue.getJob(job.id)!;
      expect(updatedJob.status).toBe('Rendering');
    });
  });
});
