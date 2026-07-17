import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { StorageManager } from './server/render/Storage';
import { JobQueue } from './server/render/JobQueue';
import { WorkerWebSocketServer } from './server/render/WorkerWebSocketServer';
import { adminRouter } from './server/routes/admin';
import { publicApiLimiter, adminApiLimiter } from './server/middlewares/rateLimiter';
import { JobTimeoutMonitor } from './server/render/JobTimeoutMonitor';
import { RedisService } from './server/services/RedisService';
import { SupabaseStorageService } from './server/services/SupabaseStorageService';
import { ExportPresetManager } from './server/render/ExportPresetManager';
import { SupabaseDbService } from './server/database/SupabaseDbService';
import { LocalDbMutex } from './server/database/LocalDbMutex';

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

  // Test Render Engine endpoint
  app.post('/api/admin/test-render', async (req, res) => {
    try {
      const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
      const parentDir = path.dirname(dbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Read or init local db
      const dbData = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : {};
      if (!dbData.projects) dbData.projects = [];
      if (!dbData.templates) dbData.templates = [];

      const testUserId = req.body.userId || 'usr-admin-test';
      const testProjectId = 'prj-test-engine';
      const testTemplateId = 'tpl-test-engine';

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

      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

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

  // Sync server database from/to client localStorage states when requested
  app.get('/api/db/sync', async (req, res) => {
    try {
      const dbData = await LocalDbMutex.loadDb();
      res.json(dbData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/db/sync', async (req, res) => {
    try {
      await LocalDbMutex.runLocked((dbData) => {
        Object.assign(dbData, req.body);
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
          "name": clientName,
          "document": clientDocument.replace(/\D/g, ''),
          "telefone": clientTelefone.replace(/\D/g, ''),
          "email": clientEmail
        },
        "callbackUrl": callbackUrl
      };

      console.log('[RoyPay Integration] Requesting Cash In:', requestPayload);

      const royPayResponse = await fetch('https://api.royalbanking.com.br/v1/gateway/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!royPayResponse.ok) {
        const errorText = await royPayResponse.text();
        console.error('[RoyPay Integration] Gateway error:', errorText);
        res.status(royPayResponse.status).json({ 
          error: `Erro ao gerar Pix no RoyPay: status ${royPayResponse.status}`,
          details: errorText
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
  JobTimeoutMonitor.start();
}

startServer().catch(err => {
  console.error('[ViralFactory Backend] Failed to start server:', err);
});
