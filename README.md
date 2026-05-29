# Campus To-Do API

NestJS backend for a mobile To-Do app: JWT auth, task CRUD with ownership, soft-delete archive (7-day retention cron), Swagger, rate limiting, and real-time task events over WebSockets.

## Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose (recommended), or local PostgreSQL 16+
- **curl** and optionally **jq** for the examples below
- **wscat** (optional) for WebSocket testing: `npm i -g wscat`

## Environment variables

Copy the example file and adjust secrets for production:

```bash
cp .env.example .env
```

| Variable | Description | Default (`.env.example`) |
|----------|-------------|--------------------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/todo?schema=public` |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars, validated on startup) | `change-me-in-production-use-long-random-string` |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `7d`, `24h`) | `7d` |
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `CORS_ORIGIN` | REST/WS allowed origins (`*` or comma-separated URLs) | `*` |

In Docker Compose, `JWT_SECRET` and `JWT_EXPIRES_IN` can be overridden via host env or a `.env` file next to `docker-compose.yml`.

## Run with Docker

Build and start PostgreSQL + API (migrations run automatically on container start):

```bash
docker compose up --build
```

- API: `http://localhost:3000`
- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Local development

1. Start PostgreSQL (only DB from Compose is enough):

   ```bash
   docker compose up postgres -d
   ```

2. Install dependencies and apply migrations:

   ```bash
   npm install
   cp .env.example .env   # if not done yet
   npm run prisma:migrate
   ```

3. Run the API in watch mode:

   ```bash
   npm run start:dev
   ```

Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Tests

```bash
npm run test        # unit (Vitest)
npm run test:e2e    # e2e (requires test DB / env — see test setup)
npm run test:cov
```

## API overview

| Area | Auth | Notes |
|------|------|--------|
| `GET /health` | Public | Liveness probe |
| `POST /auth/register`, `POST /auth/login` | Public | Rate limit: 10 req/min |
| `GET/POST/PATCH/DELETE /tasks` | Bearer JWT | Rate limit: 100 req/min |
| `DELETE /tasks/:id` | Bearer JWT | Soft delete (`deletedAt`); archived tasks cannot be patched (403) |
| WebSocket namespace `/tasks` | JWT in handshake | Events: `task:created`, `task:updated`, `task:deleted`, `task:statusChanged` |

Archived tasks are hard-deleted after **7 full days** in the archive (`deletedAt` ≤ now − 7 days). Purge runs **every hour** (UTC) and once on app startup. Until then, repeat `DELETE` on the same task is idempotent and does not reset `deletedAt`.

## curl examples

Base URL and sample credentials (match Swagger examples):

```bash
export BASE=http://localhost:3000
export EMAIL=user@example.com
export PASS=password123
```

### Register

```bash
curl -s -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq .
```

### Login (save token)

```bash
export TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .accessToken)

echo "TOKEN=$TOKEN"
```

Use `Authorization: Bearer $TOKEN` on all task routes below.

### Create task

```bash
TASK_RESP=$(curl -s -X POST "$BASE/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","description":"Milk, eggs","status":"todo"}')

echo "$TASK_RESP" | jq .
export TASK_ID=$(echo "$TASK_RESP" | jq -r .id)
```

### List tasks (filter + pagination)

```bash
# Active tasks, status filter, page 1
curl -s "$BASE/tasks?status=todo&page=1&limit=20&archived=false" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Archived tasks
curl -s "$BASE/tasks?archived=true&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Get one task

```bash
curl -s "$BASE/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Update task

```bash
curl -s -X PATCH "$BASE/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","title":"Buy groceries (updated)"}' | jq .
```

### Archive task (soft delete)

```bash
curl -s -X DELETE "$BASE/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Patching an archived task returns **403 Forbidden**.

## Swagger

Interactive OpenAPI UI with Bearer auth:

**[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

1. Call `POST /auth/login` or `POST /auth/register` and copy `accessToken`.
2. Click **Authorize**, enter `Bearer <token>` (or paste the token if the UI adds the prefix automatically).
3. Try task endpoints from the **tasks** tag.

WebSocket endpoints are not listed in Swagger; use the section below.

## WebSocket (`/tasks`)

- **Namespace:** `/tasks` (full URL: `http://localhost:3000/tasks` with Socket.IO client)
- **Auth:** JWT via one of:
  - `Authorization: Bearer <token>` header on handshake
  - `auth: { token: '<jwt>' }` in client options
  - Query: `?token=<jwt>`

On connect, the server joins the socket to room `user:<userId>` and may emit `join` with `{ room: "user:<userId>" }`.

### CLI note

`wscat` speaks plain WebSockets; this gateway uses **Socket.IO** on namespace `/tasks`. Use the Node snippet below or any Socket.IO client (browser, mobile SDK).

### Node.js client snippet

```javascript
import { io } from 'socket.io-client';

const token = process.env.TOKEN; // from login curl above

const socket = io('http://localhost:3000/tasks', {
  auth: { token },
  // alternative: extraHeaders: { Authorization: `Bearer ${token}` },
});

socket.on('connect', () => console.log('connected', socket.id));
socket.on('join', (payload) => console.log('join', payload));
socket.on('task:created', (task) => console.log('created', task));
socket.on('task:updated', (task) => console.log('updated', task));
socket.on('task:statusChanged', (task) => console.log('status', task));
socket.on('task:deleted', (task) => console.log('deleted', task));
socket.on('task:purged', (payload) => console.log('purged', payload));
socket.on('disconnect', () => console.log('disconnected'));
```

Create or update a task via REST while this client is connected; events are emitted only to the owning user's room. After the 7-day retention window, the hourly purge emits `task:purged` with `{ id, userId, deletedAt }`.

## Project layout

```
src/
  auth/          # register, login, JWT
  tasks/         # CRUD, gateway
  archive/       # cron cleanup (>7 days archived)
  common/        # guards, pagination, swagger helpers
prisma/          # schema & migrations
test/            # e2e specs
```

## License

UNLICENSED (private project).
