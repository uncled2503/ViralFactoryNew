import { AdminRepository } from '../repositories/AdminRepository';
import { WorkerWebSocketServer } from '../render/WorkerWebSocketServer';
import { supabaseAdmin, isSupabaseConfigured } from '../database/supabaseClient';

export class AdminService {
  static async getDashboardSummary() {
    const users = await AdminRepository.getUsers();
    const jobs = await AdminRepository.getJobs();
    const workers = await WorkerWebSocketServer.getWorkers();
    const invoices = await AdminRepository.getInvoices();
    const storage = await AdminRepository.getStorageStats();

    // Calculate MRR / ARR from active users subscriptions
    const activeUsers = users.filter((u: any) => u.status === 'active');
    let mrr = 0;
    activeUsers.forEach((u: any) => {
      // In real-world, we map the subscription details
      const subPrice = Number(u.subscriptionDetails?.price || (u.subscription_tier === 'Pro' ? 49 : u.subscription_tier === 'Business' ? 149 : 0));
      mrr += subPrice;
    });

    const activeJobsCount = jobs.filter((j: any) => j.status === 'queued' || j.status === 'processing' || j.status === 'preparing').length;
    const completedJobsCount = jobs.filter((j: any) => j.status === 'completed').length;
    const failedJobsCount = jobs.filter((j: any) => j.status === 'failed').length;

    const onlineWorkersCount = workers.filter((w: any) => w.status === 'online' || w.status === 'idle' || w.status === 'busy').length;

    return {
      metrics: {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        suspendedUsers: users.filter((u: any) => u.status === 'suspended').length,
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        totalStorageGB: (storage.totalSizeMB / 1024).toFixed(2),
        activeJobs: activeJobsCount,
        completedJobs: completedJobsCount,
        failedJobs: failedJobsCount,
        onlineWorkers: onlineWorkersCount,
      },
      recentUsers: users.slice(0, 5),
      recentJobs: jobs.slice(0, 5),
    };
  }

  static async getUsers() {
    return AdminRepository.getUsers();
  }

  static async updateUser(id: string, updateData: any, adminName: string) {
    const originalUser = (await AdminRepository.getUsers()).find((u: any) => u.id === id);
    const updated = await AdminRepository.updateUser(id, updateData);
    if (updated) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `UPDATE_USER_${id}`,
        target_user: originalUser?.name || id,
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return updated;
  }

  /**
   * Triggers Supabase Auth's own password-reset email for a user, via the admin panel. Uses the
   * same flow as the user-facing "forgot password" screen (see recoverPassword in AppContext) —
   * no separate email service needed, Supabase sends the message itself.
   */
  static async resetUserPassword(email: string, baseUrl: string, adminName: string) {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      throw new Error('Supabase não está configurado neste ambiente. Reset de senha indisponível.');
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/recovery`,
    });
    if (error) {
      throw new Error(error.message);
    }
    await AdminRepository.createAuditLog({
      admin_name: adminName,
      action: `ADMIN_TRIGGERED_PASSWORD_RESET`,
      target_user: email,
      ip: '127.0.0.1',
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  static async deleteUser(id: string, adminName: string) {
    const originalUser = (await AdminRepository.getUsers()).find((u: any) => u.id === id);
    const success = await AdminRepository.deleteUser(id);
    if (success) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `DELETE_USER_${id}`,
        target_user: originalUser?.name || id,
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return success;
  }

  static async getJobs() {
    return AdminRepository.getJobs();
  }

  static async getWorkers() {
    return WorkerWebSocketServer.getWorkers();
  }

  static async getStorageStats() {
    const stats = await AdminRepository.getStorageStats();
    const directories = await AdminRepository.getStorageDirectories();
    return {
      stats: {
        totalSizeMB: stats.totalSizeMB,
        totalSizeGB: (stats.totalSizeMB / 1024).toFixed(2),
        filesCount: stats.filesCount,
        cacheSizeGB: (stats.cacheSizeMB / 1024).toFixed(2),
        // "Orphan" here means real, safely-identifiable temp render cache files (never final
        // outputs or user uploads) — see AdminRepository.sweepTempCache for why we don't attempt
        // to auto-delete objects out of Supabase Storage buckets.
        orphanCount: stats.cacheFilesCount,
        configured: true,
      },
      directories,
    };
  }

  static async getPayments() {
    const invoices = await AdminRepository.getInvoices();
    const totalAmount = invoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
    return {
      invoices,
      totalRevenue: totalAmount,
      currency: 'USD',
    };
  }

  static async getCoupons() {
    return AdminRepository.getCoupons();
  }

  static async createCoupon(couponData: any, adminName: string) {
    const coupon = await AdminRepository.createCoupon(couponData);
    await AdminRepository.createAuditLog({
      admin_name: adminName,
      action: `CREATE_COUPON_${coupon.code}`,
      target_user: 'SYSTEM',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });
    return coupon;
  }

  static async deactivateCoupon(id: string, adminName: string) {
    const success = await AdminRepository.deactivateCoupon(id);
    if (success) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `DEACTIVATE_COUPON_${id}`,
        target_user: 'SYSTEM',
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return success;
  }

  static async getPlans() {
    return AdminRepository.getPlans();
  }

  static async createPlan(planData: any, adminName: string) {
    const plan = await AdminRepository.createPlan(planData);
    await AdminRepository.createAuditLog({
      admin_name: adminName,
      action: `CREATE_PLAN_${plan.tier}`,
      target_user: 'SYSTEM',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });
    return plan;
  }

  static async updatePlan(id: string, updates: any, adminName: string) {
    const plan = await AdminRepository.updatePlan(id, updates);
    if (plan) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `UPDATE_PLAN_${id}`,
        target_user: 'SYSTEM',
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return plan;
  }

  static async archivePlan(id: string, adminName: string) {
    const success = await AdminRepository.archivePlan(id);
    if (success) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `ARCHIVE_PLAN_${id}`,
        target_user: 'SYSTEM',
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return success;
  }

  static async getSupportTickets() {
    const tickets = await AdminRepository.getSupportTickets();
    // No SMTP/email-queue service is wired up in this project yet, so the queue is honestly
    // reported as empty rather than fabricated — see support ticket reply below for the one
    // outbound email this panel actually sends (password resets).
    return { tickets, smtpQueue: [] };
  }

  static async replyToSupportTicket(id: string, replyMessage: string, adminName: string) {
    const ticket = await AdminRepository.replyToSupportTicket(id, replyMessage);
    if (ticket) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `REPLY_SUPPORT_TICKET_${id}`,
        target_user: ticket.customerName || ticket.customer_name || id,
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return ticket;
  }

  static async markInvoiceRefunded(id: string, adminName: string) {
    const invoice = await AdminRepository.markInvoiceRefunded(id);
    if (invoice) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `MARK_INVOICE_REFUNDED_${id}`,
        target_user: invoice.customerName || invoice.customer_name || id,
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return invoice;
  }

  static async sweepStorageCache(adminName: string) {
    const result = await AdminRepository.sweepTempCache();
    await AdminRepository.createAuditLog({
      admin_name: adminName,
      action: `SWEEP_STORAGE_CACHE`,
      target_user: 'SYSTEM',
      ip: '127.0.0.1',
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  static async getAuditLogs() {
    return AdminRepository.getAuditLogs();
  }

  static async getSettings() {
    return AdminRepository.getSettings();
  }

  static async saveSetting(key: string, value: any, description: string, adminName: string) {
    const setting = await AdminRepository.updateSetting(key, value, description);
    if (setting) {
      await AdminRepository.createAuditLog({
        admin_name: adminName,
        action: `UPDATE_SETTING_${key}`,
        target_user: 'SYSTEM',
        ip: '127.0.0.1',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });
    }
    return setting;
  }
}
