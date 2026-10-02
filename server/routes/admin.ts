import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AdminValidators } from '../validators/AdminValidators';
import { adminAuthMiddleware } from '../middlewares/adminAuth';
import { AutoScalingService } from '../services/AutoScalingService';
import { RedisService } from '../services/RedisService';

const router = Router();

// Apply admin authentication middleware to all admin routes
router.use(adminAuthMiddleware);

// Admin Dashboard Summary
router.get('/dashboard', AdminController.getDashboard);

// SaaS Users Management
router.get('/users', AdminController.getUsers);
router.patch('/users/:id', AdminValidators.validateUpdateUser, AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/users/reset-password', AdminController.resetUserPassword);

// Render Farm Management (Jobs & Workers)
router.get('/jobs', AdminController.getJobs);
router.get('/workers', AdminController.getWorkers);

// Auto Scaling Management
router.get('/autoscaling', (req, res) => {
  res.json(AutoScalingService.getMetrics());
});

router.post('/autoscaling/config', (req, res) => {
  // Unlike every other admin mutation route, this previously passed req.body straight through
  // with no type/range checks — a bad value (negative cooldown, non-numeric maxWorkers) would
  // silently corrupt the autoscaler's own comparisons indefinitely.
  const body = req.body || {};
  const errors: string[] = [];
  const validated: Record<string, any> = {};

  const numericField = (key: string, min: number, max: number) => {
    if (body[key] === undefined) return;
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < min || n > max) {
      errors.push(`${key} deve ser um número entre ${min} e ${max}.`);
      return;
    }
    validated[key] = n;
  };

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      errors.push('enabled deve ser true ou false.');
    } else {
      validated.enabled = body.enabled;
    }
  }
  numericField('minWorkers', 0, 1000);
  numericField('maxWorkers', 0, 1000);
  numericField('scaleUpThreshold', 0, 100000);
  numericField('scaleDownThreshold', 0, 100000);
  numericField('cooldownPeriod', 0, 86400);

  if (
    validated.minWorkers !== undefined &&
    validated.maxWorkers !== undefined &&
    validated.minWorkers > validated.maxWorkers
  ) {
    errors.push('minWorkers não pode ser maior que maxWorkers.');
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(' ') });
    return;
  }

  AutoScalingService.updateConfig(validated);
  res.json({ success: true, config: AutoScalingService.getConfig() });
});

router.post('/autoscaling/scale-up', (req, res) => {
  const success = AutoScalingService.scaleUp(0, 100);
  res.json({ success, message: success ? 'Scale up forçado com sucesso.' : 'Limite de workers atingido.' });
});

router.post('/autoscaling/scale-down', (req, res) => {
  const success = AutoScalingService.scaleDown();
  res.json({ success, message: success ? 'Scale down forçado com sucesso.' : 'Nenhum worker elástico ocioso para desligar.' });
});

router.post('/autoscaling/clear', (req, res) => {
  AutoScalingService.clearHistory();
  res.json({ success: true });
});

// Storage Management
router.get('/storage', AdminController.getStorage);
router.post('/storage/sweep', AdminController.sweepStorage);

// Payment & Billing Management
router.get('/payments', AdminController.getPayments);
router.post('/payments/:id/refund', AdminController.refundInvoice);

// Coupons Management
router.get('/coupons', AdminController.getCoupons);
router.post('/coupons', AdminValidators.validateCoupon, AdminController.createCoupon);
router.patch('/coupons/:id/deactivate', AdminController.deactivateCoupon);

// Plans Management
router.get('/plans', AdminController.getPlans);
router.post('/plans', AdminValidators.validatePlan, AdminController.createPlan);
router.patch('/plans/:id', AdminValidators.validatePlanUpdate, AdminController.updatePlan);
router.delete('/plans/:id', AdminController.archivePlan);

// Customer Support Tickets
router.get('/support', AdminController.getSupport);
router.patch('/support/:id/reply', AdminController.replySupport);

// System Settings Management
router.get('/settings', AdminController.getSettings);
router.post('/settings', AdminValidators.validateSetting, AdminController.saveSetting);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Redis Performance Metrics & Status Control
router.get('/redis', (req, res) => {
  res.json(RedisService.healthCheck());
});

router.post('/redis/reconnect', (req, res) => {
  RedisService.forceReconnect();
  res.json({ success: true, message: 'Reconexão forçada com sucesso.' });
});

export const adminRouter = router;
