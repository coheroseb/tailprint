import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'node:crypto';
import { stripeService } from '../services/stripe.js';
import { redisService, type ApiKeyRecord } from '../services/redis.js';
import { emailService } from '../services/email.js';
import { ErrorResponseSchema } from '../schemas/render.js';

const WebhookSuccessResponseSchema = z.object({
  received: z.boolean(),
  action: z.string().optional(),
  details: z.any().optional(),
});

export const webhookRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    '/v1/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const signature = request.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Missing stripe-signature header',
        });
      }

      const rawPayload = (request as any).rawBody || (request.body as any);
      if (!rawPayload) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Missing raw request body for webhook signature verification',
        });
      }

      try {
        const event = stripeService.constructEvent(rawPayload, signature);
        const result = await stripeService.handleWebhookEvent(event);

        return reply.code(200).send({
          received: true,
          action: result.action,
          details: result.details,
        });
      } catch (err: any) {
        request.log.error({ err }, 'Stripe webhook signature or processing error');
        return reply.code(400).send({
          statusCode: 400,
          error: 'Webhook Signature Error',
          message: err.message || 'Failed to verify stripe signature',
        });
      }
    }
  );

  // GET /v1/billing/session-key - Polled after Stripe Checkout redirection
  const sessionKeyHandler = async (request: any, reply: any) => {
    const { session_id } = request.query;
    if (!session_id || typeof session_id !== 'string') {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Query parameter session_id is required',
      });
    }

    const sessionData = await redisService.getSessionKey(session_id);
    if (!sessionData) {
      return reply.code(200).send({
        status: 'pending',
        message: 'API key is provisioning. Please retry in 1-2 seconds.',
      });
    }

    return reply.code(200).send({
      status: 'ready',
      apiKey: sessionData.apiKey,
      plan: sessionData.plan,
      monthlyLimit: sessionData.monthlyLimit,
    });
  };

  fastify.get('/v1/billing/session-key', { schema: { hide: true } }, sessionKeyHandler);
  fastify.get('/billing/session-key', { schema: { hide: true } }, sessionKeyHandler);

  // POST /v1/billing/portal - Generate Stripe Customer Portal URL for logged in key
  const portalHandler = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    }

    if (!token) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Bearer API key required to access customer portal',
      });
    }

    const keyRecord = await redisService.getApiKey(token);
    if (!keyRecord) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid API key provided',
      });
    }

    const customerId = keyRecord.customer_id;
    if (!customerId) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No associated Stripe customer ID found for this API key',
      });
    }

    try {
      const portal = await stripeService.createCustomerPortalSession({
        customerId,
      });

      return reply.code(200).send({
        url: portal.url,
      });
    } catch (err: any) {
      request.log.error({ err }, 'Failed to create Stripe portal session');
      return reply.code(500).send({
        statusCode: 500,
        error: 'Portal Error',
        message: err.message || 'Failed to initialize customer portal session',
      });
    }
  };

  fastify.post('/v1/billing/portal', { schema: { hide: true } }, portalHandler);
  fastify.post('/billing/portal', { schema: { hide: true } }, portalHandler);

  const claimFreeKeyHandler = async (
    request: any,
    reply: any
  ) => {
    const rawIp = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();

    // Check rate limit per IP (max 10 claims/hour)
    const rl = await redisService.checkClaimRateLimit(clientIp, 10);
    reply.header('X-Claim-Remaining', rl.remaining);
    if (!rl.allowed) {
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for free key claims. Please try again in an hour.',
      });
    }

    const email = request.body?.email?.trim();
    if (!email || !email.includes('@') || email.length < 5) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Please provide a valid developer email address.',
      });
    }

    // Check if an API key already exists for this email
    const existingKey = await redisService.getFreeKeyByEmail(email);
    if (existingKey) {
      emailService.sendFreeApiKeyEmail({
        to: email,
        apiKey: existingKey,
        monthlyLimit: 100,
      }).catch((err) => request.log.error({ err }, 'Failed to dispatch free key email'));

      return reply.send({
        success: true,
        apiKey: existingKey,
        plan: 'free',
        monthlyLimit: 100,
        isExisting: true,
        message: 'Welcome back! Your API key has been emailed to you and is ready to use.',
      });
    }

    // Generate new Free API key
    const newApiKey = stripeService.generateApiKey();
    const customerId = `cus_free_${crypto.randomBytes(8).toString('hex')}`;
    const record: ApiKeyRecord = {
      key_prefix: newApiKey.slice(0, 12),
      customer_id: customerId,
      plan: 'free',
      monthly_limit: 100,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    await redisService.storeApiKey(newApiKey, record);
    await redisService.setFreeKeyEmail(email, newApiKey);

    emailService.sendFreeApiKeyEmail({
      to: email,
      apiKey: newApiKey,
      monthlyLimit: 100,
    }).catch((err) => request.log.error({ err }, 'Failed to dispatch free key email'));

    return reply.code(201).send({
      success: true,
      apiKey: newApiKey,
      plan: 'free',
      monthlyLimit: 100,
      isExisting: false,
      message: 'Free API key provisioned! Sent to your email and ready to use.',
    });
  };

  fastify.post(
    '/v1/auth/claim-free-key',
    {
      schema: {
        summary: 'Claim Free API Key (100 renders/month)',
        description: 'Instantly provision a Developer Sandbox API key with 100 renders/month. No credit card required.',
        tags: ['Account & Usage'],
        body: z.object({
          email: z.string().email().describe('Developer email address to associate with the key'),
        }),
        response: {
          200: z.object({
            success: z.boolean(),
            apiKey: z.string(),
            plan: z.string(),
            monthlyLimit: z.number(),
            isExisting: z.boolean(),
            message: z.string(),
          }),
          201: z.object({
            success: z.boolean(),
            apiKey: z.string(),
            plan: z.string(),
            monthlyLimit: z.number(),
            isExisting: z.boolean(),
            message: z.string(),
          }),
          400: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    claimFreeKeyHandler
  );
  fastify.post('/auth/claim-free-key', { schema: { hide: true } }, claimFreeKeyHandler);
};
