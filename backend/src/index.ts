import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import { config } from './config';
import { connectDB, disconnectDB } from './db/client';
import { AppError } from './api/errors';
import corsPlugin from './api/plugins/cors';
import jwtPlugin from './api/plugins/jwt';
import rateLimitPlugin from './api/plugins/rateLimit';
import apiRoutes from './api/routes/index';

export function createApp(): FastifyInstance {
  console.debug('DEBUG [server] creating Fastify app');

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  // Global error handler (Fastify v5: error is typed as FastifyError)
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error instanceof AppError) {
      app.log.warn({ statusCode: error.statusCode, code: error.code }, `WARN [api] ${error.message}`);
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, statusCode: error.statusCode },
      });
    }

    // Fastify validation errors
    if (error.validation) {
      const message = error.message;
      app.log.warn({ statusCode: 422 }, `WARN [api] validation error: ${message}`);
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message, statusCode: 422, details: error.validation },
      });
    }

    // Unexpected errors — 500
    const message = config.NODE_ENV === 'production' ? 'Internal server error' : error.message;
    app.log.error({ err: error, statusCode: 500 }, `ERROR [api] ${error.message}`);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message, statusCode: 500 },
    });
  });

  return app;
}

async function start(): Promise<void> {
  let app: FastifyInstance | null = null;

  try {
    await connectDB();
    app = createApp();

    await app.register(corsPlugin);
    await app.register(jwtPlugin);
    await app.register(rateLimitPlugin);

    await app.register(apiRoutes);

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info({ port: config.PORT }, 'INFO [server] server started on port');
  } catch (err) {
    console.error('ERROR [server] startup failed', err);
    process.exit(1);
  }

  async function shutdown(signal: string): Promise<void> {
    if (!app) return;
    app.log.info({ signal }, 'INFO [server] shutting down');
    await app.close();
    await disconnectDB();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
