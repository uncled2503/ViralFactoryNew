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

export const adminRouter = router;
