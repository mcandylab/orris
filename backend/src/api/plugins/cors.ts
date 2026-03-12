import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { config } from '../../config';

export default fp(async function corsPlugin(app: FastifyInstance) {
  const origins =
    config.NODE_ENV === 'production'
      ? config.CORS_ORIGINS.length > 0
        ? config.CORS_ORIGINS
        : false
      : true;

  await app.register(cors, { origin: origins });

  app.log.debug({ origins }, 'DEBUG [cors] CORS plugin registered, origins');
});
