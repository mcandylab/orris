import type { FastifyInstance } from 'fastify';
import authRoutes from './auth';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  console.debug('DEBUG [routes] registering all routes');

  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: '/api' });

  console.debug('DEBUG [routes] all routes registered');
}
