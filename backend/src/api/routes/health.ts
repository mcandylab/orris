import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/client';

export default async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    app.log.debug('DEBUG [health] health check requested');

    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', db: 'connected', uptime, timestamp });
    } catch (err) {
      app.log.warn({ err }, 'WARN [health] database unavailable during health check');
      return reply.status(503).send({ status: 'degraded', db: 'disconnected', uptime, timestamp });
    }
  });
}
