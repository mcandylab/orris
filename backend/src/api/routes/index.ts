import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import healthRoute from './health';
import authRoutes from './auth';

export default fp(async function apiRoutes(app: FastifyInstance) {
  app.log.debug('DEBUG [routes] registering API routes');

  await app.register(healthRoute, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
});