import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';

export class AdminController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const summary = await AdminService.getDashboardSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dashboard summary' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const users = await AdminService.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch users' });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const adminName = (req as any).adminName || 'SaaS Admin';
      
      const updated = await AdminService.updateUser(id, updateData, adminName);
      if (!updated) {
        res.status(404).json({ error: 'User not found or failed to update' });
        return;
      }
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update user' });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminName = (req as any).adminName || 'SaaS Admin';

      const success = await AdminService.deleteUser(id, adminName);
      if (!success) {
        res.status(404).json({ error: 'User not found or failed to delete' });
        return;
      }
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  }

  static async getJobs(req: Request, res: Response) {
    try {
      const jobs = await AdminService.getJobs();
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch jobs' });
    }
  }

  static async getWorkers(req: Request, res: Response) {
    try {
      const workers = await AdminService.getWorkers();
      res.json(workers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch workers' });
    }
  }

  static async getStorage(req: Request, res: Response) {
    try {
      const storage = await AdminService.getStorageStats();
      res.json(storage);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch storage stats' });
    }
  }

  static async getPayments(req: Request, res: Response) {
    try {
      const payments = await AdminService.getPayments();
      res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch payment records' });
    }
  }

  static async getCoupons(req: Request, res: Response) {
    try {
      const coupons = await AdminService.getCoupons();
      res.json(coupons);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
    }
  }

  static async getSupport(req: Request, res: Response) {
    try {
      const support = await AdminService.getSupportTickets();
      res.json(support);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch support tickets' });
    }
  }

  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await AdminService.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch system settings' });
    }
  }

  static async saveSetting(req: Request, res: Response) {
    try {
      const { key, value, description } = req.body;
      const adminName = (req as any).adminName || 'SaaS Admin';

      if (!key) {
        res.status(400).json({ error: 'Missing setting key' });
        return;
      }

      const updated = await AdminService.saveSetting(key, value, description || '', adminName);
      res.json({ success: true, setting: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save system setting' });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const logs = await AdminService.getAuditLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
    }
  }
}
