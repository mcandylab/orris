import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function jwtPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: config.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { userId?: string; sub?: string };
      const userId = payload.userId ?? payload.sub ?? 'unknown';
      app.log.debug({ userId }, 'DEBUG [jwt] token verified, userId');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      app.log.warn({ reason }, 'WARN [jwt] invalid token');
      reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token', statusCode: 401 } });
    }
  });

  app.log.debug('DEBUG [jwt] JWT plugin registered');
});
