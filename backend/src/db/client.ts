import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient({
  log: config.LOG_LEVEL === 'debug'
    ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
    : [{ emit: 'event', level: 'error' }],
});

export { prisma };

export async function connectDB(): Promise<void> {
  console.debug('DEBUG [db] connecting to database');
  try {
    await prisma.$connect();
    console.info('INFO [db] database connected');
  } catch (err) {
    console.error('ERROR [db] database connection failed', err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  console.debug('DEBUG [db] database disconnected');
}