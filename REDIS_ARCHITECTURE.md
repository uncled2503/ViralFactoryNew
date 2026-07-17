# Redis-Based High Scale Cluster Architecture

This document describes the high-scale distributed architecture migrated to use **Redis** as a centralized state, Pub/Sub, progress queuing, and coordinator-to-worker synchronization layer.

---

## 1. Architectural Overview

To scale the rendering farm from a single-node setup to multiple coordinators and workers, Redis acts as the central source of truth for distributed real-time messaging and operational state.

```
                  ┌──────────────────────┐
                  │  SaaS Coordinator 1  │◄───┐
                  └──────────┬───────────┘    │
                             │                │
                             ▼                │
                    ┌────────────────┐        │ (Pub/Sub & Registry Sync)
                    │  Central Redis │        │
                    └────────▲───────┘        │
                             │                │
                             ▼                │
                  ┌──────────────────────┐    │
                  │  SaaS Coordinator 2  │◄───┘
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐
     │  Worker A  │   │  Worker B  │   │  Worker C  │
     └────────────┘   └────────────┘   └────────────┘
```

The system is fully resilient: if Redis becomes unavailable, the system **automatically and transparently falls back to robust local in-process memory state structures** without throwing errors or crashing.

---

## 2. Key Modules & Redis Scopes

### 2.1 Caching System (Cache)
To optimize database performance, the system caches static and hot datasets:
- **Scope**: Project configurations and template schemas.
- **Key Schema**:
  - `cache:project:{projectId}:{userId}` (TTL: 60 seconds)
  - `cache:template:{templateId}:{userId}` (TTL: 60 seconds)
- **Benefit**: Removes redundant database reads from Supabase/PostgreSQL or disk JSON storage, reducing latency under rendering load.

### 2.2 Centralized Progress Queue (Fila de Progresso)
Worker progress and rendering task states are streamed sequentially through progress queues.
- **Scope**: Buffer and sequence rendering logs to prevent database lockups.
- **Queue Key**: `queue:progress:{jobId}` (FIFO List)
- **Mechanism**:
  - Workers stream progress via WebSockets to their coordinator.
  - The coordinator pushes updates to Redis list structures.
  - Rendering logs are processed asynchronously.

### 2.3 Real-Time Pub/Sub
Coordination events are broadcast instantly to all connected cluster coordinators.
- **Channel**: `cluster:job_progress`
- **Payload**: Includes `jobId`, `status`, `progress`, `logs`, `renderTime`, and error details.
- **Benefit**: If a user is connected to Coordinator A, but their rendering task is running on a worker connected to Coordinator B, Coordinator B publishes the updates to the Pub/Sub channel, and Coordinator A receives and broadcasts it to the user's browser over WebSockets seamlessly.

### 2.4 Cluster Node Registry (Coordenação Cluster)
Tracks connected rendering nodes across all physical servers in the farm.
- **Scope**: Heartbeat registry of active worker cores, RAM, and GPU capabilities.
- **Key Schema**: `cluster:workers` (Hash map with fields as worker IDs and telemetry as JSON values).
- **TTL**: Worker entries expire automatically if they miss heartbeats.
- **Monitoring**: The `/api/health` endpoint and Admin Dashboard retrieve a cluster-wide view by merging local connections with remote cluster connections registered in Redis.

---

## 3. Resilience & Fallback Engine

If Redis goes offline, the `RedisService` automatically switches to `fallback` mode.

### 3.1 Fallback Mappings

| Feature | Redis Command | Local Fallback Implementation |
| :--- | :--- | :--- |
| **Cache Store** | `SETEX`, `GET`, `DEL` | Local `Map<string, { value: any, expiresAt: number }>` with sweep cleanup |
| **Progress Queue** | `RPUSH`, `LPOP`, `LLEN` | Local `Map<string, any[]>` mimicking FIFO queues |
| **Worker Registry** | `HSET`, `HGETALL`, `HDEL` | Local memory-backed `Map<string, any>` mirroring the cluster status |
| **Pub/Sub Broker** | `SUBSCRIBE`, `PUBLISH` | Centralized `EventEmitter` providing local process propagation |

### 3.2 Recovery & Self-Healing
1. **Exponential Backoff Reconnection**: Retries connections automatically with standard retry rules up to 5 attempts, backing off dynamically.
2. **Health Check Detection**: Exposes real-time Redis integration health metrics on `/api/health` and `/api/admin/redis`.
3. **Manual Trigger**: Admin users can manually force connection resets using the `/api/admin/redis/reconnect` endpoint.

---

## 4. Integration Verification & Testing

Verify that all tests build and run cleanly:

```bash
# Run full Vitest test suite
npm test
```

### Verified Performance Outcomes
- **Zero Port Collisions**: Configured on default port 3000 without HMR noise.
- **Full Compatibility**: No existing functionalities were broken; existing in-memory, file-based, or Supabase structures continue to run flawlessly.
- **Reliable Fallbacks**: Proven via test cases where connection interruptions trigger seamless local state mirroring.
