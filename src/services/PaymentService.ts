/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { Invoice, Coupon } from '../types';
import { PaymentModel, CouponModel } from './schema';

export class PaymentService {
  private static INVOICES_TABLE = 'invoices';
  private static COUPONS_TABLE = 'coupons';

  /**
   * Fetches all statements or invoices associated with the SaaS subscription
   */
  static async getInvoices(userId: string): Promise<Invoice[] | null> {
    try {
      const data = await db.findMany<PaymentModel>(
        this.INVOICES_TABLE,
        { user_id: userId },
        { orderBy: 'due_date', orderAsc: false }
      );

      return data.map(inv => ({
        id: inv.id,
        subscriptionId: inv.subscription_id,
        userId: inv.user_id,
        amount: inv.amount,
        status: inv.status as any,
        dueDate: inv.due_date,
        paidAt: inv.paid_at || undefined,
        pdfUrl: inv.pdf_url || undefined,
        billingPeriodStart: inv.billing_period_start,
        billingPeriodEnd: inv.billing_period_end,
      }));
    } catch (err) {
      console.error('PaymentService.getInvoices failed:', err);
      return null;
    }
  }

  /**
   * Records or modifies a billing cycle payment record
   */
  static async upsertInvoice(userId: string, invoice: Invoice): Promise<boolean> {
    try {
      const modelData: PaymentModel = {
        id: invoice.id,
        subscription_id: invoice.subscriptionId,
        user_id: userId,
        amount: invoice.amount,
        status: invoice.status,
        due_date: invoice.dueDate,
        paid_at: invoice.paidAt || undefined,
        pdf_url: invoice.pdfUrl || undefined,
        billing_period_start: invoice.billingPeriodStart,
        billing_period_end: invoice.billingPeriodEnd,
      };

      const result = await db.upsert<PaymentModel>(this.INVOICES_TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('PaymentService.upsertInvoice failed:', err);
      return false;
    }
  }

  /**
   * Validates a discount voucher code (Coupons support)
   */
  static async applyCoupon(code: string): Promise<Coupon | null> {
    try {
      const matched = await db.findOne<CouponModel>(this.COUPONS_TABLE, { code: code.toUpperCase().trim(), active: true });
      if (!matched) return null;

      // Check expiry date if available
      if (matched.expires_at) {
        const expiry = new Date(matched.expires_at);
        if (expiry < new Date()) {
          console.warn('Coupon has expired');
          return null;
        }
      }

      return {
        id: matched.id,
        code: matched.code,
        discountType: matched.discount_type,
        discountValue: matched.discount_value,
        active: matched.active,
        expiresAt: matched.expires_at || undefined,
      };
    } catch (err) {
      console.warn('Coupons collection offline/missing:', err);
      return null;
    }
  }
}
