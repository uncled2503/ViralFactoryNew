import { AdminRepository } from '../repositories/AdminRepository';

export class AdminService {
  static async getDashboardSummary() {
    const users = await AdminRepository.getUsers();
    const jobs = await AdminRepository.getJobs();
    const workers = await AdminRepository.getWorkers();
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
    return AdminRepository.getWorkers();
  }

  static async getStorageStats() {
    const stats = await AdminRepository.getStorageStats();
    return {
      totalSizeMB: stats.totalSizeMB,
      totalSizeGB: (stats.totalSizeMB / 1024).toFixed(2),
      filesCount: stats.filesCount,
      configured: true,
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

  static async getSupportTickets() {
    return AdminRepository.getSupportTickets();
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
