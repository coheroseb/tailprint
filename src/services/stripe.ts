import Stripe from 'stripe';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getPlanById } from '../config/plans.js';
import { redisService, type ApiKeyRecord } from './redis.js';
import { emailService } from './email.js';

export class StripeService {
  private static instance: StripeService | null = null;
  public stripe: Stripe;

  private constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil' as any,
    });
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  public constructEvent(rawPayload: string | Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawPayload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  }

  public generateApiKey(): string {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `sec_live_${randomHex}`;
  }

  public async createCheckoutSession(params: {
    planId: string;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ sessionId: string; url: string | null; isMock?: boolean }> {
    const plan = getPlanById(params.planId);
    const successUrl = params.successUrl || `${env.APP_URL}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = params.cancelUrl || `${env.APP_URL}/#pricing?checkout_cancelled=true`;

    const isPlaceholderKey =
      !env.STRIPE_SECRET_KEY ||
      env.STRIPE_SECRET_KEY.includes('sk_test_placeholder') ||
      env.STRIPE_SECRET_KEY.length < 20;

    // In local dev without live Stripe keys, provide a realistic simulated checkout URL
    if (isPlaceholderKey && env.NODE_ENV === 'development') {
      const mockSessionId = 'cs_test_' + crypto.randomBytes(16).toString('hex');
      return {
        sessionId: mockSessionId,
        url: `https://checkout.stripe.com/c/pay/${mockSessionId}#plan=${plan.id}`,
        isMock: true,
      };
    }

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      if (plan.stripePriceId && !plan.stripePriceId.includes('test_placeholder') && !plan.stripePriceId.includes('_test')) {
        lineItems.push({
          price: plan.stripePriceId,
          quantity: 1,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tailprint ${plan.name} Tier`,
              description: `${plan.monthlyLimit.toLocaleString()} PDF & image renders per month`,
              tax_code: 'txcd_10000000', // SaaS product tax code
            },
            unit_amount: plan.priceUsd * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        });
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: params.customerEmail,
        line_items: lineItems,
        metadata: {
          plan: plan.id,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (err: any) {
      if (env.NODE_ENV === 'development') {
        const mockSessionId = 'cs_test_' + crypto.randomBytes(16).toString('hex');
        return {
          sessionId: mockSessionId,
          url: `https://checkout.stripe.com/c/pay/${mockSessionId}#plan=${plan.id}`,
          isMock: true,
        };
      }
      throw err;
    }
  }

  public async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl?: string;
  }): Promise<{ url: string; isMock?: boolean }> {
    const returnUrl = params.returnUrl || `${env.APP_URL}/dashboard`;

    const isPlaceholderKey =
      !env.STRIPE_SECRET_KEY ||
      env.STRIPE_SECRET_KEY.includes('sk_test_placeholder') ||
      env.STRIPE_SECRET_KEY.length < 20;

    if (isPlaceholderKey && env.NODE_ENV === 'development') {
      return {
        url: `https://billing.stripe.com/p/session/test_portal#customer=${params.customerId}`,
        isMock: true,
      };
    }

    try {
      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: returnUrl,
      });

      return {
        url: portalSession.url,
      };
    } catch (err: any) {
      if (env.NODE_ENV === 'development') {
        return {
          url: `https://billing.stripe.com/p/session/test_portal#customer=${params.customerId}`,
          isMock: true,
        };
      }
      throw err;
    }
  }

  public async handleWebhookEvent(event: Stripe.Event): Promise<{ handled: boolean; action?: string; details?: any }> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || session.client_reference_id || 'cus_unknown';

        const planName = session.metadata?.plan || 'starter';
        const planConfig = getPlanById(planName);

        const newRawApiKey = this.generateApiKey();
        const record: ApiKeyRecord = {
          key_prefix: newRawApiKey.slice(0, 12),
          customer_id: customerId,
          plan: planConfig.id,
          monthly_limit: planConfig.monthlyLimit,
          status: 'active',
          created_at: new Date().toISOString(),
        };

        await redisService.storeApiKey(newRawApiKey, record);
        await redisService.saveSessionKey(session.id, newRawApiKey, planConfig.id, planConfig.monthlyLimit);

        const customerEmail = session.customer_details?.email || session.customer_email;
        if (customerEmail) {
          emailService.sendPaidApiKeyEmail({
            to: customerEmail,
            apiKey: newRawApiKey,
            planName: planConfig.name,
            monthlyLimit: planConfig.monthlyLimit,
          }).catch((err) => console.error('[StripeWebhook] Failed to dispatch paid API key email:', err.message));
        }

        return {
          handled: true,
          action: 'api_key_created',
          details: {
            customerId,
            plan: planConfig.id,
            apiKeyPrefix: record.key_prefix,
            rawApiKey: newRawApiKey,
          },
        };
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        if (customerId) {
          await redisService.resetMonthlyQuotaForCustomer(customerId);
        }

        return {
          handled: true,
          action: 'monthly_quota_reset',
          details: { customerId },
        };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

        if (customerId) {
          await redisService.updateKeyStatusByCustomer(customerId, 'inactive');
        }

        return {
          handled: true,
          action: 'subscription_deactivated',
          details: { customerId },
        };
      }

      default:
        return {
          handled: false,
          action: 'ignored_event',
          details: { type: event.type },
        };
    }
  }
}

export const stripeService = StripeService.getInstance();
