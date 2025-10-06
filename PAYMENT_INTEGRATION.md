# Payment Integration Guide

## Overview

PlantGenius uses Paystack for payment processing. This document outlines the payment integration architecture and security considerations.

## Architecture

```
User → PaystackPayment Component → Paystack WebView → Paystack API
                                          ↓
                                    Verification
                                          ↓
                            Backend Webhook (REQUIRED FOR PRODUCTION)
                                          ↓
                                  Update Subscription
```

## Current Implementation Status

### ✅ Implemented
- Payment initiation flow
- Paystack WebView integration (ready)
- Subscription data model
- Payment reference generation
- Client-side payment preparation

### ⚠️ REQUIRES IMPLEMENTATION FOR PRODUCTION
- **Server-side payment verification** (CRITICAL)
- **Webhook handling** for payment events
- **Payment receipt generation**
- **Refund handling**
- **Failed payment retry logic**

## Security Considerations

### 🚨 CRITICAL SECURITY ISSUE

**Current Status**: Payment verification is done CLIENT-SIDE for demonstration only.

**Problem**: A malicious user can bypass client-side verification and activate subscriptions without payment.

**Solution Required**: Implement server-side payment verification before production deployment.

### Required Server-Side Implementation

1. **Backend Webhook Handler**
   ```typescript
   // backend/trpc/route/payment/webhook/route.ts
   export const paystackWebhook = publicProcedure
     .input(z.object({
       event: z.string(),
       data: z.object({
         reference: z.string(),
         amount: z.number(),
         status: z.string(),
       }),
     }))
     .mutation(async ({ input }) => {
       // Verify webhook signature
       // Verify payment with Paystack API using SECRET KEY
       // Update subscription in database
       // Send confirmation email
     });
   ```

2. **Payment Verification Endpoint**
   ```typescript
   // backend/trpc/route/payment/verify/route.ts
   export const verifyPayment = privateProcedure
     .input(z.object({ reference: z.string() }))
     .mutation(async ({ input, ctx }) => {
       // Call Paystack API with SECRET KEY (server-side only)
       const response = await fetch(
         `https://api.paystack.co/transaction/verify/${input.reference}`,
         {
           headers: {
             Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
           },
         }
       );

       // Verify amount matches expected subscription price
       // Create subscription in database
       // Return verification result
     });
   ```

## Payment Flow

### 1. User Initiates Payment
```typescript
// User selects plan and clicks "Pay"
const paymentData = paystackService.initiatePayment({
  email: user.email,
  amount: planAmount * 100, // Convert to kobo
  planType: 'premium',
  billingCycle: 'monthly',
});
```

### 2. Paystack WebView Opens
```typescript
// PaystackPayment component shows Paystack WebView
<PaystackWebView
  paystackKey={paymentData.publicKey}
  amount={paymentData.amount}
  billingEmail={paymentData.email}
  reference={paymentData.reference}
  onSuccess={(response) => {
    // Payment successful on Paystack side
    // NOW VERIFY SERVER-SIDE
  }}
  onCancel={() => {
    // User cancelled payment
  }}
/>
```

### 3. Payment Verification (MUST BE SERVER-SIDE)
```typescript
// ❌ WRONG: Client-side verification (current implementation)
const result = await paystackService.verifyPayment(reference);

// ✅ CORRECT: Server-side verification
const result = await trpc.payment.verify.mutate({ reference });
```

### 4. Subscription Activation
```typescript
// Only after server-side verification succeeds
await subscriptionService.createSubscription({
  userId: user.id,
  planType: 'premium',
  billingCycle: 'monthly',
  paymentReference: reference,
  amount: paymentData.amount,
});
```

## Testing

### Test Cards (Paystack Test Mode)

| Card Number | CVV | Expiry | PIN | Outcome |
|-------------|-----|--------|-----|---------|
| 4084084084084081 | 408 | Future | 0000 | Success |
| 5060666666666666666 | 123 | Future | 1234 | Decline |
| 4084080000000409 | 408 | Future | 0000 | Insufficient Funds |

### Test Environment Variables
```env
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

## Production Checklist

Before deploying payment functionality to production:

- [ ] Implement server-side payment verification
- [ ] Set up Paystack webhook endpoint
- [ ] Configure webhook URL in Paystack dashboard
- [ ] Test webhook with Paystack webhook tester
- [ ] Implement payment receipt generation
- [ ] Add transaction logging
- [ ] Set up monitoring for failed payments
- [ ] Implement refund handling
- [ ] Test with real money in small amounts
- [ ] Configure production Paystack keys
- [ ] Remove client-side verification code
- [ ] Add rate limiting to payment endpoints
- [ ] Implement fraud detection
- [ ] Set up payment alerts
- [ ] Document payment flows for support team

## Webhook Configuration

### Paystack Dashboard Setup
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/trpc/payment.webhook`
3. Select events:
   - `charge.success`
   - `charge.failed`
   - `subscription.create`
   - `subscription.disable`
4. Copy webhook secret
5. Add secret to environment variables

### Webhook Signature Verification
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
```

## Pricing Structure

### Basic Plan
- Monthly: ₦299 (2,990 kobo)
- Yearly: ₦3,228 (32,280 kobo) - 10% discount

### Premium Plan
- Monthly: ₦499 (4,990 kobo)
- Yearly: ₦5,276 (52,760 kobo) - 12% discount

## Support & Troubleshooting

### Common Issues

**Payment not completing**
- Check network connection
- Verify Paystack keys are correct
- Check Paystack dashboard for transaction status

**Subscription not activating**
- Verify payment was successful in Paystack dashboard
- Check server logs for verification errors
- Ensure webhook is receiving events

**Duplicate charges**
- Implement idempotency keys
- Check for multiple payment initiations
- Use unique reference per payment attempt

## References

- [Paystack Documentation](https://paystack.com/docs/api/)
- [Paystack React Native Library](https://www.npmjs.com/package/react-native-paystack-webview)
- [Webhook Best Practices](https://paystack.com/docs/payments/webhooks/)
