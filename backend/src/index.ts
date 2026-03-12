import Fastify from 'fastify';
import { config } from './config';
import { connectDB, disconnectDB } from './db/client';
import jwtPlugin from './api/plugins/jwt';
import { registerRoutes } from './api/routes/index';
import { AppError } from './api/errors';

export async function createApp() {
  const isTest = config.NODE_ENV === 'test';
  const isDev = config.NODE_ENV === 'development';

  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: config.LOG_LEVEL,
          transport: isDev
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        },
  });

  // Error handler for AppError hierarchy
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      app.log.warn({ err, url: request.url }, 'WARN [api] app error: %s', err.message);
      return reply.status(err.statusCode).send({
        error: err.code ?? err.name,
        message: err.message,
        statusCode: err.statusCode,
      });
    }

    // Fastify validation errors (400/422)
    if (err.statusCode === 400 || err.statusCode === 422) {
      return reply.status(err.statusCode).send({
        error: 'VALIDATION_ERROR',
        message: err.message,
        statusCode: err.statusCode,
      });
    }

    app.log.error({ err, url: request.url }, 'ERROR [api] unhandled error');
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  await app.register(jwtPlugin);
  await registerRoutes(app);

  return app;
}

async function start(): Promise<void> {
  const app = await createApp();
  try {
    app.log.info({ port: config.PORT }, 'LOG [backend] server starting');
    await connectDB();
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info({ port: config.PORT }, 'LOG [backend] server started');
  } catch (err) {
    app.log.error({ err }, 'ERROR [backend] startup failed');
    await disconnectDB().catch(() => {});
    process.exit(1);
  }

  const shutdown = async () => {
    app.log.info('LOG [backend] shutting down');
    await app.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
