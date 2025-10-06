import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface SubscriptionData {
  userId: string;
  planType: 'basic' | 'premium';
  billingCycle: 'monthly' | 'yearly';
  paymentReference: string;
  amount: number;
}

export class SubscriptionService {
  /**
   * Creates a new subscription after successful payment
   */
  async createSubscription(data: SubscriptionData): Promise<void> {
    try {
      const startDate = new Date();
      const endDate = new Date();

      // Calculate end date based on billing cycle
      if (data.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: data.userId,
        plan_type: data.planType,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_reference: data.paymentReference,
      });

      if (error) {
        throw error;
      }

      logger.info('Subscription created successfully', {
        userId: data.userId,
        planType: data.planType,
        reference: data.paymentReference,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error creating subscription', err, {
        userId: data.userId,
        planType: data.planType,
      });
      throw error;
    }
  }

  /**
   * Cancels an active subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      logger.info('Subscription cancelled', { userId });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error cancelling subscription', err, { userId });
      throw error;
    }
  }

  /**
   * Checks for expired subscriptions and updates their status
   */
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('end_date', now);

      if (error) {
        throw error;
      }

      logger.info('Expired subscriptions updated');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error checking expired subscriptions', err);
    }
  }
}

export const subscriptionService = new SubscriptionService();
