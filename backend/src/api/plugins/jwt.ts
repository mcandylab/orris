import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config';
import { UnauthorizedError } from '../errors';

export interface JwtPayload {
  userId: string;
  username: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function jwtPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: config.JWT_SECRET });

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
      app.log.debug({ userId: request.user.userId }, 'DEBUG [jwt] token verified');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      app.log.warn({ reason }, 'WARN [jwt] invalid token');
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  app.log.debug('DEBUG [jwt] JWT plugin registered');
});