import type { PlayerStats } from '@prisma/client';
import { prisma } from '../client';
import { config } from '../../config';

const isDebug = config.LOG_LEVEL === 'debug';

export async function createStats(userId: string): Promise<PlayerStats> {
  if (isDebug) console.debug('DEBUG [db:stats] createStats userId=%s', userId);
  try {
    const stats = await prisma.playerStats.create({
      data: { userId },
    });
    if (isDebug) console.debug('DEBUG [db:stats] createStats done statsId=%s', stats.id);
    return stats;
  } catch (err) {
    console.error('ERROR [db:stats] createStats failed: %s', (err as Error).message);
    throw err;
  }
}

export async function findByUserId(userId: string): Promise<PlayerStats | null> {
  if (isDebug) console.debug('DEBUG [db:stats] findByUserId userId=%s', userId);
  try {
    const stats = await prisma.playerStats.findUnique({ where: { userId } });
    if (isDebug) console.debug('DEBUG [db:stats] findByUserId userId=%s, found=%s', userId, stats !== null);
    return stats;
  } catch (err) {
    console.error('ERROR [db:stats] findByUserId failed: %s', (err as Error).message);
    throw err;
  }
}
