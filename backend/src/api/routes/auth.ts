import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { createUser, findByUsername } from '../../db/repositories/UserRepository';
import { createStats } from '../../db/repositories/StatsRepository';
import { ConflictError, UnauthorizedError } from '../errors';

const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$',
      },
      password: {
        type: 'string',
        minLength: 8,
        maxLength: 72,
      },
    },
  },
};

const loginSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: { type: 'string' },
      password: { type: 'string' },
    },
  },
};

interface RegisterBody {
  username: string;
  password: string;
}

interface LoginBody {
  username: string;
  password: string;
}

const authRoutes: FastifyPluginAsync = async function (app: FastifyInstance) {
  console.debug('DEBUG [routes] auth routes registered');

  app.post<{ Body: RegisterBody }>('/auth/register', { schema: registerSchema, attachValidation: true }, async (request, reply) => {
    if (request.validationError) {
      const details = request.validationError.message;
      console.warn('WARN [auth] register validation failed: %s', details);
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: details, statusCode: 400 });
    }
    const { username, password } = request.body;
    console.debug('DEBUG [auth] register attempt username=%s', username);

    const existing = await findByUsername(username);
    if (existing) {
      console.warn('WARN [auth] register conflict username=%s', username);
      throw new ConflictError('Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(username, passwordHash);
    await createStats(user.id);

    const token = app.jwt.sign({ userId: user.id, username: user.username });
    console.info('INFO [auth] user registered userId=%s, username=%s', user.id, user.username);

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  });

  app.post<{ Body: LoginBody }>('/auth/login', { schema: loginSchema }, async (request, reply) => {
    const { username, password } = request.body;
    console.debug('DEBUG [auth] login attempt username=%s', username);

    const user = await findByUsername(username);
    if (!user) {
      console.warn('WARN [auth] login failed (not found) username=%s', username);
      throw new UnauthorizedError('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      console.warn('WARN [auth] login failed (wrong password) username=%s', username);
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = app.jwt.sign({ userId: user.id, username: user.username });
    console.info('INFO [auth] login success userId=%s, username=%s', user.id, user.username);

    return reply.status(200).send({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });
};

export default authRoutes;
