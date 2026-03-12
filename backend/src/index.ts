import Fastify from 'fastify';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';

const app = Fastify({
  logger: {
    level: LOG_LEVEL,
    transport:
      process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

async function start(): Promise<void> {
  try {
    app.log.info({ port: PORT }, 'LOG [backend] server starting');
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info({ port: PORT }, 'LOG [backend] server started');
  } catch (err) {
    app.log.error({ err }, 'ERROR [backend] startup failed');
    process.exit(1);
  }
}

start();
