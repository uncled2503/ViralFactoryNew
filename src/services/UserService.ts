/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { User } from '../types';
import { UserModel } from './schema';

export class UserService {
  private static TABLE = 'saas_users';

  /**
   * Fetches a SaaS User by ID from the persistence layer
   */
  static async getUser(userId: string): Promise<User | null> {
    try {
      const data = await db.findOne<UserModel>(this.TABLE, { id: userId });
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        company: data.company,
        role: data.role as any,
        avatarUrl: data.avatar_url,
        subscription: data.subscription as any,
        status: data.status as any,
        usageCurrent: data.usage_current,
        usageLimit: data.usage_limit,
        storageUsedMB: data.storage_used_mb,
        templatesUsed: data.templates_used,
        projectsActive: data.projects_active,
        subscriptionDetails: data.subscription_details,
      };
    } catch (err) {
      console.error('UserService.getUser failed:', err);
      return null;
    }
  }

  /**
   * Fetches a user by email (e.g., for login flows)
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const data = await db.findMany<UserModel>(this.TABLE, { email: email.toLowerCase().trim() }, { limit: 1 });
      if (!data || data.length === 0) return null;

      const matched = data[0];
      return {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        company: matched.company,
        role: matched.role as any,
        avatarUrl: matched.avatar_url,
        subscription: matched.subscription as any,
        status: matched.status as any,
        usageCurrent: matched.usage_current,
        usageLimit: matched.usage_limit,
        storageUsedMB: matched.storage_used_mb,
        templatesUsed: matched.templates_used,
        projectsActive: matched.projects_active,
        subscriptionDetails: matched.subscription_details,
      };
    } catch (err) {
      console.error('UserService.getUserByEmail failed:', err);
      return null;
    }
  }

  /**
   * Creates or updates a SaaS User record
   */
  static async upsertUser(user: User): Promise<boolean> {
    try {
      const modelData: UserModel = {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        avatar_url: user.avatarUrl,
        subscription: user.subscription,
        status: user.status,
        usage_current: user.usageCurrent,
        usage_limit: user.usageLimit,
        storage_used_mb: user.storageUsedMB,
        templates_used: user.templatesUsed,
        projects_active: user.projectsActive,
        subscription_details: user.subscriptionDetails || null,
      };

      const result = await db.upsert<UserModel>(this.TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('UserService.upsertUser failed:', err);
      return false;
    }
  }
}
