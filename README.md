# Tabletop Arena — Local LAN Edition + Strategic Shockwave

A friends-first browser game server for a trusted local network. Run the app on one Windows PC, share its LAN URL, and let colleagues sign in from their own browsers.

**No Docker. No cloud database. No tunnel. No admin-created player accounts.** The host PC runs Node.js and connects to its native PostgreSQL service. Existing Next.js, Express, Socket.IO, game engines, room flow, match storage, and leaderboards are retained.

## Quick start (Windows)

Prerequisites: Node.js 20+ and a running native PostgreSQL server with an application database and user.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

The interactive wizard asks for the host PC's private IPv4 and PostgreSQL connection, creates/updates `.env`, generates secrets, generates Prisma Client, applies the database schema, optionally requests a Windows Firewall rule scoped to the Private profile/LocalSubnet, then starts the web app, API, and local reverse proxy. It avoids Docker and does not start Cloudflare Tunnel.

Open the LAN URL shown in the terminal (usually `http://192.168.x.x:8080`) on the host and colleagues' PCs. Everyone should be on the same office LAN/Wi-Fi; keep the host PC and terminal running while playing. Do not use `localhost` on a colleague's PC.

## PostgreSQL

Create the database and login once if you do not already have them. Example SQL (change the password to your own):

```sql
CREATE USER tabletop WITH PASSWORD 'change-this-password';
CREATE DATABASE tabletop_arena OWNER tabletop;
```

The wizard can reuse a native `DATABASE_URL` already in `.env` or ask for host, port, database, user, and password. A Docker-only host such as `postgres` is not valid for a native Windows process; enter `127.0.0.1` when PostgreSQL is on the host PC.

## Player accounts and leaderboard

Players can create accounts on the sign-in page themselves. Usernames must be 3–24 characters and use letters, numbers, `_`, or `-`. Any non-empty password is accepted by design for this private, low-friction game setup, including `1234`. Passwords are still hashed before being written to PostgreSQL. Player accounts, profiles, match results, XP, and leaderboards use the existing database schema. Use a game-only password, not one from a personal or work account.

## Games and UNO performance

Strategic Shockwave is included in this patch: a 2–10 player Bomberman-style arena game integrated with the existing authoritative room engine.

The visual card artwork remains, with lightweight CSS hover/lift feedback. The patch removes the high-cost card entrance/exit spring choreography and table-wide draw/hand-transfer/turn/seat overlay layers that repeatedly measured DOM positions and animated multiple objects. The app also honors reduced-motion preferences and avoids backdrop blur on the low-power UI. If the host PC still struggles, close other tabs and use a current Chromium-based browser; the authoritative game engine remains server-side.

## Services and ports

- `8080/TCP`: one browser URL for the app, API proxy, and Socket.IO.
- `3000/TCP`: Next.js service, proxied internally.
- `4000/TCP`: Express + Socket.IO service, proxied internally.
- PostgreSQL default is `127.0.0.1:5432` unless configured otherwise.

Only port 8080 needs to be reachable from colleagues' PCs. The script uses `--no-kill-ports` so it will not force-kill unrelated processes occupying a port. Logs are written to `logs/dev/`.

## Developer commands

```bash
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:push
corepack pnpm typecheck
corepack pnpm --filter @tabletop/game-core test
```

For local LAN hosting, prefer the PowerShell launcher rather than `pnpm dev` so the proxy binds to the network interface and CORS/cookie settings use your selected LAN URL.

See [`docs/LOCAL_LAN_SETUP.md`](docs/LOCAL_LAN_SETUP.md) for troubleshooting and network notes.
