const DATABASE_URL = process.env['DATABASE_URL'];
const JWT_SECRET = process.env['JWT_SECRET'];
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

if (!DATABASE_URL) {
  console.error('ERROR [config] DATABASE_URL is not set');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('ERROR [config] JWT_SECRET is not set');
  process.exit(1);
}

export const config = {
  DATABASE_URL,
  JWT_SECRET,
  PORT,
  LOG_LEVEL,
  NODE_ENV,
} as const;
