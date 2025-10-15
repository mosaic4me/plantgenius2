import { config } from '@/utils/config';
import { logger } from '@/utils/logger';
import { PaymentError } from '@/types/errors';

export interface PaymentInitiationData {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  planType: 'basic' | 'premium';
  billingCycle: 'monthly' | 'yearly';
}

export interface PaymentVerificationResult {
  success: boolean;
  reference: string;
  amount: number;
  paidAt?: string;
  channel?: string;
}

class PaystackService {
  private readonly publicKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor() {
    this.publicKey = config.paystackPublicKey;

    if (!this.publicKey) {
      logger.warn('Paystack public key not configured');
    }
  }

  /**
   * Generates a unique payment reference
   */
  generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `PAY_${timestamp}_${random}`;
  }

  /**
   * Initiates a payment transaction
   * This method prepares payment data for the Paystack WebView
   */
  async initiatePayment(data: PaymentInitiationData): Promise<{
    reference: string;
    publicKey: string;
    email: string;
    amount: number;
  }> {
    try {
      if (!this.publicKey || this.publicKey.includes('placeholder')) {
        throw new PaymentError(
          'Payment service not configured. Please contact support.',
          undefined
        );
      }

      const reference = this.generateReference();

      logger.info('Payment initiated', {
        reference,
        email: data.email,
        amount: data.amount,
        planType: data.planType,
        billingCycle: data.billingCycle,
      });

      return {
        reference,
        publicKey: this.publicKey,
        email: data.email,
        amount: data.amount,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error initiating payment', err, {
        email: data.email,
        amount: data.amount,
      });
      throw error;
    }
  }

  /**
   * Verifies a payment transaction via backend API
   * SECURITY FIX: Now uses server-side verification instead of fake client-side check
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      logger.info('Verifying payment via backend', { reference });

      // Call backend API for secure server-side verification
      const response = await fetch(`${config.mongodbApiUrl}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Verification failed' }));
        throw new Error(error.message || 'Payment verification failed');
      }

      const result = await response.json();

      logger.info('Payment verified successfully', { reference, success: result.success });

      return {
        success: result.success,
        reference: result.reference,
        amount: result.amount,
        paidAt: result.paidAt,
        channel: result.channel,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error verifying payment', err, { reference });
      throw new PaymentError('Payment verification failed', reference);
    }
  }

  /**
   * Validates payment configuration
   */
  isConfigured(): boolean {
    return !!this.publicKey && !this.publicKey.includes('placeholder');
  }
}

export const paystackService = new PaystackService();
