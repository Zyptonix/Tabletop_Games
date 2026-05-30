# Running Without Docker

Use this path when Docker Desktop or WSL is being difficult.

You still need PostgreSQL, because the app stores users, rooms, snapshots, match results, stats, and leaderboards in Postgres. Conda can provide Node and Postgres locally.

## 1. Create A Conda Environment

```powershell
cd "B:\Projects\Tabletop_Games\tabletop-arena"
conda create -y -p .\.conda -c conda-forge nodejs=22 postgresql=16
conda activate .\.conda
```

Enable Corepack's pnpm:

```powershell
corepack pnpm --version
```

## 2. Start Local PostgreSQL

From the project root:

```powershell
cd "B:\Projects\Tabletop_Games\tabletop-arena"
mkdir .pgdata
initdb -D .pgdata -U postgres --auth=trust
pg_ctl -D .pgdata -l postgres.log start
createdb -U postgres tabletop_arena
```

If `.pgdata` already exists after the first run, start Postgres with:

```powershell
pg_ctl -D .pgdata -l postgres.log start
```

Stop it later with:

```powershell
pg_ctl -D .pgdata stop
```

## 3. Configure `.env`

Create `.env` from the example:

```powershell
Copy-Item .env.example .env
notepad .env
```

For Conda Postgres, use:

```env
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/tabletop_arena?schema=public
PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

Also set strong values:

```env
SESSION_SECRET=replace-with-a-long-random-session-secret
JWT_SECRET=replace-with-a-long-random-jwt-secret
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.local
ADMIN_PASSWORD=change-this
```

## 4. Install And Prepare The Database

```powershell
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:push
corepack pnpm db:seed
```

## 5. Run The App

Terminal 1:

```powershell
conda activate .\.conda
cd "B:\Projects\Tabletop_Games\tabletop-arena"
corepack pnpm dev:server
```

Terminal 2:

```powershell
conda activate .\.conda
cd "B:\Projects\Tabletop_Games\tabletop-arena"
corepack pnpm dev:web
```

Open:

```text
http://localhost:3000
```

Log in with the admin credentials from `.env`.

## Notes

- This mode does not use Caddy or Docker Compose.
- The browser talks directly to the backend on `http://localhost:4000`.
- Cloudflare Tunnel can still expose the web dev server for a quick test, but the Docker/Caddy setup is cleaner later.
- The PowerShell `profile.ps1 cannot be loaded` warning is unrelated to this project.
