import type { User } from '@prisma/client';
import { prisma } from '../client';
import { config } from '../../config';

const isDebug = config.LOG_LEVEL === 'debug';

export async function createUser(username: string, passwordHash: string): Promise<User> {
  if (isDebug) console.debug('DEBUG [db:users] createUser username=%s', username);
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash },
    });
    if (isDebug) console.debug('DEBUG [db:users] createUser done userId=%s', user.id);
    return user;
  } catch (err) {
    console.error('ERROR [db:users] createUser failed: %s', (err as Error).message);
    throw err;
  }
}

export async function findByUsername(username: string): Promise<User | null> {
  if (isDebug) console.debug('DEBUG [db:users] findByUsername username=%s', username);
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (isDebug) console.debug('DEBUG [db:users] findByUsername username=%s, found=%s', username, user !== null);
    return user;
  } catch (err) {
    console.error('ERROR [db:users] findByUsername failed: %s', (err as Error).message);
    throw err;
  }
}

export async function findById(id: string): Promise<User | null> {
  if (isDebug) console.debug('DEBUG [db:users] findById id=%s', id);
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (isDebug) console.debug('DEBUG [db:users] findById id=%s, found=%s', id, user !== null);
    return user;
  } catch (err) {
    console.error('ERROR [db:users] findById failed: %s', (err as Error).message);
    throw err;
  }
}
