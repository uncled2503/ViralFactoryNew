import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { StorageManager } from './server/render/Storage';
import { JobQueue } from './server/render/JobQueue';
import { RenderWorker } from './server/render/Worker';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Storage Folders on boot
  StorageManager.init();

  // Initialize and start background worker
  const worker = new RenderWorker();
  worker.start();

  // Express parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Expose local storage static directory publicly so that user can view/download rendered files
  const storageStaticPath = path.join(process.cwd(), 'public', 'storage');
  if (!fs.existsSync(storageStaticPath)) {
    fs.mkdirSync(storageStaticPath, { recursive: true });
  }
  app.use('/storage', express.static(storageStaticPath));

  // --- API ROUTING ENDPOINTS ---
  
  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', worker: worker.getStatus() });
  });

  // Create a Render Job
  app.post('/api/render/job', (req, res) => {
    const { userId, projectId, projectName, templateId, templateName, duration, variables } = req.body;

    if (!userId || !projectId || !projectName || !templateId) {
      res.status(400).json({ error: 'Missing required render parameters' });
      return;
    }

    try {
      const job = JobQueue.createJob({
        userId,
        projectId,
        projectName,
        templateId,
        templateName: templateName || 'Template',
        duration: duration || '0:30',
        variables: variables || {}
      });

      res.status(201).json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit rendering job' });
    }
  });

  // Query specific job status
  app.get('/api/render/job/:id', (req, res) => {
    const job = JobQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  });

  // Query all user jobs
  app.get('/api/render/jobs/:userId', (req, res) => {
    const jobs = JobQueue.getUserJobs(req.params.userId);
    res.json(jobs);
  });

  // Cancel a queued job
  app.post('/api/render/job/:id/cancel', (req, res) => {
    const job = JobQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    
    JobQueue.cancelJob(req.params.id);
    res.json({ success: true, message: 'Job cancellation requested' });
  });

  // Sync server JSON file database to client localStorage states when requested
  app.get('/api/db/sync', (req, res) => {
    const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
    if (fs.existsSync(dbPath)) {
      try {
        const fileData = fs.readFileSync(dbPath, 'utf8');
        res.json(JSON.parse(fileData));
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
  });

  app.post('/api/db/sync', (req, res) => {
    const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
    try {
      fs.writeFileSync(dbPath, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ViralFactory Backend] Server listening at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[ViralFactory Backend] Failed to start server:', err);
});
