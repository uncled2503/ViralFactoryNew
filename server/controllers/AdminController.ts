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

  static async resetUserPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'E-mail do usuário é obrigatório.' });
        return;
      }
      const adminName = (req as any).adminName || 'SaaS Admin';
      // SECURITY: never derive the redirect from client-supplied Host/X-Forwarded-Host headers
      // — that would let a forged header point a real password-reset email at an
      // attacker-controlled domain. APP_URL is the only trusted source for this.
      const baseUrl = process.env.APP_URL;
      if (!baseUrl) {
        res.status(500).json({ error: 'APP_URL não está configurado neste ambiente. Reset de senha indisponível.' });
        return;
      }

      await AdminService.resetUserPassword(email, baseUrl, adminName);
      res.json({ success: true, message: 'Link de redefinição de senha enviado.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to trigger password reset' });
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

  static async sweepStorage(req: Request, res: Response) {
    try {
      const adminName = (req as any).adminName || 'SaaS Admin';
      const result = await AdminService.sweepStorageCache(adminName);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sweep storage cache' });
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

  static async refundInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminName = (req as any).adminName || 'SaaS Admin';
      const invoice = await AdminService.markInvoiceRefunded(id, adminName);
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      res.json({ success: true, invoice });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark invoice as refunded' });
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

  static async createCoupon(req: Request, res: Response) {
    try {
      const adminName = (req as any).adminName || 'SaaS Admin';
      const coupon = await AdminService.createCoupon(req.body, adminName);
      res.json({ success: true, coupon });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create coupon' });
    }
  }

  static async deactivateCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminName = (req as any).adminName || 'SaaS Admin';
      const success = await AdminService.deactivateCoupon(id, adminName);
      if (!success) {
        res.status(404).json({ error: 'Coupon not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to deactivate coupon' });
    }
  }

  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await AdminService.getPlans();
      res.json(plans);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch plans' });
    }
  }

  static async createPlan(req: Request, res: Response) {
    try {
      const adminName = (req as any).adminName || 'SaaS Admin';
      const plan = await AdminService.createPlan(req.body, adminName);
      res.json({ success: true, plan });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create plan' });
    }
  }

  static async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminName = (req as any).adminName || 'SaaS Admin';
      const plan = await AdminService.updatePlan(id, req.body, adminName);
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      res.json({ success: true, plan });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update plan' });
    }
  }

  static async archivePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminName = (req as any).adminName || 'SaaS Admin';
      const success = await AdminService.archivePlan(id, adminName);
      if (!success) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to archive plan' });
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

  static async replySupport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ error: 'A mensagem de resposta é obrigatória.' });
        return;
      }
      const adminName = (req as any).adminName || 'SaaS Admin';
      const ticket = await AdminService.replyToSupportTicket(id, message, adminName);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reply to ticket' });
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
