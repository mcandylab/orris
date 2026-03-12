import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

const MAX_REQUESTS = 100;
const TIME_WINDOW = '1 minute';

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: MAX_REQUESTS,
    timeWindow: TIME_WINDOW,
    errorResponseBuilder(request, context) {
      app.log.warn({ ip: request.ip }, 'WARN [rateLimit] rate limit exceeded, ip');
      return {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests — maximum ${context.max} per ${TIME_WINDOW}`,
          statusCode: 429,
        },
      };
    },
  });

  app.log.debug(
    { max: MAX_REQUESTS, window: TIME_WINDOW },
    'DEBUG [rateLimit] rate limit plugin registered'
  );
});
