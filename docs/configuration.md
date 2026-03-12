[← API Reference](api.md) · [Back to README](../README.md)

# Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWT tokens |
| `PORT` | — | `3000` | Fastify HTTP server port |
| `NODE_ENV` | — | `development` | Runtime environment |
| `LOG_LEVEL` | — | `info` | Pino log level |

---

### DATABASE_URL

PostgreSQL connection string in the standard format:

```
postgresql://<user>:<password>@<host>:<port>/<database>?schema=public
```

Example:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/orris?schema=public"
```

Used by Prisma for migrations and queries.

---

### JWT_SECRET

Secret key for signing and verifying JWT tokens. Must be at least 32 characters in production.

```env
JWT_SECRET="your-very-long-random-secret-here"
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### PORT

HTTP server port for Fastify.

```env
PORT=3000
```

---

### NODE_ENV

Controls behavior of the server:

| Value | Effect |
|-------|--------|
| `development` | pino-pretty colored logs, verbose errors |
| `production` | JSON logs, minimal error details |
| `test` | Logger disabled (for `app.inject()` tests) |

---

### LOG_LEVEL

Pino log level. Controls what gets logged.

| Value | What's logged |
|-------|--------------|
| `debug` | Everything including DB queries, JWT ops, each auth attempt |
| `info` | Successful operations, server lifecycle |
| `warn` | Failed auth attempts, conflicts, validation errors |
| `error` | Unhandled errors, startup failures |

Set `LOG_LEVEL=debug` during development to see verbose DB operation logs.

---

## .env.example

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/orris?schema=public"

# Auth
JWT_SECRET="change-me-in-production"

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

## See Also

- [Getting Started](getting-started.md) — setup walkthrough
- [API Reference](api.md) — JWT token usage
- [Architecture](architecture.md) — how config.ts centralizes env vars
