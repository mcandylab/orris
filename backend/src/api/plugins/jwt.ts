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
  console.debug('DEBUG [jwt] registering JWT plugin');

  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  });

  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    console.debug('DEBUG [jwt] verifying token');
    try {
      await request.jwtVerify();
      console.debug('DEBUG [jwt] token valid userId=%s', request.user.userId);
    } catch (err) {
      console.warn('WARN [jwt] token verification failed: %s', (err as Error).message);
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  console.debug('DEBUG [jwt] JWT plugin registered');
});
