import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { redisService } from '../services/redis.js';
import { env } from '../config/env.js';
import { ErrorResponseSchema } from '../schemas/render.js';

export const UsageResponseSchema = z.object({
  status: z.enum(['active', 'inactive']),
  plan: z.string(),
  monthly_limit: z.number().int(),
  current_usage: z.number().int(),
  remaining: z.number().int(),
  percent_used: z.string(),
  period_start: z.string(),
  resets_at: z.string(),
});

export const usageRoutes: FastifyPluginAsyncZod = async (fastify) => {
  const handler = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (env.NODE_ENV === 'development') {
      token = env.DEV_DEFAULT_API_KEY || 'sec_live_dev_test_key_12345';
    }

    if (!token) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Bearer authentication token. Example header: Authorization: Bearer sec_live_...',
      });
    }

    const apiKey = await redisService.getApiKey(token);
    if (!apiKey) {
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid API key provided',
      });
    }

    const currentUsage = await redisService.getCurrentUsage(token);
    const limit = apiKey.monthly_limit;
    const remaining = Math.max(0, limit - currentUsage);
    const percentUsed = limit > 0 ? ((currentUsage / limit) * 100).toFixed(2) + '%' : '0%';

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    return reply.code(200).send({
      status: apiKey.status,
      plan: apiKey.plan,
      monthly_limit: limit,
      current_usage: currentUsage,
      remaining,
      percent_used: percentUsed,
      period_start: periodStart,
      resets_at: resetsAt,
    });
  };

  fastify.get(
    '/v1/usage',
    {
      schema: {
        tags: ['Account & Usage'],
        summary: 'Check Current Monthly Quota & API Key Usage',
        description: 'Returns real-time consumption metrics for the authenticated API key without deducting from monthly quota.',
        security: [{ bearerAuth: [] }],
        response: {
          200: UsageResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    handler
  );

  // Short URL alias
  fastify.get('/usage', { schema: { hide: true } }, handler);
};
