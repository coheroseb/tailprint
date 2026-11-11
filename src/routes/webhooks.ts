import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { stripeService } from '../services/stripe.js';
import { redisService } from '../services/redis.js';
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
        tags: ['Webhooks'],
        summary: 'Stripe Webhook Listener',
        description: 'Handles lifecycle events from Stripe (checkout completion, recurring payment success, subscription cancellation).',
        response: {
          200: WebhookSuccessResponseSchema,
          400: ErrorResponseSchema,
        },
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

  fastify.get(
    '/v1/billing/session-key',
    {
      schema: {
        tags: ['Account & Usage'],
        summary: 'Retrieve Newly Created API Key for Checkout Session',
        description: 'Used by the checkout success modal to reveal the newly generated live API key immediately after payment.',
        querystring: z.object({
          session_id: z.string().describe('The Stripe Checkout Session ID'),
        }),
      },
    },
    sessionKeyHandler
  );

  fastify.get('/billing/session-key', { schema: { hide: true } }, sessionKeyHandler);
};
