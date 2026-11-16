# UserService — API Gateway

Express API Gateway for the OpsSynk / NovaStack **Platform Team**. It is the single entry point for company APIs and forwards requests to **mocked** internal services (users, auth, notifications, platform). Everything runs locally: no database, no Docker, no cloud accounts.

- **Owner:** Ishita Srivastava
- **Team:** Platform Team
- **Stack:** Node.js 20, Express 5, Jest + Supertest, ESLint, GitHub Actions

> ## ⚠️ WARNING — CI passes, but request rate limiting is NOT implemented
>
> The gateway has **no rate limiting**. A green CI build does not change that. Any client can send unlimited requests, which can overload the gateway and the services behind it. This is tracked as [DEBT-API-001](#technical-debt-debt-api-001) (High priority, Open). Do not expose this gateway to untrusted traffic until it is resolved.

## Quick start (Windows PowerShell)

```powershell
node -v          # expect v20.x (v22 also works)
npm ci           # install exact versions from package-lock.json
npm test         # run integration tests
npm run lint     # run ESLint
npm start        # start the gateway on http://localhost:3000
```

Open a **second** PowerShell window and try it:

```powershell
curl.exe -s http://localhost:3000/health
```

Stop the gateway with `Ctrl+C` in the first window.

### Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Starts the gateway (`node src/server.js`) |
| `npm run dev` | Starts the gateway and restarts it when files change |
| `npm test` | Runs all Jest + Supertest integration tests |
| `npm run lint` | Runs ESLint on the whole project |
| `npm run lint:fix` | Runs ESLint and fixes what it safely can |

### Configuration

The gateway reads environment variables (see `.env.example` for the list; the app does not load that file by itself).

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` or `silent` |
| `ENABLE_FAILURE_SIMULATION` | `true` (`false` in production) | Enables the `X-Simulate-Upstream-Failure` header |

In PowerShell, set a variable for the current window only: `$env:PORT = "4000"; npm start`

## How it works

```
Client ──► Gateway (Express) ──► upstream client ──► mocked services
            │  request ID                              users
            │  request logging                         auth
            │  validation                              notifications
            └─ error handling                          platform
```

1. **Request ID middleware** gives every request a correlation ID.
2. **Route handlers** validate input, then call the **upstream client**.
3. The **upstream client** is the only code that talks to the mocked services. Each mock fails in its own way (like real services).
4. **Error middleware** converts every failure into one standard error response.

### Project structure

```
src/
  app.js                 Builds the Express app (middleware order lives here)
  server.js              Starts the HTTP server
  logger.js              Structured JSON logger
  errors.js              AppError and UpstreamCallError
  config/index.js        Reads environment variables
  routes/                One file per area + index.js (central route registration)
  middleware/            requestId, requestLogger, validate, notFound,
                         normalizeUpstreamError, errorHandler, simulateUpstreamFailure
  services/
    mocks/               Fake upstream services with deterministic data
    upstreamClient.js    The gateway's only way to call upstream services
tests/                   Supertest integration tests (+ helpers/testApp.js)
.github/workflows/ci.yml GitHub Actions workflow
requests.http            Ready-made requests for the VS Code "REST Client" extension
```

### Response format

Success:

```json
{ "success": true, "data": { "...": "..." }, "requestId": "7c1f0c3e-6d0b-4c53-9f45-3f6b2c1b9a10" }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_SERVICE_UNAVAILABLE",
    "message": "The requested service is temporarily unavailable",
    "details": { "upstream": "users" }
  },
  "requestId": "7c1f0c3e-6d0b-4c53-9f45-3f6b2c1b9a10"
}
```

`details` is optional. Raw upstream error messages are never sent to clients; they are only written to the logs.

### Error codes

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Bad query, path or body values (see `error.details`) |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 401 | `AUTH_REQUIRED` | Missing or malformed `Authorization` header |
| 401 | `INVALID_TOKEN` | Token not recognised by the auth mock |
| 404 | `ROUTE_NOT_FOUND` | No such route |
| 404 | `USER_NOT_FOUND` | No user with that ID |
| 409 | `EMAIL_ALREADY_EXISTS` | Email is already used by another user |
| 413 | `PAYLOAD_TOO_LARGE` | Body is larger than 10 KB |
| 500 | `INTERNAL_ERROR` | Unexpected gateway error (details only in logs) |
| 502 | `UPSTREAM_BAD_RESPONSE` | Upstream returned something unexpected |
| 503 | `UPSTREAM_SERVICE_UNAVAILABLE` | Upstream is down or refusing connections |
| 504 | `UPSTREAM_TIMEOUT` | Upstream did not answer in time |

> There is intentionally **no `429` code** yet. See the technical debt record below.

### Correlation IDs (`X-Request-ID`)

- If you send a valid `X-Request-ID` header (8–128 characters: letters, digits, `.`, `_`, `-`), the gateway keeps it.
- Otherwise it generates a UUID. Invalid values are replaced, never echoed.
- The ID is returned in the `X-Request-ID` **response header**, in every JSON body as `requestId`, and in every log line.

```powershell
curl.exe -s -i -H "X-Request-ID: demo-request-001" http://localhost:3000/health
```

A request log line looks like this (one JSON object per line):

```json
{"time":"2026-11-16T04:51:20.244Z","level":"info","message":"request completed","requestId":"demo-request-001","method":"GET","path":"/health","status":200,"durationMs":3.17}
```

### Simulating upstream failures

Add the `X-Simulate-Upstream-Failure` header (`unavailable`, `timeout` or `error`) to make the **upstream call of that one request** fail. This works on all `/api/...` routes while `ENABLE_FAILURE_SIMULATION` is on.

```powershell
curl.exe -s -i -H "X-Simulate-Upstream-Failure: timeout" http://localhost:3000/api/notifications
```

| Value | Response |
| --- | --- |
| `unavailable` | `503 UPSTREAM_SERVICE_UNAVAILABLE` |
| `timeout` | `504 UPSTREAM_TIMEOUT` |
| `error` | `502 UPSTREAM_BAD_RESPONSE` |

## API routes

All examples assume the gateway is running on `http://localhost:3000`. `curl.exe` (with the `.exe`) is the real curl that ships with Windows 11; plain `curl` in Windows PowerShell 5.1 is an alias for something else. `requestId` values below are examples and differ on every call.

| Method | Endpoint | Upstream | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | Gateway liveness |
| GET | `/api/users` | users | List users |
| GET | `/api/users/:id` | users | Get one user |
| POST | `/api/users` | users | Create a user |
| GET | `/api/auth/profile` | auth | Get the profile for a Bearer token |
| GET | `/api/notifications` | notifications | List notifications |
| GET | `/api/platform/status` | all | Aggregated upstream status |

### GET /health

**Purpose:** Checks that the gateway itself is running. It does not call any upstream, so it stays `200` even when upstreams are down.

**Parameters:** none

```powershell
curl.exe -s http://localhost:3000/health
```

```json
{
  "success": true,
  "data": { "status": "ok", "service": "userservice-api-gateway", "uptimeSeconds": 2 },
  "requestId": "756138bf-858b-40a6-a45b-94f3656d6162"
}
```

**Errors:** none expected.

### GET /api/users

**Purpose:** Lists users from the mocked users service (4 seeded users: Ada, Grace, Alan, Margaret).

| Query parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `role` | string | all roles | `admin`, `developer` or `viewer` |
| `limit` | integer | `20` | 1 to 50 |
| `offset` | integer | `0` | 0 or more |

```powershell
curl.exe -s "http://localhost:3000/api/users?limit=2"
```

```json
{
  "success": true,
  "data": {
    "users": [
      { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "role": "admin", "createdAt": "2025-01-10T09:00:00.000Z" },
      { "id": 2, "name": "Grace Hopper", "email": "grace@example.com", "role": "developer", "createdAt": "2025-02-14T09:00:00.000Z" }
    ],
    "total": 4,
    "limit": 2,
    "offset": 0
  },
  "requestId": "fc8a7c69-7cc7-44c0-8615-16e1358fecab"
}
```

**Errors:** `400 VALIDATION_ERROR` (bad `limit`, `offset` or `role`), `502/503/504` upstream failures.

### GET /api/users/:id

**Purpose:** Returns one user.

| Path parameter | Type | Rules |
| --- | --- | --- |
| `id` | integer | Positive whole number |

```powershell
curl.exe -s http://localhost:3000/api/users/2
```

```json
{
  "success": true,
  "data": { "user": { "id": 2, "name": "Grace Hopper", "email": "grace@example.com", "role": "developer", "createdAt": "2025-02-14T09:00:00.000Z" } },
  "requestId": "5b076da9-4d79-44ae-a589-266172dbc2fd"
}
```

**Errors:** `400 VALIDATION_ERROR` (for example `/api/users/abc`), `404 USER_NOT_FOUND` (for example `/api/users/999`), `502/503/504` upstream failures.

```powershell
curl.exe -s -i http://localhost:3000/api/users/999
```

```json
{
  "success": false,
  "error": { "code": "USER_NOT_FOUND", "message": "User 999 was not found" },
  "requestId": "bf9e1b09-12ab-40c7-af56-acc3be470c4f"
}
```

### POST /api/users

**Purpose:** Creates a user in the mocked users service. Data lives in memory and is reset when the gateway restarts.

| Body field (JSON) | Type | Rules |
| --- | --- | --- |
| `name` | string | Required, 2 to 100 characters |
| `email` | string | Required, valid email, must not already exist (case-insensitive) |
| `role` | string | Optional: `admin`, `developer` or `viewer` (default `viewer`) |

```powershell
$body = @{ name = "Katherine Johnson"; email = "katherine@example.com"; role = "developer" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/users -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 6
```

Response `201 Created` with a `Location: /api/users/5` header:

```json
{
  "success": true,
  "data": { "user": { "id": 5, "name": "Katherine Johnson", "email": "katherine@example.com", "role": "developer", "createdAt": "2026-11-16T04:51:20.289Z" } },
  "requestId": "b62bf0e0-0148-4d1b-b3af-049272d81f34"
}
```

**Errors:** `400 VALIDATION_ERROR`, `400 INVALID_JSON`, `409 EMAIL_ALREADY_EXISTS`, `413 PAYLOAD_TOO_LARGE`, `502/503/504` upstream failures.

```powershell
curl.exe -s -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{}"
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "name", "message": "Required, 2 to 100 characters" },
      { "field": "email", "message": "Required, must be a valid email address" }
    ]
  },
  "requestId": "121f54c0-c05c-4be6-91d3-2577aaf2e4ee"
}
```

### GET /api/auth/profile

**Purpose:** Returns the profile that belongs to a Bearer token, via the mocked auth service.

| Header | Rules |
| --- | --- |
| `Authorization` | `Bearer <token>`. Mock tokens: `demo-token` (Ada, admin) and `viewer-token` (Alan, viewer). These are fake demo values, not credentials. |

```powershell
curl.exe -s -H "Authorization: Bearer demo-token" http://localhost:3000/api/auth/profile
```

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "role": "admin",
      "permissions": ["users:read", "users:write", "platform:read"]
    }
  },
  "requestId": "2a89aa5a-02f2-4df8-9d2f-c983147195a7"
}
```

**Errors:** `401 AUTH_REQUIRED` (header missing or not `Bearer ...`), `401 INVALID_TOKEN` (unknown token), `502/503/504` upstream failures.

```powershell
curl.exe -s -i http://localhost:3000/api/auth/profile
```

```json
{
  "success": false,
  "error": { "code": "AUTH_REQUIRED", "message": "A Bearer token is required in the Authorization header" },
  "requestId": "56885eff-8ca1-430e-b2f7-8c41acf46666"
}
```

### GET /api/notifications

**Purpose:** Lists notifications from the mocked notifications service (4 seeded notifications).

| Query parameter | Type | Default | Rules |
| --- | --- | --- | --- |
| `userId` | integer | all users | Positive whole number |
| `unread` | string | all | `true` or `false` |

```powershell
curl.exe -s "http://localhost:3000/api/notifications?userId=1&unread=true"
```

```json
{
  "success": true,
  "data": {
    "notifications": [
      { "id": 1, "userId": 1, "type": "deployment", "message": "Deployment of gateway v1.0.0 finished", "read": false, "createdAt": "2025-05-01T10:00:00.000Z" }
    ],
    "total": 1
  },
  "requestId": "5eb7dc5f-1f9a-4d5b-a4b4-9f65ec672724"
}
```

**Errors:** `400 VALIDATION_ERROR`, `502/503/504` upstream failures.

```powershell
curl.exe -s -i -H "X-Simulate-Upstream-Failure: timeout" http://localhost:3000/api/notifications
```

```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "The requested service did not respond in time",
    "details": { "upstream": "notifications" }
  },
  "requestId": "6ac85d50-5977-438d-8bb5-f94347822e7a"
}
```

### GET /api/platform/status

**Purpose:** Asks every mocked upstream for its health and reports one summary. It always answers `200`: a broken upstream makes the overall status `degraded` instead of failing the request.

**Parameters:** none

```powershell
curl.exe -s http://localhost:3000/api/platform/status
```

```json
{
  "success": true,
  "data": {
    "status": "operational",
    "gateway": { "name": "UserService API Gateway", "version": "1.0.0", "environment": "development" },
    "platform": { "platform": "NovaStack", "team": "Platform Team", "region": "local-dev" },
    "upstreams": { "users": "up", "auth": "up", "notifications": "up", "platform": "up" },
    "features": { "correlationIds": true, "errorNormalization": true, "rateLimiting": false }
  },
  "requestId": "49b4489c-5f4d-49bd-82d9-d72805677a97"
}
```

Note `"rateLimiting": false`: the gateway reports honestly that the feature is missing. With a failure simulated (`X-Simulate-Upstream-Failure: unavailable`) every upstream shows `"down"`, `status` becomes `"degraded"`, and `platform` is `null`.

**Errors:** none expected (`400 VALIDATION_ERROR` only if the simulation header has an invalid value).

### Unknown routes

```powershell
curl.exe -s -i http://localhost:3000/nope
```

```json
{
  "success": false,
  "error": { "code": "ROUTE_NOT_FOUND", "message": "Route GET /nope does not exist" },
  "requestId": "b9245e93-3f63-490a-ae6b-58f225b976c9"
}
```

## Testing

`npm test` runs Jest with Supertest against the Express app directly (no fixed port and no external services needed). Every test builds a fresh app with fresh mocked services, so tests never affect each other. Covered: health, users (list, details, create, validation, duplicates), auth profile, notifications, platform status, unknown routes, malformed JSON, oversized bodies, upstream failures on every mocked service, error-shape consistency, and correlation ID generation, propagation, error and log inclusion.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main`, `feature/**`, `fix/**` and `chore/**`, and on pull requests to `main`. It sets up Node.js 20, runs `npm ci`, `npm run lint` and `npm test` (the same commands you run locally).

**Passing CI means: the code lints and the tests pass. It does not mean the gateway is safe to run under heavy or hostile traffic.**

## Technical debt: DEBT-API-001

| Field | Value |
| --- | --- |
| **ID** | DEBT-API-001 |
| **Title** | Missing request rate limiting |
| **Priority** | High |
| **Status** | Open |
| **Impact** | Unrestricted client requests may overload gateway resources and mocked or future upstream services. |
| **Risk** | Traffic spikes and abusive clients can consume resources without throttling. |
| **Proposed resolution** | Introduce configurable per-client rate limiting with appropriate response headers and HTTP 429 responses. |
| **Current status** | Not implemented. |

**What is missing:** there is no limiter of any kind. No request counting, no `429 Too Many Requests` responses, no `RateLimit-*` or `Retry-After` headers, no limit configuration.

**Why it matters:**

- **Excessive traffic:** one noisy client can use all of the gateway's capacity and slow everyone else down.
- **Abuse:** scripts can hammer endpoints such as `POST /api/users` or the auth profile route without any slowdown.
- **Upstream overload:** the gateway passes every request on to the services behind it, so unthrottled traffic reaches them too.

**Proposed solution (not started):**

- Per-client limits, identified by IP address first (API keys later).
- Configurable through environment variables (window length and maximum requests).
- `429` responses that use the standard error format with a new `RATE_LIMIT_EXCEEDED` code.
- `RateLimit-*` and `Retry-After` response headers.
- Tests for normal and excessive traffic, and documentation of the settings.
- A shared store (for example Redis) once more than one gateway instance runs, because in-memory counters are per process.

## Runtime note

The project targets Node.js 20 as specified (`.nvmrc`, CI), and its tests and lint were also run on Node 22. Node.js 20 reached end-of-life on 30 April 2026 and no longer gets security fixes, so moving to a supported Node version is a sensible follow-up (change `.nvmrc` and the `node-version` in `ci.yml`).
