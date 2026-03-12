import { FastifyBaseLogger } from 'fastify';

export interface Config {
  PORT: number;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  CORS_ORIGINS: string[];
}

function loadConfig(log?: FastifyBaseLogger): Config {
  const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
  const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
  const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';
  const DATABASE_URL = process.env['DATABASE_URL'] ?? '';
  const JWT_SECRET = process.env['JWT_SECRET'] ?? '';
  const CORS_ORIGINS = (process.env['CORS_ORIGINS'] ?? '').split(',').filter(Boolean);

  if (NODE_ENV === 'production') {
    const missing: string[] = [];
    if (!DATABASE_URL) missing.push('DATABASE_URL');
    if (!JWT_SECRET) missing.push('JWT_SECRET');

    if (missing.length > 0) {
      for (const name of missing) {
        console.error(`ERROR [config] missing required env var: ${name}`);
      }
      process.exit(1);
    }
  }

  const cfg: Config = { PORT, LOG_LEVEL, DATABASE_URL, JWT_SECRET, NODE_ENV, CORS_ORIGINS };

  if (log) {
    log.debug(
      { NODE_ENV, PORT, LOG_LEVEL },
      'DEBUG [config] config loaded'
    );
  } else {
    console.debug(`DEBUG [config] config loaded: NODE_ENV=${NODE_ENV}, PORT=${PORT}, LOG_LEVEL=${LOG_LEVEL}`);
  }

  return cfg;
}

export const config: Config = loadConfig();