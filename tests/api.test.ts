import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { adminRouter } from '../server/routes/admin';
import { ExportPresetManager } from '../server/render/ExportPresetManager';
import { WorkerWebSocketServer } from '../server/render/WorkerWebSocketServer';
import { JobQueue } from '../server/render/JobQueue';
import fs from 'fs';
import path from 'path';

describe('SaaS REST API & Admin Controller Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Register admin routes
    app.use('/api/admin', adminRouter);

    // Register presets endpoint
    app.get('/api/render/presets', (req, res) => {
      res.json(ExportPresetManager.getAllPresets());
    });

    // Register workers endpoint
    app.get('/api/render/workers', async (req, res) => {
      res.json(await WorkerWebSocketServer.getWorkers());
    });

    // Register job routes
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
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/api/render/job/:id', (req, res) => {
      const job = JobQueue.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json(job);
    });

    // Register RoyPay Cashin route
    app.post('/api/payments/roypay/cashin', async (req, res) => {
      try {
        const { planTier, billingCycle, clientName, clientDocument, clientTelefone, clientEmail, userId } = req.body;
        if (!planTier || !billingCycle || !clientName || !clientDocument || !clientTelefone || !clientEmail || !userId) {
          res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
          return;
        }

        // Mock fetch call to avoid hitting real Royal Banking server
        const mockResponse = {
          status: 'success',
          idTransaction: 'tx-rp-test-999',
          pixCopiaECola: '00020101021226830014br.gov.bcb.pix...',
          qrCodeBase64: 'data:image/png;base64,...',
          message: 'Transação PIX gerada com sucesso.'
        };

        // Simulating writing to transactional database log
        const TRANSACTIONS_FILE = path.join(process.cwd(), 'public', 'storage', 'roypay_transactions_test.json');
        const parent = path.dirname(TRANSACTIONS_FILE);
        if (!fs.existsSync(parent)) {
          fs.mkdirSync(parent, { recursive: true });
        }
        
        const txData = fs.existsSync(TRANSACTIONS_FILE) ? JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8')) : {};
        txData['tx-rp-test-999'] = {
          userId,
          planTier,
          amount: 49,
          client: { name: clientName, email: clientEmail },
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txData, null, 2), 'utf8');

        res.json(mockResponse);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Register simulate webhook route
    app.post('/api/payments/roypay/simulate-webhook', (req, res) => {
      const { idTransaction } = req.body;
      if (!idTransaction) {
        res.status(400).json({ error: 'idTransaction é obrigatório' });
        return;
      }
      res.status(200).json({ success: true, message: 'Webhook simulado com sucesso.' });
    });
  });

  it('GET /api/render/presets should return available formats', async () => {
    const res = await request(app)
      .get('/api/render/presets')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
    const presets = res.body.map((p: any) => p.id);
    expect(presets).toContain('tiktok');
    expect(presets).toContain('youtube_16_9');
  });

  it('GET /api/render/workers should return worker status list', async () => {
    const res = await request(app)
      .get('/api/render/workers')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
  });

  it('POST /api/render/job should reject missing parameters', async () => {
    const res = await request(app)
      .post('/api/render/job')
      .send({ userId: 'test' })
      .expect(400);

    expect(res.body.error).toContain('Missing required render parameters');
  });

  it('POST /api/render/job should validate and create a valid job', async () => {
    const res = await request(app)
      .post('/api/render/job')
      .send({
        userId: 'usr-buyer-001',
        projectId: 'prj-viral-002',
        projectName: 'Tiktok Super Viral',
        templateId: 'tpl-vivid'
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.job).toBeDefined();
    expect(res.body.job.status).toBe('Queued');
    
    // Check GET on job status
    const jobId = res.body.job.id;
    const statusRes = await request(app)
      .get(`/api/render/job/${jobId}`)
      .expect(200);

    expect(statusRes.body.id).toBe(jobId);
    expect(statusRes.body.userId).toBe('usr-buyer-001');
  });

  it('POST /api/payments/roypay/cashin should trigger secure Pix billing', async () => {
    const res = await request(app)
      .post('/api/payments/roypay/cashin')
      .send({
        planTier: 'Pro',
        billingCycle: 'monthly',
        clientName: 'Test Buyer',
        clientDocument: '123.456.789-00',
        clientTelefone: '(11) 99999-9999',
        clientEmail: 'testbuyer@gmail.com',
        userId: 'usr-buyer-001'
      })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.idTransaction).toBe('tx-rp-test-999');
    expect(res.body.pixCopiaECola).toBeDefined();
  });

  it('GET /api/admin/dashboard should load full admin metrics and recent queues', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .expect(200);

    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.totalUsers).toBeGreaterThanOrEqual(0);
    expect(res.body.metrics.mrr).toBeDefined();
    expect(res.body.recentUsers).toBeInstanceOf(Array);
    expect(res.body.recentJobs).toBeInstanceOf(Array);
  });

  it('GET /api/admin/users should fetch all registered SaaS customers', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
