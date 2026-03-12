[← Architecture](architecture.md) · [Back to README](../README.md) · [Configuration →](configuration.md)

# API Reference

## Base URL

```
http://localhost:3000
```

## Authentication

Protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

JWT payload:

```json
{ "userId": "clxxx...", "username": "tanker42" }
```

Tokens do not currently expire (future: add `expiresIn` to JWT sign options).

---

## Auth Endpoints

### POST /api/auth/register

Register a new player account.

**Request**

```json
{
  "username": "tanker42",
  "password": "securepassword"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `username` | string | 3–20 chars, `[a-zA-Z0-9_]` only |
| `password` | string | 8–72 chars |

**Response `201 Created`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "clxxx...",
    "username": "tanker42",
    "createdAt": "2026-03-12T00:00:00.000Z"
  }
}
```

**Error responses**

| Status | Error | Reason |
|--------|-------|--------|
| `400` | `VALIDATION_ERROR` | Invalid username/password format |
| `409` | `CONFLICT` | Username already taken |

---

### POST /api/auth/login

Authenticate an existing player.

**Request**

```json
{
  "username": "tanker42",
  "password": "securepassword"
}
```

**Response `200 OK`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "clxxx...",
    "username": "tanker42"
  }
}
```

**Error responses**

| Status | Error | Reason |
|--------|-------|--------|
| `401` | `UNAUTHORIZED` | User not found or wrong password |

> Note: Both "user not found" and "wrong password" return the same `401` response to prevent username enumeration.

---

## Utility Endpoints

### GET /health

Health check. No authentication required.

**Response `200 OK`**

```json
{ "status": "ok", "timestamp": "2026-03-12T00:00:00.000Z" }
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "statusCode": 400
}
```

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed JSON Schema validation |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Database Schema

### User

```prisma
model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passwordHash String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  stats        PlayerStats?
}
```

### PlayerStats

```prisma
model PlayerStats {
  id               String @id @default(cuid())
  userId           String @unique
  totalKills       Int    @default(0)
  totalDeaths      Int    @default(0)
  bestScore        Int    @default(0)
  totalGamesPlayed Int    @default(0)
  user             User   @relation(...)
}
```

`PlayerStats` is created automatically on registration. Stats are updated as the player plays.

## See Also

- [Getting Started](getting-started.md) — installation and first requests
- [Architecture](architecture.md) — error handling and auth patterns
- [Configuration](configuration.md) — JWT_SECRET setup
