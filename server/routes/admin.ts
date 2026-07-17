import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminValidators } from '../validators/AdminValidators';
import { adminAuthMiddleware } from '../middlewares/adminAuth';

const router = Router();

// Apply admin authentication middleware to all admin routes
router.use(adminAuthMiddleware);

// Admin Dashboard Summary
router.get('/dashboard', AdminController.getDashboard);

// SaaS Users Management
router.get('/users', AdminController.getUsers);
router.patch('/users/:id', AdminValidators.validateUpdateUser, AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Render Farm Management (Jobs & Workers)
router.get('/jobs', AdminController.getJobs);
router.get('/workers', AdminController.getWorkers);

// Auto Scaling Management
router.get('/autoscaling', (req, res) => {
  const { AutoScalingService } = require('../services/AutoScalingService');
  res.json(AutoScalingService.getMetrics());
});

router.post('/autoscaling/config', (req, res) => {
  const { AutoScalingService } = require('../services/AutoScalingService');
  AutoScalingService.updateConfig(req.body);
  res.json({ success: true, config: AutoScalingService.getConfig() });
});

router.post('/autoscaling/scale-up', (req, res) => {
  const { AutoScalingService } = require('../services/AutoScalingService');
  const success = AutoScalingService.scaleUp(0, 100);
  res.json({ success, message: success ? 'Scale up forçado com sucesso.' : 'Limite de workers atingido.' });
});

router.post('/autoscaling/scale-down', (req, res) => {
  const { AutoScalingService } = require('../services/AutoScalingService');
  const success = AutoScalingService.scaleDown();
  res.json({ success, message: success ? 'Scale down forçado com sucesso.' : 'Nenhum worker elástico ocioso para desligar.' });
});

router.post('/autoscaling/clear', (req, res) => {
  const { AutoScalingService } = require('../services/AutoScalingService');
  AutoScalingService.clearHistory();
  res.json({ success: true });
});

// Storage Management
router.get('/storage', AdminController.getStorage);

// Payment & Billing Management
router.get('/payments', AdminController.getPayments);

// Coupons Management
router.get('/coupons', AdminController.getCoupons);

// Customer Support Tickets
router.get('/support', AdminController.getSupport);

// System Settings Management
router.get('/settings', AdminController.getSettings);
router.post('/settings', AdminValidators.validateSetting, AdminController.saveSetting);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Redis Performance Metrics & Status Control
router.get('/redis', (req, res) => {
  const { RedisService } = require('../services/RedisService');
  res.json(RedisService.healthCheck());
});

router.post('/redis/reconnect', (req, res) => {
  const { RedisService } = require('../services/RedisService');
  RedisService.forceReconnect();
  res.json({ success: true, message: 'Reconexão forçada com sucesso.' });
});

export const adminRouter = router;
