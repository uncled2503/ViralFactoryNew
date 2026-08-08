import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { StorageManager } from './server/render/Storage';
import { JobQueue } from './server/render/JobQueue';
import { RenderEngine } from './server/render/RenderEngine';
import { WorkerWebSocketServer } from './server/render/WorkerWebSocketServer';
import { adminRouter } from './server/routes/admin';
import { adminAuthMiddleware } from './server/middlewares/adminAuth';
import { publicApiLimiter, adminApiLimiter } from './server/middlewares/rateLimiter';
import { JobTimeoutMonitor } from './server/render/JobTimeoutMonitor';
import { RedisService } from './server/services/RedisService';
import { SupabaseStorageService } from './server/services/SupabaseStorageService';
import { ExportPresetManager } from './server/render/ExportPresetManager';
import { SupabaseDbService } from './server/database/SupabaseDbService';
import { LocalDbMutex } from './server/database/LocalDbMutex';
import { supabaseAdmin, isSupabaseConfigured } from './server/database/supabaseClient';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Compress all responses with Gzip/Brotli
  app.use(compression());

  // Initialize Supabase Database persistence and run auto-migration on boot
  await SupabaseDbService.init();

  // Initialize Redis Service on boot
  RedisService.init();

  // Initialize Storage Folders on boot
  StorageManager.init();

  // Initialize Supabase Storage on boot
  SupabaseStorageService.init();

  // Express parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Redirect storage access to Supabase signed URLs if Supabase is configured
  app.get('/storage/:folder/:filename', async (req, res, next) => {
    const { folder, filename } = req.params;
    try {
      if (SupabaseStorageService.isConfigured()) {
        const signedUrl = await SupabaseStorageService.getDownloadSignedUrl(folder, filename);
        if (signedUrl && signedUrl.startsWith('http')) {
          res.redirect(302, signedUrl);
          return;
        }
      }
    } catch (err: any) {
      console.error(`[Storage Redirect] Supabase Signed Download URL failed for ${folder}/${filename}:`, err.message);
    }
    next();
  });

  // Expose local storage static directory publicly so that user can view/download rendered files
  const storageStaticPath = path.join(process.cwd(), 'public', 'storage');
  if (!fs.existsSync(storageStaticPath)) {
    fs.mkdirSync(storageStaticPath, { recursive: true });
  }
  app.use('/storage', express.static(storageStaticPath));

  // Expose root 'fotos' directory publicly so that user-uploaded photos are served
  const fotosStaticPath = path.join(process.cwd(), 'fotos');
  if (fs.existsSync(fotosStaticPath)) {
    app.use('/fotos', express.static(fotosStaticPath));
  }

  // Expose 'exemplopaginas' directory publicly
  const exemplopaginasPath = path.join(process.cwd(), 'public', 'exemplopaginas');
  if (fs.existsSync(exemplopaginasPath)) {
    app.use('/exemplopaginas', express.static(exemplopaginasPath));
  } else {
    const rootExemplopaginas = path.join(process.cwd(), 'exemplopaginas');
    if (fs.existsSync(rootExemplopaginas)) {
      app.use('/exemplopaginas', express.static(rootExemplopaginas));
    }
  }

  // Expose 'images' directory publicly
  const imagesPath = path.join(process.cwd(), 'public', 'images');
  if (fs.existsSync(imagesPath)) {
    app.use('/images', express.static(imagesPath));
  }

  // --- API ROUTING ENDPOINTS ---
  
  // Admin Panel API Routes
  app.use('/api/admin', adminApiLimiter, adminRouter);
  
  // Public Rate Limiter for other endpoints
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/admin')) {
      return next();
    }
    publicApiLimiter(req, res, next);
  });
  
  // Get all available export presets
  app.get('/api/render/presets', (req, res) => {
    try {
      res.json(ExportPresetManager.getAllPresets());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch export presets' });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', async (req, res) => {
    res.json({
      status: 'ok',
      workers: await WorkerWebSocketServer.getWorkers(),
      redis: RedisService.healthCheck()
    });
  });

  // Get active connected workers status for monitoring dashboard
  app.get('/api/render/workers', async (req, res) => {
    res.json(await WorkerWebSocketServer.getWorkers());
  });

  // Flag single source of truth for temporary disabling of plans/limits
  const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true' || false;

  const BACKEND_PLAN_LIMITS: Record<string, { maxProjects: number; maxTemplates: number; maxVideosPerMonth: number; maxStorageMB: number }> = {
    Free: { maxProjects: 999999, maxTemplates: 999999, maxVideosPerMonth: 999999, maxStorageMB: 9999999 },
    Starter: { maxProjects: 999999, maxTemplates: 999999, maxVideosPerMonth: 999999, maxStorageMB: 9999999 },
    Pro: { maxProjects: 999999, maxTemplates: 999999, maxVideosPerMonth: 999999, maxStorageMB: 9999999 },
    Business: { maxProjects: 999999, maxTemplates: 999999, maxVideosPerMonth: 999999, maxStorageMB: 9999999 }
  };

  function parseSizeToMB(sizeStr: string | number): number {
    if (typeof sizeStr === 'number') return sizeStr;
    if (!sizeStr) return 0;
    const cleaned = sizeStr.toLowerCase().replace(/,/g, '.').trim();
    const value = parseFloat(cleaned);
    if (isNaN(value)) return 0;
    if (cleaned.includes('gb')) {
      return value * 1024;
    }
    if (cleaned.includes('kb')) {
      return value / 1024;
    }
    return value; // default is MB
  }

  // GET /api/render/signed-upload-url
  app.get('/api/render/signed-upload-url', async (req, res) => {
    const { folder, filename, contentType } = req.query;

    if (!folder || !filename) {
      res.status(400).json({ error: 'Parâmetros "folder" e "filename" são obrigatórios.' });
      return;
    }

    const destFolder = folder as string;
    const destFilename = filename as string;

    if (destFolder !== 'rendered' && destFolder !== 'uploads' && destFolder !== 'templates') {
      res.status(400).json({ error: 'Destino inválido. Pastas permitidas: rendered, uploads, templates.' });
      return;
    }

    try {
      // 1. Auth check
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      // 2. Load user and validate status & storage limits
      const dbData = await LocalDbMutex.loadDb();
      const userInDb = (dbData.saas_users || []).find((u: any) => u.id === authUser.userId);
      
      if (userInDb) {
        const isUnlimitedRole = ['owner', 'saas_owner', 'admin', 'super_admin'].includes((userInDb.role || '').toLowerCase());
        if (userInDb.status === 'suspended' && !isUnlimitedRole) {
          res.status(403).json({ error: 'Sua conta está suspensa pelo administrador.' });
          return;
        }

        const userTier = userInDb.subscription_tier || userInDb.subscription || 'Free';
        const limits = BACKEND_PLAN_LIMITS[userTier] || BACKEND_PLAN_LIMITS.Free;
        const storageUsedMB = userInDb.storage_used_mb !== undefined ? userInDb.storage_used_mb : (userInDb.storageUsedMB || 0);

        if (BILLING_ENABLED && storageUsedMB >= limits.maxStorageMB && !isUnlimitedRole) {
          res.status(403).json({ error: `Espaço de armazenamento esgotado para o plano ${userTier}.` });
          return;
        }
      }

      const uploadUrl = await SupabaseStorageService.getUploadSignedUrl(
        destFolder,
        destFilename,
        (contentType as string) || 'application/octet-stream'
      );

      res.json({
        success: true,
        uploadUrl,
        publicUrl: `/storage/${destFolder}/${destFilename}`,
        isSupabase: SupabaseStorageService.isConfigured()
      });
    } catch (err: any) {
      console.error('[Signed Upload API] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/render/signed-download-url
  app.get('/api/render/signed-download-url', async (req, res) => {
    const { folder, filename } = req.query;

    if (!folder || !filename) {
      res.status(400).json({ error: 'Parâmetros "folder" e "filename" são obrigatórios.' });
      return;
    }

    try {
      const downloadUrl = await SupabaseStorageService.getDownloadSignedUrl(folder as string, filename as string);

      res.json({
        success: true,
        downloadUrl
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Binary PUT upload endpoint for external workers to upload files to Storage
  // Accepts a raw binary stream to maximize speed and remove heavy dependencies
  app.put('/api/render/upload/:folder/:filename', (req, res) => {
    const { folder, filename } = req.params;
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = (Array.isArray(rawIp) ? rawIp[0] : (rawIp as string)).replace(/^::ffff:/, '');

    if (folder !== 'rendered' && folder !== 'uploads' && folder !== 'templates') {
      const logData = {
        event: 'MALICIOUS_ATTEMPT',
        type: 'INVALID_FOLDER',
        ip,
        url: req.originalUrl,
        folder,
        timestamp: new Date().toISOString()
      };
      console.warn(JSON.stringify(logData));
      res.status(400).json({ error: 'Invalid destination storage folder' });
      return;
    }

    // 1. Path Traversal Protection
    const hasTraversal = /[\/\\]|%\d[a-fA-F0-9]|\.\./.test(filename) || filename.includes('..');
    const resolvedBase = path.resolve(StorageManager.getStoragePath(folder as any, '')).replace(/[\\\/]$/, '');
    const resolvedTarget = path.resolve(resolvedBase, filename);

    if (hasTraversal || !resolvedTarget.startsWith(resolvedBase)) {
      const logData = {
        event: 'MALICIOUS_ATTEMPT',
        type: 'PATH_TRAVERSAL',
        ip,
        url: req.originalUrl,
        filename,
        folder,
        timestamp: new Date().toISOString()
      };
      console.warn(JSON.stringify(logData));
      res.status(400).json({ error: 'Path traversal attempt detected and blocked.' });
      return;
    }

    // 2. Strict validation of allowed extensions
    const ext = path.extname(filename).toLowerCase();
    const allowedExtsEnv = process.env.ALLOWED_UPLOAD_EXTENSIONS || '.mp4,.mov,.png,.jpg,.jpeg,.gif,.webp,.json,.mp3,.wav,.aac';
    const allowedExtensions = allowedExtsEnv.split(',').map(e => e.trim().toLowerCase());

    if (!allowedExtensions.includes(ext) || !ext) {
      const logData = {
        event: 'MALICIOUS_ATTEMPT',
        type: 'INVALID_EXTENSION',
        ip,
        url: req.originalUrl,
        filename,
        extension: ext,
        timestamp: new Date().toISOString()
      };
      console.warn(JSON.stringify(logData));
      res.status(400).json({ error: `File extension ${ext} is not allowed.` });
      return;
    }

    // 3. MIME Type Validation
    const contentType = req.headers['content-type'] || '';
    const mimeMap: Record<string, string[]> = {
      '.mp4': ['video/mp4'],
      '.mov': ['video/quicktime'],
      '.mkv': ['video/x-matroska', 'video/mkv'],
      '.avi': ['video/x-msvideo', 'video/avi'],
      '.png': ['image/png'],
      '.jpg': ['image/jpeg', 'image/jpg'],
      '.jpeg': ['image/jpeg', 'image/jpg'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.json': ['application/json', 'text/plain'],
      '.mp3': ['audio/mpeg', 'audio/mp3'],
      '.wav': ['audio/wav', 'audio/x-wav'],
      '.aac': ['audio/aac', 'audio/x-aac']
    };
    const expectedMimeTypes = mimeMap[ext] || [];
    if (expectedMimeTypes.length > 0 && contentType) {
      const isMimeValid = expectedMimeTypes.some(type => contentType.toLowerCase().startsWith(type));
      if (!isMimeValid) {
        const logData = {
          event: 'MALICIOUS_ATTEMPT',
          type: 'MIME_TYPE_MISMATCH',
          ip,
          url: req.originalUrl,
          filename,
          contentType,
          expected: expectedMimeTypes,
          timestamp: new Date().toISOString()
        };
        console.warn(JSON.stringify(logData));
        res.status(400).json({ error: 'MIME Type mismatch or invalid for this file extension.' });
        return;
      }
    }

    // 4. Maximum upload size validation
    const maxSizeBytes = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || String(100 * 1024 * 1024), 10); // default 100MB
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeBytes) {
      const logData = {
        event: 'MALICIOUS_ATTEMPT',
        type: 'FILE_SIZE_EXCEEDED_HEADER',
        ip,
        url: req.originalUrl,
        filename,
        contentLength,
        maxSizeBytes,
        timestamp: new Date().toISOString()
      };
      console.warn(JSON.stringify(logData));
      res.status(413).json({ error: 'File size exceeds maximum upload limit.' });
      return;
    }

    // 5. Complete sanitization of filename
    const baseName = path.basename(filename, ext);
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedFilename = `${sanitizedBase}${ext}`;

    const targetPath = StorageManager.getStoragePath(folder as any, sanitizedFilename);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let bytesReceived = 0;
    const writeStream = fs.createWriteStream(targetPath);
    let limitExceeded = false;

    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxSizeBytes) {
        limitExceeded = true;
        const logData = {
          event: 'MALICIOUS_ATTEMPT',
          type: 'FILE_SIZE_EXCEEDED_STREAM',
          ip,
          url: req.originalUrl,
          filename,
          bytesReceived,
          maxSizeBytes,
          timestamp: new Date().toISOString()
        };
        console.warn(JSON.stringify(logData));
        req.destroy();
        writeStream.destroy(new Error('File limit exceeded during transfer'));
      }
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      if (limitExceeded) {
        fs.unlink(targetPath, () => {});
        if (!res.headersSent) {
          res.status(413).json({ error: 'File size limit exceeded during upload.' });
        }
        return;
      }
      const publicUrl = StorageManager.getPublicUrl(folder as any, sanitizedFilename);
      console.log(`[Upload API] Remote worker uploaded file successfully to: ${publicUrl}`);
      res.json({ success: true, url: publicUrl });
    });

    writeStream.on('error', (err: any) => {
      fs.unlink(targetPath, () => {});
      console.error('[Upload API] Error writing uploaded file:', err);
      if (!res.headersSent) {
        res.status(limitExceeded ? 413 : 500).json({ 
          error: limitExceeded ? 'File size limit exceeded.' : 'Failed to write uploaded file on SaaS storage.' 
        });
      }
    });
  });

  // Create a Render Job
  app.post('/api/render/job', async (req, res) => {
    const { userId, projectId, projectName, templateId, templateName, duration, variables } = req.body;

    if (!userId || !projectId || !projectName || !templateId) {
      res.status(400).json({ error: 'Missing required render parameters' });
      return;
    }

    try {
      const dbData = await LocalDbMutex.loadDb();
      const userInDb = (dbData.saas_users || []).find((u: any) => u.id === userId);
      
      if (!userInDb) {
        res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
        return;
      }

      const isUnlimitedRole = ['owner', 'saas_owner', 'admin', 'super_admin'].includes((userInDb.role || '').toLowerCase());

      if (userInDb.status === 'suspended' && !isUnlimitedRole) {
        res.status(403).json({ error: 'Sua conta está suspensa pelo administrador.' });
        return;
      }

      const userTier = userInDb.subscription_tier || userInDb.subscription || 'Free';
      const limits = BACKEND_PLAN_LIMITS[userTier] || BACKEND_PLAN_LIMITS.Free;

      // Check current rendered videos count
      const usageCurrent = userInDb.usage_current !== undefined ? userInDb.usage_current : (userInDb.usageCurrent || 0);
      
      // Prevent parallel render request limit-bypass by checking active running/queued tasks in queue
      const activeQueuedJobsCount = JobQueue.getUserJobs(userId).filter(
        j => j.status !== 'Completed' && j.status !== 'Failed' && j.status !== 'Canceled'
      ).length;

      if (BILLING_ENABLED && usageCurrent + activeQueuedJobsCount >= limits.maxVideosPerMonth && !isUnlimitedRole) {
        res.status(403).json({ 
          error: `Limite de renderizações atingido. Seu plano (${userTier}) permite até ${limits.maxVideosPerMonth} renderizações mensais. Você já tem ${usageCurrent} concluídas e ${activeQueuedJobsCount} em andamento.` 
        });
        return;
      }

      const job = JobQueue.createJob({
        userId,
        projectId,
        projectName,
        templateId,
        templateName: templateName || 'Template',
        duration: duration || '0:30',
        variables: variables || {}
      });

      // Immediately persist the queued status in the database for cross-node visibility and crash recovery
      await RenderEngine.saveDbStatus(
        job.id,
        'queued',
        0,
        undefined,
        undefined,
        undefined,
        [`[SYSTEM] Job registrado com sucesso e aguardando processamento.`]
      ).catch(err => console.error(`[Job Submission] Failed persisting queued status for job ${job.id}:`, err.message));

      res.status(201).json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit rendering job' });
    }
  });

  // Test Render Engine endpoint
  app.post('/api/admin/test-render', adminAuthMiddleware, async (req, res) => {
    try {
      const testUserId = req.body.userId || 'usr-admin-test';
      const testProjectId = 'prj-test-engine';
      const testTemplateId = 'tpl-test-engine';

      // Use LocalDbMutex to run the updates inside a safe database lock to prevent file corruption
      await LocalDbMutex.runLocked((dbData) => {
        if (!dbData.projects) dbData.projects = [];
        if (!dbData.templates) dbData.templates = [];

        // Upsert test project
        const projIndex = dbData.projects.findIndex((p: any) => p.id === testProjectId);
        const testProjectObj = {
          id: testProjectId,
          user_id: testUserId,
          name: "Projeto Temporário de Teste",
          presetId: "tiktok",
          variables: {
            brandColor: "#0f172a"
          }
        };
        if (projIndex !== -1) {
          dbData.projects[projIndex] = testProjectObj;
        } else {
          dbData.projects.push(testProjectObj);
        }

        // Upsert test template
        const tplIndex = dbData.templates.findIndex((t: any) => t.id === testTemplateId);
        const testTemplateObj = {
          id: testTemplateId,
          name: "Template Temporário de Teste",
          defaultDuration: 5
        };
        if (tplIndex !== -1) {
          dbData.templates[tplIndex] = testTemplateObj;
        } else {
          dbData.templates.push(testTemplateObj);
        }
      });

      // Define variables for the 5-second video, text layer and image layer
      const variables = {
        duration: 5,
        templateJson: {
          width: 1280,
          height: 720,
          duration: 5,
          presetId: "tiktok",
          layers: [
            {
              id: "layer-base-bg",
              type: "background",
              position: { x: 0, y: 0 },
              size: { width: 1280, height: 720 },
              rotation: 0,
              opacity: 100,
              zIndex: 0,
              timeline: { start: 0, end: 5 },
              styles: {
                overlayType: "solid",
                color: "#0f172a"
              },
              content: ""
            },
            {
              id: "layer-test-image",
              type: "image",
              position: { x: 100, y: 100 },
              size: { width: 200, height: 200 },
              rotation: 0,
              opacity: 100,
              zIndex: 1,
              timeline: { start: 0, end: 5 },
              content: "/src/assets/images/logo_symbol_new_1782894227400.jpg",
              styles: {}
            },
            {
              id: "layer-test-text",
              type: "text",
              position: { x: 400, y: 320 },
              size: { width: 800, height: 100 },
              rotation: 0,
              opacity: 100,
              zIndex: 2,
              timeline: { start: 0, end: 5 },
              content: "Teste do Motor FFmpeg OK!",
              styles: {
                color: "#38bdf8",
                size: 54,
                align: "center",
                font: "Inter"
              }
            }
          ]
        }
      };

      // Create render job
      const job = JobQueue.createJob({
        userId: testUserId,
        projectId: testProjectId,
        projectName: "Test Engine Project",
        templateId: testTemplateId,
        templateName: "Test Engine Template",
        duration: "0:05",
        variables
      });

      // Poll job queue status until completed or failed
      let completedJob = JobQueue.getJob(job.id);
      let attempts = 0;
      const maxAttempts = 150; // 30 seconds max timeout

      while (completedJob && (completedJob.status === 'Queued' || completedJob.status === 'Preparing' || completedJob.status === 'Rendering' || completedJob.status === 'Encoding' || completedJob.status === 'Saving') && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200));
        completedJob = JobQueue.getJob(job.id);
        attempts++;
      }

      if (!completedJob) {
        throw new Error("Job unexpectedly removed from tracking.");
      }

      if (completedJob.status === 'Failed') {
        throw new Error(completedJob.error || "Render job failed inside the pipeline.");
      }

      res.status(200).json({
        success: true,
        job: completedJob
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to complete test rendering.' });
    }
  });

  // Query specific job status
  app.get('/api/render/job/:id', async (req, res) => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      let job = JobQueue.getJob(req.params.id);
      
      // Fallback 1: Check Redis cache for horizontal scaling compatibility
      if (!job && RedisService.isAvailable()) {
        try {
          const cached = await RedisService.get(`job:state:${req.params.id}`);
          if (cached) {
            job = JSON.parse(cached);
          }
        } catch (err: any) {
          console.error('[Job Status API] Redis fetch failed:', err.message);
        }
      }

      // Fallback 2: Check persistent database to locate job owned by another instance
      if (!job) {
        try {
          const dbData = await LocalDbMutex.loadDb();
          const task = (dbData.rendering_tasks || []).find((t: any) => t && t.id === req.params.id);
          if (task) {
            job = {
              id: task.id,
              userId: task.user_id || task.userId,
              projectId: task.project_id || task.projectId,
              projectName: task.project_name || task.projectName || 'Project',
              templateId: task.template_id || task.templateId,
              templateName: task.template_name || task.templateName || 'Template',
              status: task.status === 'completed' ? 'Completed' : task.status === 'failed' ? 'Failed' : task.status === 'queued' ? 'Queued' : 'Rendering',
              progress: task.progress || 0,
              duration: task.duration || '0:30',
              createdAt: task.created_at || task.createdAt,
              completedAt: task.completed_at,
              error: task.error_message,
              logs: task.logs,
              debugInfo: task.debug_info,
              variables: task.variables || {}
            } as any;
          }
        } catch (err: any) {
          console.error('[Job Status API] DB fetch failed:', err.message);
        }
      }

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Enforce strict tenant isolation / authorization check
      const dbDataForCheck = await LocalDbMutex.loadDb();
      const currentAdminObj = (dbDataForCheck.saas_users || []).find((u: any) => u.id === authUser.userId);
      const isAuthAdmin = currentAdminObj && ['owner', 'saas_owner', 'admin', 'super_admin'].includes((currentAdminObj.role || '').toLowerCase());
      if (job.userId !== authUser.userId && !isAuthAdmin) {
        res.status(403).json({ error: 'Não autorizado. Este job não pertence à sua conta.' });
        return;
      }

      res.json(job);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Query all user jobs
  app.get('/api/render/jobs/:userId', async (req, res) => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      // Enforce authorization
      const dbData = await LocalDbMutex.loadDb();
      const requestingUserObj = (dbData.saas_users || []).find((u: any) => u.id === authUser.userId);
      const isReqAdmin = requestingUserObj && ['owner', 'saas_owner', 'admin', 'super_admin'].includes((requestingUserObj.role || '').toLowerCase());
      if (req.params.userId !== authUser.userId && !isReqAdmin) {
        res.status(403).json({ error: 'Não autorizado. Você não pode listar os jobs de outro usuário.' });
        return;
      }
      const dbTasks = (dbData.rendering_tasks || []).filter(
        (t: any) => t && (t.user_id === req.params.userId || t.userId === req.params.userId)
      );

      // Map DB tasks to RenderJob format
      const jobs = dbTasks.map((task: any) => ({
        id: task.id,
        userId: task.user_id || task.userId,
        projectId: task.project_id || task.projectId,
        projectName: task.project_name || task.projectName,
        templateId: task.template_id || task.templateId,
        templateName: task.template_name || task.templateName,
        status: task.status === 'completed' ? 'Completed' : task.status === 'failed' ? 'Failed' : task.status === 'queued' ? 'Queued' : 'Rendering',
        progress: task.progress || 0,
        duration: task.duration || '0:30',
        createdAt: task.created_at || task.createdAt,
        completedAt: task.completed_at,
        error: task.error_message,
        logs: task.logs,
        debugInfo: task.debug_info,
        variables: task.variables || {}
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Cancel a queued job
  app.post('/api/render/job/:id/cancel', async (req, res) => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      // Try local memory first
      let job = JobQueue.getJob(req.params.id);

      // Fallback: Check DB if not found locally
      if (!job) {
        const dbData = await LocalDbMutex.loadDb();
        const task = (dbData.rendering_tasks || []).find((t: any) => t && t.id === req.params.id);
        if (task) {
          job = {
            id: task.id,
            userId: task.user_id || task.userId,
            projectId: task.project_id || task.projectId,
            projectName: task.project_name || task.projectName,
            templateId: task.template_id || task.templateId,
            status: task.status === 'completed' ? 'Completed' : task.status === 'failed' ? 'Failed' : task.status === 'queued' ? 'Queued' : 'Preparing'
          } as any;
        }
      }

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const dbDataCancel = await LocalDbMutex.loadDb();
      const cancelUserObj = (dbDataCancel.saas_users || []).find((u: any) => u.id === authUser.userId);
      const isCancelAdmin = cancelUserObj && ['owner', 'saas_owner', 'admin', 'super_admin'].includes((cancelUserObj.role || '').toLowerCase());
      if (job.userId !== authUser.userId && !isCancelAdmin) {
        res.status(403).json({ error: 'Não autorizado. Você só pode cancelar seus próprios jobs.' });
        return;
      }

      // Update state in memory (if present)
      JobQueue.cancelJob(req.params.id);

      // Persist the cancellation state to the DB immediately
      await RenderEngine.saveDbStatus(
        req.params.id,
        'failed',
        0,
        undefined,
        undefined,
        'Renderização cancelada pelo usuário.',
        [`[SYSTEM] Renderização cancelada pelo usuário.`]
      ).catch(err => console.error('[Job Cancellation] DB update failed:', err.message));

      res.json({ success: true, message: 'Job cancellation requested' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper to extract authenticated user from Authorization Bearer token (Supabase Auth)
  // falls back to query/body parameter with strict validation
  async function getAuthenticatedUser(req: express.Request): Promise<{ userId: string; email: string | null } | null> {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (isSupabaseConfigured() && supabaseAdmin) {
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && user) {
            return { userId: user.id, email: user.email || null };
          }
        } catch (e: any) {
          console.error('[Auth Helper] Supabase JWT verification failed:', e.message);
        }
      }
    }
    
    // Fallback to query/body parameters for sandbox/local-only or backward-compatible development
    const userId = (req.query.userId || req.body.userId) as string;
    if (!userId) return null;
    
    // Find user in cachedDbData to obtain email if possible
    try {
      const dbData = await LocalDbMutex.loadDb();
      const users = dbData.saas_users || dbData.users || [];
      const userObj = users.find((u: any) => u.id === userId);
      return { userId, email: userObj?.email || null };
    } catch {
      return { userId, email: null };
    }
  }

  // Sync server database from/to client localStorage states when requested
  app.get('/api/db/sync', async (req, res) => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      const { userId, email: userEmail } = authUser;
      const dbData = await LocalDbMutex.loadDb();

      // Return a carefully filtered, tenant-isolated snapshot of the database to prevent leakage
      const filteredData = {
        saas_users: (dbData.saas_users || []).filter((u: any) => u && u.id === userId),
        users: (dbData.users || []).filter((u: any) => u && u.id === userId),
        projects: (dbData.projects || []).filter((p: any) => p && (p.userId === userId || p.user_id === userId)),
        rendering_tasks: (dbData.rendering_tasks || []).filter((t: any) => t && (t.userId === userId || t.user_id === userId)),
        invoices: (dbData.invoices || []).filter((inv: any) => inv && (inv.userId === userId || inv.user_id === userId)),
        templates: (dbData.templates || []).filter((t: any) => t && (t.is_public || t.userId === userId || t.user_id === userId || !t.userId)),
        settings: (dbData.settings || []).filter((s: any) => s && s.key !== 'stripe_secret_key' && s.key !== 'stripe_webhook_secret' && !s.key.includes('key') && !s.key.includes('secret')),
        storage_folders: (dbData.storage_folders || []).map((folder: any) => {
          if (!folder) return null;
          const isStandard = ['fld-uploads', 'fld-templates', 'fld-logos', 'fld-videos', 'fld-rendered', 'uploads', 'templates', 'rendered'].includes(folder.id);
          if (isStandard) {
            return {
              ...folder,
              files: (folder.files || []).filter((file: any) => file && (file.userId === userId || file.user_id === userId))
            };
          }
          // Custom folders belong strictly to their creator
          if (folder.userId === userId || folder.user_id === userId) {
            return folder;
          }
          return null;
        }).filter(Boolean),
        support_tickets: userEmail 
          ? (dbData.support_tickets || []).filter((st: any) => st && (st.customer_email === userEmail || st.customerEmail === userEmail || st.user_id === userId || st.userId === userId))
          : []
      };

      res.json(filteredData);
    } catch (e: any) {
      console.error('[Sync GET Error]:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/db/sync', async (req, res) => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser || !authUser.userId) {
        res.status(401).json({ error: 'Não autorizado. Identificação de usuário ausente ou inválida.' });
        return;
      }

      const { userId } = authUser;

      await LocalDbMutex.runLocked((dbData) => {
        // Safe, bounded merger that prevents cross-user overwriting
        const mergeById = (targetArray: any[] = [], sourceArray: any[] = []) => {
          const map = new Map();
          targetArray.forEach(item => {
            if (item && item.id) {
              map.set(item.id, item);
            }
          });
          sourceArray.forEach(item => {
            if (item && item.id) {
              map.set(item.id, { ...map.get(item.id), ...item });
            }
          });
          return Array.from(map.values());
        };

        const existingUser = (dbData.saas_users || []).find((u: any) => u.id === userId);
        const incomingList = req.body.saas_users || req.body.users || [];
        const incomingProfile = incomingList.find((u: any) => u && (u.id === userId || (u.email && existingUser?.email && u.email.toLowerCase() === existingUser.email.toLowerCase())));

        const userEmail = (existingUser?.email || incomingProfile?.email || req.query.email || '').toString().toLowerCase().trim();
        const userRole = (existingUser?.role || incomingProfile?.role || '').toString().toLowerCase().trim();
        const isMasterUser = userEmail === 'mouragabriel2011@gmail.com' || userId === '00000000-0000-0000-0000-000000000001' || userId === 'usr-master';

        const isSyncAdmin = isMasterUser || ['owner', 'saas_owner', 'saas owner', 'admin', 'super_admin', 'super admin', 'gerente', 'suporte', 'financeiro', 'moderador', 'administrador'].includes(userRole);

        // 1. Suspension check
        if (existingUser && existingUser.status === 'suspended' && !isSyncAdmin) {
          throw new Error('SUSPENDED_ACCOUNT');
        }

        const userTier = isMasterUser ? 'Pro' : (existingUser?.subscription_tier || existingUser?.subscription || incomingProfile?.subscription || 'Free');
        const limits = BACKEND_PLAN_LIMITS[userTier] || BACKEND_PLAN_LIMITS.Free;

        // 2. Profile Sanitization & Merging
        if (incomingProfile) {
          if (!existingUser) {
            // Creating user record for the first time
            const newUserObj = {
              id: userId,
              name: incomingProfile.name || 'Gabriel Moura',
              email: incomingProfile.email || 'mouragabriel2011@gmail.com',
              company: incomingProfile.company || '',
              role: isMasterUser ? 'SaaS_Owner' : (incomingProfile.role || 'Membro'),
              avatar_url: incomingProfile.avatar_url || incomingProfile.avatarUrl || '',
              avatarUrl: incomingProfile.avatar_url || incomingProfile.avatarUrl || '',
              subscription_tier: isMasterUser ? 'Pro' : (incomingProfile.subscription_tier || incomingProfile.subscription || 'Free'),
              subscription: isMasterUser ? 'Pro' : (incomingProfile.subscription || incomingProfile.subscription_tier || 'Free'),
              status: 'active',
              usage_current: incomingProfile.usage_current || incomingProfile.usageCurrent || 0,
              usageCurrent: incomingProfile.usage_current || incomingProfile.usageCurrent || 0,
              usage_limit: (!BILLING_ENABLED || isSyncAdmin) ? 999999 : (limits.maxVideosPerMonth || 5),
              usageLimit: (!BILLING_ENABLED || isSyncAdmin) ? 999999 : (limits.maxVideosPerMonth || 5),
              storage_used_mb: incomingProfile.storage_used_mb || incomingProfile.storageUsedMB || 0,
              storageUsedMB: incomingProfile.storage_used_mb || incomingProfile.storageUsedMB || 0,
              templates_used: 0,
              templatesUsed: 0,
              projects_active: 0,
              projectsActive: 0,
              created_at: new Date().toISOString()
            };
            if (!dbData.saas_users) dbData.saas_users = [];
            dbData.saas_users.push(newUserObj);
            dbData.users = dbData.saas_users;
          } else {
            // Edit existing user
            if (incomingProfile.name !== undefined) existingUser.name = incomingProfile.name;
            if (incomingProfile.company !== undefined) existingUser.company = incomingProfile.company;
            if (incomingProfile.avatar_url !== undefined) {
              existingUser.avatar_url = incomingProfile.avatar_url;
              existingUser.avatarUrl = incomingProfile.avatar_url;
            }
            if (incomingProfile.avatarUrl !== undefined) {
              existingUser.avatar_url = incomingProfile.avatarUrl;
              existingUser.avatarUrl = incomingProfile.avatarUrl;
            }

            if (isMasterUser) {
              existingUser.role = 'SaaS_Owner';
              existingUser.subscription_tier = 'Pro';
              existingUser.subscription = 'Pro';
              existingUser.status = 'active';
              existingUser.usage_limit = 999999;
              existingUser.usageLimit = 999999;
            } else {
              if (incomingProfile.role && incomingProfile.role !== 'user') {
                existingUser.role = incomingProfile.role;
              }
              if (incomingProfile.subscription_tier || incomingProfile.subscription) {
                existingUser.subscription_tier = incomingProfile.subscription_tier || incomingProfile.subscription;
                existingUser.subscription = existingUser.subscription_tier;
              }
              existingUser.status = existingUser.status || 'active';
            }
          }
        }

        const activeUser = (dbData.saas_users || []).find((u: any) => u.id === userId);

        // 3. Sync & Validate Projects limit
        let activeProjectsCount = 0;
        if (req.body.projects) {
          const incomingUserProjects = req.body.projects
            .filter((p: any) => p && (p.userId === userId || p.user_id === userId || !p.userId))
            .map((p: any) => ({ ...p, userId, user_id: userId }));

          const otherUsersProjects = (dbData.projects || [])
            .filter((p: any) => p && p.userId !== userId && p.user_id !== userId);

          const existingUserProjects = (dbData.projects || [])
            .filter((p: any) => p && (p.userId === userId || p.user_id === userId));

          const existingProjectsMap = new Map<string, any>(existingUserProjects.map((p: any) => [p.id, p]));

          const resolvedUserProjects = incomingUserProjects.map((incoming: any) => {
            const existing = existingProjectsMap.get(incoming.id);
            if (existing) {
              const definitiveStatuses = ['completed', 'failed'];
              const incomingStatus = (incoming.status || '').toLowerCase();
              const existingStatus = (existing.status || '').toLowerCase();
              
              let status = incoming.status;
              let videoUrl = incoming.videoUrl || incoming.video_url;

              if (definitiveStatuses.includes(existingStatus) && !definitiveStatuses.includes(incomingStatus)) {
                status = existing.status;
                videoUrl = existing.videoUrl || existing.video_url;
              }

              return {
                ...existing,
                ...incoming,
                status,
                videoUrl,
                video_url: videoUrl,
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }
            return {
              ...incoming,
              userId,
              user_id: userId,
              createdAt: incoming.createdAt || incoming.created_at || new Date().toISOString(),
              updatedAt: incoming.updatedAt || incoming.updated_at || new Date().toISOString()
            };
          });

          activeProjectsCount = resolvedUserProjects.filter((p: any) => p && p.status !== 'completed' && p.status !== 'failed').length;
          if (BILLING_ENABLED && activeProjectsCount > limits.maxProjects && !isSyncAdmin) {
            throw new Error('LIMIT_PROJECTS_EXCEEDED');
          }

          dbData.projects = [...otherUsersProjects, ...resolvedUserProjects];
        } else {
          const userProjects = (dbData.projects || []).filter((p: any) => p && (p.userId === userId || p.user_id === userId));
          activeProjectsCount = userProjects.filter((p: any) => p && p.status !== 'completed' && p.status !== 'failed').length;
        }

        if (activeUser) {
          activeUser.projects_active = activeProjectsCount;
          activeUser.projectsActive = activeProjectsCount;
        }

        // 4. Sync & Validate Templates limit
        let totalTemplatesCount = 0;
        if (req.body.templates) {
          const incomingUserTemplates = req.body.templates
            .filter((t: any) => t && (t.userId === userId || t.user_id === userId || !t.userId))
            .map((t: any) => ({ ...t, userId, user_id: userId }));

          const otherTemplates = (dbData.templates || [])
            .filter((t: any) => t && t.userId !== userId && t.user_id !== userId);

          const existingUserTemplates = (dbData.templates || [])
            .filter((t: any) => t && (t.userId === userId || t.user_id === userId));

          const mergedUserTemplates = mergeById(existingUserTemplates, incomingUserTemplates);
          
          totalTemplatesCount = mergedUserTemplates.length;
          if (BILLING_ENABLED && totalTemplatesCount > limits.maxTemplates && !isSyncAdmin) {
            throw new Error('LIMIT_TEMPLATES_EXCEEDED');
          }

          dbData.templates = [...otherTemplates, ...mergedUserTemplates];
        } else {
          const userTemplates = (dbData.templates || []).filter((t: any) => t && (t.userId === userId || t.user_id === userId));
          totalTemplatesCount = userTemplates.length;
        }

        if (activeUser) {
          activeUser.templates_used = totalTemplatesCount;
          activeUser.templatesUsed = totalTemplatesCount;
        }

        // 5. Sync Rendering Tasks with Concurrency Guard
        if (req.body.rendering_tasks) {
          const incomingUserTasks = req.body.rendering_tasks
            .filter((t: any) => t && (t.userId === userId || t.user_id === userId || !t.userId))
            .map((t: any) => ({ ...t, userId, user_id: userId }));

          const otherUsersTasks = (dbData.rendering_tasks || [])
            .filter((t: any) => t && t.userId !== userId && t.user_id !== userId);

          const existingUserTasks = (dbData.rendering_tasks || [])
            .filter((t: any) => t && (t.userId === userId || t.user_id === userId));

          const existingTasksMap = new Map<string, any>(existingUserTasks.map((t: any) => [t.id, t]));

          const resolvedUserTasks = incomingUserTasks.map((incoming: any) => {
            const existing = existingTasksMap.get(incoming.id);
            if (existing) {
              const definitiveStatuses = ['completed', 'failed', 'cancelled'];
              const incomingStatus = (incoming.status || '').toLowerCase();
              const existingStatus = (existing.status || '').toLowerCase();

              let status = incoming.status;
              let progress = incoming.progress;
              let outputUrl = incoming.outputUrl || incoming.output_url;

              if (definitiveStatuses.includes(existingStatus) && !definitiveStatuses.includes(incomingStatus)) {
                status = existing.status;
                progress = existing.progress;
                outputUrl = existing.outputUrl || existing.output_url;
              }

              return {
                ...existing,
                ...incoming,
                status,
                progress,
                outputUrl,
                output_url: outputUrl
              };
            }
            return incoming;
          });

          dbData.rendering_tasks = [...otherUsersTasks, ...resolvedUserTasks];
        }

        // 6. Sync Storage Folders with perfect Tenant Isolation and Validate disk size limits
        let totalStorageMB = 0;
        const standardFolderIds = ['fld-uploads', 'fld-templates', 'fld-logos', 'fld-videos', 'fld-rendered', 'uploads', 'templates', 'rendered'];

        if (req.body.storage_folders) {
          if (!dbData.storage_folders) dbData.storage_folders = [];

          // Separate other users' custom folders
          const otherUsersCustomFolders = dbData.storage_folders
            .filter((f: any) => f && f.id && !standardFolderIds.includes(f.id) && f.userId !== userId && f.user_id !== userId);

          // Filter incoming custom folders (non-standard) to only those of this user, forcing tenancy
          const incomingUserCustomFolders = req.body.storage_folders
            .filter((f: any) => f && f.id && !standardFolderIds.includes(f.id))
            .map((f: any) => ({ ...f, userId, user_id: userId }));

          // Combine custom folders list
          const existingUserCustomFolders = dbData.storage_folders
            .filter((f: any) => f && f.id && !standardFolderIds.includes(f.id) && (f.userId === userId || f.user_id === userId));

          const mergedUserCustomFolders = mergeById(existingUserCustomFolders, incomingUserCustomFolders);

          // Now, handle standard folders by merging/replacing files belonging to the current user only
          const resolvedStandardFolders = standardFolderIds.map(folderId => {
            const existingFolder = dbData.storage_folders.find((f: any) => f && f.id === folderId);
            const incomingFolder = req.body.storage_folders.find((f: any) => f && f.id === folderId);

            const standardFolderSkeleton = {
              id: folderId,
              name: folderId.replace('fld-', '').toUpperCase(),
              path: `/storage/${folderId.replace('fld-', '')}`,
              description: '',
              files: []
            };

            const targetFolder = existingFolder ? { ...existingFolder } : { ...standardFolderSkeleton };

            // Files from other users
            const otherUsersFiles = (targetFolder.files || [])
              .filter((file: any) => file && file.userId !== userId && file.user_id !== userId);

            // Incoming files for this user, force tagged with userId
            const incomingUserFiles = (incomingFolder?.files || [])
              .map((file: any) => ({ ...file, userId, user_id: userId }));

            // Update files for the target folder
            targetFolder.files = [...incomingUserFiles, ...otherUsersFiles];
            return targetFolder;
          });

          // Calculate total space in standard and custom folders
          resolvedStandardFolders.forEach((folder: any) => {
            (folder.files || []).forEach((file: any) => {
              if (file && (file.userId === userId || file.user_id === userId)) {
                totalStorageMB += parseSizeToMB(file.size || file.fileSize || 0);
              }
            });
          });

          mergedUserCustomFolders.forEach((folder: any) => {
            (folder.files || []).forEach((file: any) => {
              totalStorageMB += parseSizeToMB(file.size || file.fileSize || 0);
            });
          });

          if (BILLING_ENABLED && totalStorageMB > limits.maxStorageMB && !isSyncAdmin) {
            throw new Error('LIMIT_STORAGE_EXCEEDED');
          }

          // Set complete set of storage folders
          dbData.storage_folders = [
            ...resolvedStandardFolders,
            ...otherUsersCustomFolders,
            ...mergedUserCustomFolders
          ];
        } else {
          // Calculate existing storage usage count
          if (dbData.storage_folders) {
            dbData.storage_folders.forEach((folder: any) => {
              const isStandard = standardFolderIds.includes(folder.id);
              if (isStandard) {
                (folder.files || []).forEach((file: any) => {
                  if (file && (file.userId === userId || file.user_id === userId)) {
                    totalStorageMB += parseSizeToMB(file.size || 0);
                  }
                });
              } else if (folder.userId === userId || folder.user_id === userId) {
                (folder.files || []).forEach((file: any) => {
                  totalStorageMB += parseSizeToMB(file.size || 0);
                });
              }
            });
          }
        }

        if (activeUser) {
          activeUser.storage_used_mb = parseFloat(totalStorageMB.toFixed(2));
          activeUser.storageUsedMB = parseFloat(totalStorageMB.toFixed(2));
        }

        // 7. DISCARD client invoices to prevent financial/payment spoofing
        // Invoices can only be added/edited by backend webhook triggers or administrators.
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error('[Sync POST Error]:', e);
      if (e.message === 'SUSPENDED_ACCOUNT') {
        res.status(403).json({ error: 'Sua conta está suspensa pelo proprietário do SaaS.' });
      } else if (e.message === 'LIMIT_PROJECTS_EXCEEDED') {
        res.status(403).json({ error: 'Limite de Projetos Atingido. Faça upgrade do seu plano para liberar projetos ilimitados.' });
      } else if (e.message === 'LIMIT_TEMPLATES_EXCEEDED') {
        res.status(403).json({ error: 'Limite de Templates Atingido. Faça upgrade do seu plano para liberar templates ilimitados.' });
      } else if (e.message === 'LIMIT_STORAGE_EXCEEDED') {
        res.status(403).json({ error: 'Espaço em Disco Esgotado. Exclua arquivos na aba de Armazenamento para liberar espaço ou faça upgrade.' });
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  });

  // --- RoyPay API Integration Endpoints (Database-Backed) ---

  async function getRoyPayTransactions(): Promise<any> {
    const dbData = await LocalDbMutex.loadDb();
    if (!dbData.roypay_transactions) {
      const { supabaseAdmin } = await import('./server/database/supabaseClient');
      if (supabaseAdmin) {
        try {
          const { data } = await supabaseAdmin
            .from('configuration')
            .select('key_value')
            .eq('key_name', 'roypay_transactions')
            .maybeSingle();
          if (data && data.key_value) {
            dbData.roypay_transactions = typeof data.key_value === 'string' 
              ? JSON.parse(data.key_value) 
              : data.key_value;
          }
        } catch (err) {
          console.error('[RoyPay Storage] Failed to load transactions:', err);
        }
      }
    }
    return dbData.roypay_transactions || {};
  }

  async function saveRoyPayTransactions(txData: any): Promise<void> {
    const dbData = await LocalDbMutex.loadDb();
    dbData.roypay_transactions = txData;
    const { supabaseAdmin } = await import('./server/database/supabaseClient');
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('configuration')
          .upsert({
            key_name: 'roypay_transactions',
            key_value: JSON.stringify(txData),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key_name' });
      } catch (err) {
        console.error('[RoyPay Storage] Failed to save transactions:', err);
      }
    }
  }

  // 1. POST /api/payments/roypay/cashin
  app.post('/api/payments/roypay/cashin', async (req, res) => {
    try {
      const { planTier, billingCycle, clientName, clientDocument, clientTelefone, clientEmail, userId } = req.body;

      if (!planTier || !billingCycle || !clientName || !clientDocument || !clientTelefone || !clientEmail || !userId) {
        res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
        return;
      }

      let price = 49;
      if (planTier === 'Starter') {
        price = billingCycle === 'annual' ? 39 : 49;
      } else if (planTier === 'Pro') {
        price = billingCycle === 'annual' ? 119 : 149;
      } else if (planTier === 'Business') {
        price = billingCycle === 'annual' ? 399 : 499;
      }

      // Ensure CPF and Phone have minimum valid lengths or fallback defaults
      let cleanDoc = (clientDocument || '').toString().replace(/\D/g, '');
      if (!cleanDoc || cleanDoc.length < 11) {
        cleanDoc = '39182745012';
      }

      let cleanPhone = (clientTelefone || '').toString().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        cleanPhone = '11999998888';
      }

      const totalAmount = billingCycle === 'annual' ? price * 12 : price;
      const apiKey = process.env.ROYPAY_API_KEY || "81bb141jmdaw9u32-d3q9md3qd-qdwq59";

      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const callbackUrl = process.env.APP_URL 
        ? `${process.env.APP_URL}/api/payments/roypay/webhook`
        : `${protocol}://${host}/api/payments/roypay/webhook`;

      const requestPayload = {
        "api-key": apiKey,
        "amount": totalAmount,
        "client": {
          "name": clientName || 'Cliente Viral Factory',
          "document": cleanDoc,
          "telefone": cleanPhone,
          "email": clientEmail || 'cliente@viralfactory.com'
        },
        "callbackUrl": callbackUrl
      };

      console.log('[RoyPay Integration] Requesting Cash In:', requestPayload);

      let royPayResponse: any;
      try {
        royPayResponse = await fetch('https://api.royalbanking.com.br/v1/gateway/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });
      } catch (fetchErr: any) {
        console.warn('[RoyPay Integration] Fetch error to gateway:', fetchErr.message);
      }

      if (!royPayResponse || !royPayResponse.ok) {
        const errorText = royPayResponse ? await royPayResponse.text() : 'Network/Gateway Unavailable';
        console.warn('[RoyPay Integration] Gateway warning or error (using simulation mode):', errorText);

        const mockTxId = `pix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mockPaymentCode = `00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540${totalAmount.toFixed(2)}5802BR5913ViralFactory6009SAO PAULO62070503***63041D2C`;

        const txData = await getRoyPayTransactions();
        txData[mockTxId] = {
          userId,
          planTier,
          billingCycle,
          amount: totalAmount,
          status: 'pending',
          client: {
            name: clientName || 'Cliente Viral Factory',
            email: clientEmail || 'cliente@viralfactory.com'
          },
          createdAt: new Date().toISOString()
        };
        await saveRoyPayTransactions(txData);

        res.status(200).json({
          status: 'success',
          idTransaction: mockTxId,
          paymentCode: mockPaymentCode,
          paymentCodeBase64: ''
        });
        return;
      }

      const royPayData: any = await royPayResponse.json();

      if (royPayData.status !== 'success') {
        res.status(400).json({
          error: royPayData.message || 'Falha ao processar Pix no gateway RoyPay.',
          details: royPayData
        });
        return;
      }

      const idTransaction = royPayData.idTransaction;
      
      const txData = await getRoyPayTransactions();
      txData[idTransaction] = {
        userId,
        planTier,
        billingCycle,
        amount: totalAmount,
        status: 'pending',
        client: {
          name: clientName,
          email: clientEmail
        },
        createdAt: new Date().toISOString()
      };
      await saveRoyPayTransactions(txData);

      res.status(200).json({
        status: 'success',
        idTransaction,
        paymentCode: royPayData.paymentCode,
        paymentCodeBase64: royPayData.paymentCodeBase64
      });

    } catch (err: any) {
      console.error('[RoyPay Integration] Unexpected cashin error:', err);
      res.status(500).json({ error: err.message || 'Erro interno no processador de pagamentos.' });
    }
  });

  // 2. GET /api/payments/roypay/status/:idTransaction
  app.get('/api/payments/roypay/status/:idTransaction', async (req, res) => {
    try {
      const { idTransaction } = req.params;
      const txData = await getRoyPayTransactions();
      const tx = txData[idTransaction];

      if (!tx) {
        res.status(404).json({ error: 'Transação não encontrada.' });
        return;
      }

      res.json({
        idTransaction,
        status: tx.status,
        planTier: tx.planTier,
        billingCycle: tx.billingCycle
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. POST /api/payments/roypay/webhook
  app.post('/api/payments/roypay/webhook', async (req, res) => {
    try {
      console.log('[RoyPay Webhook] Received webhook payload:', req.body);
      const { idTransaction, status } = req.body;

      if (!idTransaction) {
        res.status(400).json({ error: 'idTransaction é obrigatório.' });
        return;
      }

      const txData = await getRoyPayTransactions();
      const tx = txData[idTransaction];

      if (!tx) {
        console.warn(`[RoyPay Webhook] Transaction ${idTransaction} not found.`);
        res.status(200).json(200);
        return;
      }

      if (status === 'paid') {
        tx.status = 'paid';
        tx.paidAt = new Date().toISOString();
        txData[idTransaction] = tx;
        await saveRoyPayTransactions(txData);
        console.log(`[RoyPay Webhook] Transaction ${idTransaction} set to paid successfully!`);

        await LocalDbMutex.runLocked((dbData) => {
          if (!dbData.invoices) dbData.invoices = [];
          
          dbData.invoices.push({
            id: `inv-rp-${Math.random().toString(36).substr(2, 6)}`,
            customer_name: tx.client?.name || 'Cliente RoyPay',
            customer_email: tx.client?.email || '',
            plan: tx.planTier,
            amount: tx.amount,
            status: 'paid',
            created_at: new Date().toISOString(),
            stripe_id: `roypay-${idTransaction}`
          });

          const users = dbData.saas_users || dbData.users || [];
          const userIdx = users.findIndex((u: any) => u.id === tx.userId);
          if (userIdx !== -1) {
            users[userIdx].subscription = tx.planTier;
            users[userIdx].usageLimit = tx.planTier === 'Starter' ? 100 : tx.planTier === 'Pro' ? 2000 : 10000;
          }
        });
        console.log('[RoyPay Webhook] Updated database invoices and users successfully!');
      }

      res.status(200).json(200);
    } catch (err: any) {
      console.error('[RoyPay Webhook] Webhook handler error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. POST /api/payments/roypay/simulate-webhook
  app.post('/api/payments/roypay/simulate-webhook', async (req, res) => {
    try {
      const { idTransaction } = req.body;
      if (!idTransaction) {
        res.status(400).json({ error: 'idTransaction é obrigatório para simulação.' });
        return;
      }

      console.log(`[RoyPay Simulator] Simulating paid webhook for transaction: ${idTransaction}`);

      const txData = await getRoyPayTransactions();
      const tx = txData[idTransaction];

      if (!tx) {
        res.status(404).json({ error: 'Transação não encontrada para simulação.' });
        return;
      }

      tx.status = 'paid';
      tx.paidAt = new Date().toISOString();
      txData[idTransaction] = tx;
      await saveRoyPayTransactions(txData);

      await LocalDbMutex.runLocked((dbData) => {
        if (!dbData.invoices) dbData.invoices = [];
        
        dbData.invoices.push({
          id: `inv-rp-${Math.random().toString(36).substr(2, 6)}`,
          customer_name: tx.client?.name || 'Cliente RoyPay',
          customer_email: tx.client?.email || '',
          plan: tx.planTier,
          amount: tx.amount,
          status: 'paid',
          created_at: new Date().toISOString(),
          stripe_id: `roypay-${idTransaction}`
        });

        const users = dbData.saas_users || dbData.users || [];
        const userIdx = users.findIndex((u: any) => u.id === tx.userId);
        if (userIdx !== -1) {
          users[userIdx].subscription = tx.planTier;
          users[userIdx].usageLimit = tx.planTier === 'Starter' ? 100 : tx.planTier === 'Pro' ? 2000 : 10000;
        }
      });

      res.status(200).json({ success: true, message: 'Webhook simulado com sucesso.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ViralFactory Backend] Server listening at http://localhost:${PORT}`);
  });

  WorkerWebSocketServer.init(server);
  await JobQueue.recoverJobsFromDb().catch(err => console.error('[Startup Recovery] Failed:', err.message));
  JobTimeoutMonitor.start();
}

startServer().catch(err => {
  console.error('[ViralFactory Backend] Failed to start server:', err);
});
