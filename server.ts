import * as dotenv from "dotenv";

const result = dotenv.config();

console.log("DOTENV:", result);
console.log("CWD:", process.cwd());
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("VITE_SUPABASE_URL =", process.env.VITE_SUPABASE_URL);
console.log("ENV FILE =", result.parsed);

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { StorageManager } from "./server/render/Storage";
import { JobQueue } from "./server/render/JobQueue";
import { RenderWorker } from "./server/render/Worker";
import { adminRouter } from "./server/routes/admin";
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
  
  // Admin Panel API Routes
  app.use('/api/admin', adminRouter);
  
  // Get all available export presets
  app.get('/api/render/presets', (req, res) => {
    try {
      const { ExportPresetManager } = require('./server/render/ExportPresetManager');
      res.json(ExportPresetManager.getAllPresets());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch export presets' });
    }
  });

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

  // --- RoyPay API Integration Endpoints ---
  const TRANSACTIONS_FILE = path.join(process.cwd(), 'public', 'storage', 'roypay_transactions.json');

  const initTransactionsFile = () => {
    const parent = path.dirname(TRANSACTIONS_FILE);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify({}), 'utf8');
    }
  };

  initTransactionsFile();

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
      
      initTransactionsFile();
      const txData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
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
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txData, null, 2), 'utf8');

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
  app.get('/api/payments/roypay/status/:idTransaction', (req, res) => {
    try {
      const { idTransaction } = req.params;
      initTransactionsFile();
      const txData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
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
  app.post('/api/payments/roypay/webhook', (req, res) => {
    try {
      console.log('[RoyPay Webhook] Received webhook payload:', req.body);
      const { idTransaction, status } = req.body;

      if (!idTransaction) {
        res.status(400).json({ error: 'idTransaction é obrigatório.' });
        return;
      }

      initTransactionsFile();
      const txData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      const tx = txData[idTransaction];

      if (!tx) {
        console.warn(`[RoyPay Webhook] Transaction ${idTransaction} not found locally.`);
        res.status(200).json(200);
        return;
      }

      if (status === 'paid') {
        tx.status = 'paid';
        tx.paidAt = new Date().toISOString();
        txData[idTransaction] = tx;
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txData, null, 2), 'utf8');
        console.log(`[RoyPay Webhook] Transaction ${idTransaction} set to paid successfully!`);

        const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
        if (fs.existsSync(dbPath)) {
          try {
            const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
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

            if (dbData.users) {
              const userIdx = dbData.users.findIndex((u: any) => u.id === tx.userId);
              if (userIdx !== -1) {
                dbData.users[userIdx].subscription = tx.planTier;
                dbData.users[userIdx].usage_limit = tx.planTier === 'Starter' ? 100 : tx.planTier === 'Pro' ? 2000 : 10000;
              }
            }

            fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
            console.log('[RoyPay Webhook] Updated server db.json invoices and users successfully!');
          } catch (dbErr) {
            console.error('[RoyPay Webhook] Failed to update server db.json:', dbErr);
          }
        }
      }

      res.status(200).json(200);
    } catch (err: any) {
      console.error('[RoyPay Webhook] Webhook handler error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. POST /api/payments/roypay/simulate-webhook
  app.post('/api/payments/roypay/simulate-webhook', (req, res) => {
    try {
      const { idTransaction } = req.body;
      if (!idTransaction) {
        res.status(400).json({ error: 'idTransaction é obrigatório para simulação.' });
        return;
      }

      console.log(`[RoyPay Simulator] Simulating paid webhook for transaction: ${idTransaction}`);

      initTransactionsFile();
      const txData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      const tx = txData[idTransaction];

      if (!tx) {
        res.status(404).json({ error: 'Transação não encontrada para simulação.' });
        return;
      }

      tx.status = 'paid';
      tx.paidAt = new Date().toISOString();
      txData[idTransaction] = tx;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txData, null, 2), 'utf8');

      const dbPath = path.join(process.cwd(), 'public', 'storage', 'db.json');
      if (fs.existsSync(dbPath)) {
        try {
          const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
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

          if (dbData.users) {
            const userIdx = dbData.users.findIndex((u: any) => u.id === tx.userId);
            if (userIdx !== -1) {
              dbData.users[userIdx].subscription = tx.planTier;
              dbData.users[userIdx].usage_limit = tx.planTier === 'Starter' ? 100 : tx.planTier === 'Pro' ? 2000 : 10000;
            }
          }

          fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
        } catch (dbErr) {
          console.error('[RoyPay Simulator] Failed to update server db.json:', dbErr);
        }
      }

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ViralFactory Backend] Server listening at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[ViralFactory Backend] Failed to start server:', err);
});
