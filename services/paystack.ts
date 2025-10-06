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
   * Verifies a payment transaction
   * In production, this should be done server-side for security
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      logger.info('Verifying payment', { reference });

      // NOTE: In production, payment verification MUST be done server-side
      // This client-side verification is only for demonstration
      // A malicious user could bypass client-side checks

      // For now, simulate successful verification
      // In production, you would:
      // 1. Call your backend API
      // 2. Backend verifies with Paystack using secret key
      // 3. Backend updates subscription in database
      // 4. Backend returns verification result

      logger.warn('Using client-side payment verification - NOT SECURE FOR PRODUCTION');

      return {
        success: true,
        reference,
        amount: 0,
        paidAt: new Date().toISOString(),
        channel: 'card',
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
