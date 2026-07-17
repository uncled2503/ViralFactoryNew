# 🚀 ViralFactory Enterprise Infrastructure & Orchestration

Welcome to the enterprise orchestration guide for **ViralFactory**. This folder contains the complete configuration blueprints, orchestration manifests, and deployment runbooks required to package, run, scale, and manage the ViralFactory cluster in local development, staging environments, and high-availability (HA) cloud Kubernetes clusters.

---

## 📐 1. Architecture Topology

ViralFactory is designed as a modular, distributed, horizontally scalable system. Below is the production container and network routing architecture:

```
                          [ External Clients ]
                                   │
                                   ▼
                      [ Nginx Ingress Controller ]
                                   │
                    ┌──────────────┴──────────────┐ (HTTP/HTTPS & WebSockets)
                    ▼                             ▼
        [ coordinator-service:3000 ]    [ coordinator-service:3000 ]
               (Replica A)                     (Replica B)
                    │                             │
         ┌──────────┴──────────────┬──────────────┴──────────┐
         ▼                         ▼                         ▼
   [ Redis Server ]       [ Shared Storage Volume ]   [ Supabase SaaS Cloud ]
    (State & PubSub)            (PV / PVC)              (Persistent Database)
         ▲                         ▲
         │                         │ (Mounts public/storage)
         └──────────┬──────────────┘
                    ▼
         ┌─────────────────────────┐
         │  Distributed Renderers  │
         ├─────────────────────────┤ (Dynamic Scaling via Worker HPA)
         │  [ render-worker-pod1 ] │ <── Spawns local FFmpeg passes
         │  [ render-worker-pod2 ] │
         │  [ render-worker-pod3 ] │
         └─────────────────────────┘
```

### Infrastructure Core Components:
1. **Nginx Ingress Controller**: External gateway handling load-balancing, SSL termination, and secure WebSocket proxying.
2. **SaaS Coordinator Pods (NodeJS/Express)**: Serve the pre-built React frontend static assets, expose S3-like static files, and coordinate cluster-wide rendering tasks over real-time WebSockets.
3. **Redis Caching Tier**: Handles active cluster heartbeats, task queues, and dynamic metrics history cache.
4. **Distributed Render Worker Pods (FFmpeg/NodeJS)**: Pure video-rendering daemons. They pull raw video layers and template metadata from the Coordinator, execute high-speed multi-pass FFmpeg encodes, and upload completed results.
5. **Persistent Volumes (PV/PVC)**: Maintain local storage states, export presets, and file-based job caches across rolling deployment restarts.

---

## 🐳 2. Local Containerization (Docker Compose)

For rapid local staging, testing, and sandbox environments, use the pre-packaged `docker-compose.yml` located in the project root.

### Prerequisites:
- Docker Desktop or Docker Engine installed.
- Docker Compose v2.0+ installed.

### Quick Start:
1. Populate your API credentials inside a local `.env` file at the root:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   GEMINI_API_KEY=AIzaSyDp_example_key...
   ```
2. Build and run the entire cluster in the background:
   ```bash
   docker compose up --build -d
   ```
3. Monitor real-time logs:
   ```bash
   docker compose logs -f
   ```
4. Confirm everything is running:
   - Access the SaaS portal: `http://localhost:3000`
   - Access the health-check REST API: `http://localhost:3000/api/health`
   - Worker telemetry can be inspected on the admin dashboard!

---

## ☸️ 3. Production Kubernetes Orchestration (K8s)

The production manifests are situated in `/infrastructure/k8s/` and split logically into modular resources.

### Manifest Manifest File Map:
- `namespace.yaml`: Enterprise logical isolation container (`viralfactory`).
- `configmap.yaml`: Non-sensitive global environment configurations.
- `secrets.yaml`: Encrypted API keys, token placeholders, and credentials.
- `pv-pvc.yaml`: Persistent volume configurations for media storage preservation.
- `redis-deployment.yaml`: Cache tier deployment and cluster-IP service routing.
- `coordinator-deployment.yaml`: SaaS web-app and WebSocket coordinator.
- `worker-deployment.yaml`: Video rendering node daemon deployment.
- `hpa.yaml`: Horizontal Pod Autoscaler policies for auto-scaling under load.
- `ingress.yaml`: External routing controller with custom annotations.

---

## 🚀 4. Step-by-Step Deployment Runbook

Follow these commands in sequence to provision the ViralFactory cluster on Google Kubernetes Engine (GKE), Amazon EKS, Azure AKS, or standard self-hosted bare-metal clusters:

### Step 4.1: Establish Namespace Boundaries
```bash
kubectl apply -f infrastructure/k8s/namespace.yaml
```

### Step 4.2: Build & Push Production Images
Build the localized Dockerfiles and push them to your secure private container registry (e.g., GCR, DockerHub, ECR):
```bash
# Build and Push SaaS Web Coordinator
docker build -t gcr.io/your-project/coordinator:v1 -f Dockerfile .
docker push gcr.io/your-project/coordinator:v1

# Build and Push FFmpeg Rendering Worker
docker build -t gcr.io/your-project/render-worker:v1 -f render-worker/Dockerfile ./render-worker
docker push gcr.io/your-project/render-worker:v1
```
*Note: Update the `image:` fields inside `coordinator-deployment.yaml` and `worker-deployment.yaml` to point to your pushed tags.*

### Step 4.3: Deploy Storage and Configuration Settings
1. Create and verify the Persistent Volume and Claim:
   ```bash
   kubectl apply -f infrastructure/k8s/pv-pvc.yaml
   ```
2. Apply the ConfigMap variables:
   ```bash
   kubectl apply -f infrastructure/k8s/configmap.yaml
   ```
3. Prepare your secrets. Edit `infrastructure/k8s/secrets.yaml` to include your base64-encoded credentials, then apply:
   ```bash
   kubectl apply -f infrastructure/k8s/secrets.yaml
   ```

### Step 4.4: Deploy Services (Redis, Coordinator, Workers)
1. Deploy the Redis caching layer:
   ```bash
   kubectl apply -f infrastructure/k8s/redis-deployment.yaml
   ```
2. Deploy the core Coordinator cluster:
   ```bash
   kubectl apply -f infrastructure/k8s/coordinator-deployment.yaml
   ```
3. Deploy the FFmpeg Render Worker cluster:
   ```bash
   kubectl apply -f infrastructure/k8s/worker-deployment.yaml
   ```

### Step 4.5: Establish Scaling and External Gateways
1. Apply the Ingress routing rules:
   ```bash
   kubectl apply -f infrastructure/k8s/ingress.yaml
   ```
2. Configure the Horizontal Pod Autoscalers:
   ```bash
   kubectl apply -f infrastructure/k8s/hpa.yaml
   ```

### Step 4.6: Verify Cluster Health
```bash
# Monitor pod scheduling status
kubectl get pods -n viralfactory

# Verify services and routing IPs
kubectl get svc,ingress -n viralfactory

# Double check that healthchecks are passing successfully
kubectl describe deployment coordinator-deployment -n viralfactory
```

---

## 📈 5. Auto-Scaling Mechanics (HPA)

The scaling setup implemented under `hpa.yaml` ensures that both tiers scale dynamically to optimize resource allocation:

### Coordinator Scaling
- **Min Replicas**: 2 | **Max Replicas**: 10
- **Triggers**: Average CPU usage > **70%** OR Average memory usage > **80%**.
- **Cooldown**: 5 minutes stabilization window for scaling down to prevent rapid oscillation under fluctuating API workloads.

### Render Worker Scaling
- **Min Replicas**: 3 | **Max Replicas**: 20
- **Triggers**: Average CPU usage > **80%** (indicative of high concurrency FFmpeg rendering tasks).
- **Behavior**:
  - **Scale Up**: Quick and aggressive. Instantly spins up up to 5 pods at a time to drain render queues instantly.
  - **Scale Down**: Extended **10 minutes** stabilization window. This ensures active encoding tasks are given ample time to gracefully complete before their host pod is shut down.

---

## 🔄 6. Zero-Downtime Rolling Updates & Rollback Runbook

To push application updates, system code changes, or hotfixes without taking down active services:

### 6.1 Triggering a Zero-Downtime Rolling Update
Change the image tag inside your deployments, then apply:
```bash
# Update the coordinator container image
kubectl set image deployment/coordinator-deployment coordinator=gcr.io/your-project/coordinator:v2 -n viralfactory

# Update the render-worker container image
kubectl set image deployment/worker-deployment render-worker=gcr.io/your-project/render-worker:v2 -n viralfactory
```

### 🔍 How Kubernetes Guarantees Zero-Downtime:
- **`maxSurge: 1`**: Instructs the scheduler to boot exactly 1 updated pod replica before touching any of the old pods.
- **`maxUnavailable: 0`**: Guarantees that the number of active, healthy, and serving pods never drops below the requested replica count during updates.
- **`readinessProbe` Protection**: The ingress and internal load-balancers will **never** direct traffic to the new pod until its `/api/health` probe returns a `200 OK`. If a bad image is pushed, the rollout will halt automatically before terminating active legacy pods.

### 6.2 Monitoring the Update Progress
```bash
kubectl rollout status deployment/coordinator-deployment -n viralfactory
```

### 🚨 6.3 Emergency Instant Rollback (Disaster Recovery)
If any critical issues are detected in production (e.g. broken API handlers, database connection failures), immediately trigger an instant safe rollback:
```bash
# Undo the latest update and restore the previous stable release
kubectl rollout undo deployment/coordinator-deployment -n viralfactory
kubectl rollout undo deployment/worker-deployment -n viralfactory

# View rollout version histories
kubectl rollout history deployment/coordinator-deployment -n viralfactory
```

---

## 🩺 7. Health Checks, Liveness, and Readiness Details

Our containers incorporate specialized probes to maintain perfect self-healing cluster states:

| Container | Probe Type | Action Tested | Purpose |
| :--- | :--- | :--- | :--- |
| **SaaS Coordinator** | **Readiness** | HTTP GET `/api/health` | Blocks ingress routing if Redis or DB is initializing. |
| **SaaS Coordinator** | **Liveness** | HTTP GET `/api/health` | Forcibly restarts container if Node event-loop hangs. |
| **Render Worker** | **Readiness** | Shell verification (`ffmpeg -version`) | Confirms ffmpeg binary and node daemon are ready. |
| **Render Worker** | **Liveness** | Shell check (`pgrep -f 'dist/index.js'`) | Automatically replaces workers if daemon process exits. |
| **Redis Cache** | **Liveness** | Command check (`redis-cli ping`) | Restarts Redis instance on socket blockages. |

---

## 🛠️ 8. Useful Diagnostics & Debugging Operations

```bash
# View aggregated cluster-wide CPU & memory loads
kubectl top pods -n viralfactory

# Tail live logs from a specific rendering worker pod
kubectl logs -f -l app=render-worker -n viralfactory --tail=100

# Access container shell for diagnosing ffmpeg dependency paths
kubectl exec -it deployment/worker-deployment -n viralfactory -- sh
```
