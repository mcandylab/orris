import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const LOG_LEVEL = config.LOG_LEVEL;

export const prisma = new PrismaClient({
  log: LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

export async function connectDB(): Promise<void> {
  console.debug('DEBUG [db] connecting to database');
  await prisma.$connect();
  console.info('INFO [db] database connected');
}

export async function disconnectDB(): Promise<void> {
  console.debug('DEBUG [db] disconnecting from database');
  await prisma.$disconnect();
  console.info('INFO [db] database disconnected');
}
