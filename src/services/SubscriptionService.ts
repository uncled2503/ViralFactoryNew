/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { UserSubscription, PlanTier } from '../types';
import { SubscriptionModel } from './schema';
import { PLAN_LIMITS_MAP, PLANS_DETAILS } from '../config/plans';

export class SubscriptionService {
  private static SUBSCRIPTIONS_TABLE = 'subscriptions';
  private static PLANS_TABLE = 'plans';

  /**
   * Fetches the subscription details of a user
   */
  static async getSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const data = await db.findOne<SubscriptionModel>(this.SUBSCRIPTIONS_TABLE, { user_id: userId });
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        tier: data.tier as PlanTier,
        status: data.status as any,
        billingCycle: data.billing_cycle as any,
        price: data.price,
        startDate: data.start_date,
        endDate: data.end_date,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        autoRenew: data.auto_renew,
      };
    } catch (err) {
      console.error('SubscriptionService.getSubscription failed:', err);
      return null;
    }
  }

  /**
   * Creates or updates a SaaS User's active subscription details
   */
  static async upsertSubscription(userId: string, sub: UserSubscription): Promise<boolean> {
    try {
      const modelData: SubscriptionModel = {
        id: sub.id,
        user_id: userId,
        tier: sub.tier,
        status: sub.status,
        billing_cycle: sub.billingCycle,
        price: sub.price,
        start_date: sub.startDate,
        end_date: sub.endDate,
        cancel_at_period_end: sub.cancelAtPeriodEnd,
        auto_renew: sub.autoRenew,
      };

      const result = await db.upsert<SubscriptionModel>(this.SUBSCRIPTIONS_TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('SubscriptionService.upsertSubscription failed:', err);
      return false;
    }
  }

  /**
   * Mock fetching active plans. Prepared to load from the "plans" table in the future.
   */
  static async getPlans(): Promise<any[]> {
    try {
      const plansList = await db.findMany(this.PLANS_TABLE);
      if (plansList && plansList.length > 0) {
        return plansList;
      }
    } catch (err) {
      console.warn('Plans table missing/offline, falling back to static config.');
    }
    // Static fallback
    return PLANS_DETAILS;
  }
}
