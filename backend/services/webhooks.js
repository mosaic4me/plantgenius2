/**
 * Webhook Handler for Paystack
 * Processes payment webhook events from Paystack
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * Verify Paystack webhook signature
 */
export function verifyPaystackSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}

/**
 * Process successful payment
 */
export async function processSuccessfulPayment(db, event) {
  const { reference, amount, customer, metadata } = event.data;

  try {
    // Find user by email
    const user = await db.collection('users').findOne({ email: customer.email });

    if (!user) {
      console.error('User not found for payment:', customer.email);
      return { success: false, error: 'User not found' };
    }

    // Determine subscription duration
    const planType = metadata?.planType || 'premium';
    const billingCycle = metadata?.billingCycle || 'monthly';

    const startDate = new Date();
    const endDate = new Date(startDate);

    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create or update subscription
    const subscription = {
      userId: user._id.toString(),
      planType,
      status: 'active',
      startDate,
      endDate,
      paymentReference: reference,
      amount: amount / 100, // Convert from kobo to naira
      billingCycle,
      updatedAt: new Date()
    };

    await db.collection('subscriptions').updateOne(
      { userId: user._id.toString(), status: 'active' },
      { $set: subscription },
      { upsert: true }
    );

    console.log('✅ Subscription created/updated for user:', user.email);

    return { success: true, subscription };
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process failed payment
 */
export async function processFailedPayment(db, event) {
  const { reference, customer } = event.data;

  try {
    console.log('⚠️ Payment failed:', reference, customer.email);

    // Log failed payment for analytics
    await db.collection('payment_failures').insertOne({
      reference,
      email: customer.email,
      reason: event.data.gateway_response || 'Unknown',
      timestamp: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging failed payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle webhook event
 */
export async function handleWebhookEvent(db, event) {
  switch (event.event) {
    case 'charge.success':
      return await processSuccessfulPayment(db, event);

    case 'charge.failed':
      return await processFailedPayment(db, event);

    case 'subscription.create':
    case 'subscription.enable':
      console.log('Subscription activated:', event.data.subscription_code);
      return { success: true };

    case 'subscription.disable':
      console.log('Subscription cancelled:', event.data.subscription_code);
      return { success: true };

    default:
      console.log('Unhandled webhook event:', event.event);
      return { success: true };
  }
}
