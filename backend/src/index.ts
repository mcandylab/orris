import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import { config } from './config';
import { connectDB, disconnectDB } from './db/client';
import { AppError } from './api/errors';
import corsPlugin from './api/plugins/cors';
import jwtPlugin from './api/plugins/jwt';
import rateLimitPlugin from './api/plugins/rateLimit';
import apiRoutes from './api/routes/index';

export async function createApp(): Promise<FastifyInstance> {
  const isTest = config.NODE_ENV === 'test';

  const app = Fastify({
    logger: isTest
      ? false
      : {
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
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // Fastify validation errors
    if (error.validation || error.statusCode === 400 || error.statusCode === 422) {
      const statusCode = error.statusCode ?? 400;
      app.log.warn({ statusCode }, `WARN [api] validation error: ${error.message}`);
      return reply.status(statusCode).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
        statusCode,
      });
    }

    // Unexpected errors — 500
    const message = config.NODE_ENV === 'production' ? 'Internal server error' : error.message;
    app.log.error({ err: error, statusCode: 500 }, `ERROR [api] ${error.message}`);
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message,
      statusCode: 500,
    });
  });

  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);
  await app.register(apiRoutes);

  return app;
}

async function start(): Promise<void> {
  let app: FastifyInstance | null = null;

  try {
    await connectDB();
    app = await createApp();

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