# Tabletop Arena

Private, friends-only realtime tabletop platform built as a TypeScript monorepo.

The foundation is intentionally modular:

- `apps/web`: Next.js App Router frontend
- `apps/server`: Express + Socket.IO authoritative backend
- `packages/game-core`: pure game engines and rule modules
- `packages/shared`: shared schemas, socket contracts, constants, errors
- `packages/db`: Prisma schema, client, and admin seed

Classic UNO is the first complete playable game module. Future games plug into the same `GameModule` interface without rewriting rooms, auth, sockets, snapshots, or stats.

## First Run

Create `.env` from the example:

```bash
cp .env.example .env
```

Set strong values for:

```bash
SESSION_SECRET=
JWT_SECRET=
ADMIN_USERNAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Start the private server:

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

The server container runs Prisma `db push` and seeds the admin account on startup.

## Cloudflare Tunnel

Expose only the reverse proxy:

```bash
cloudflared tunnel --url http://localhost:8080
```

Friends only need the generated browser link. PostgreSQL stays internal, and no port forwarding is required.

## Local Development

After installing dependencies:

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

If Docker Desktop or WSL is blocked, use the Conda/Postgres path in:

```text
docs/RUNNING_WITHOUT_DOCKER.md
```

## Tests

Classic UNO has focused engine tests:

```bash
pnpm --filter @tabletop/game-core test
```

## Security Model

- no public signup by default
- admin-created users
- password hashes via Argon2id
- HTTP-only session cookie
- socket auth via session cookie
- room access by private code
- hidden game state filtered per viewer
- robots disallowed

## Current MVP

Implemented:

- account login/logout/session persistence
- admin user seeding
- admin-created friend accounts
- private room create/join
- lobby ready flow
- host start/pause/resume
- reconnect by permanent `userId`
- in-memory server-authoritative rooms
- snapshot persistence
- Classic UNO game module
- chat with rate limit
- match result/stat/XP services
- profile, leaderboards, admin UI scaffolding

See `docs/` for architecture and extension notes.
