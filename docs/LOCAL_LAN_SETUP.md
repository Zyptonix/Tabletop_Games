# Local LAN setup (Windows, no Docker)

## What this mode does

- Keeps the existing Next.js + Express + Socket.IO app.
- Runs Node services natively on the host PC. PostgreSQL is a normal Windows service/database, not a container.
- Uses the same-origin proxy at port `8080`, so browser API requests and Socket.IO share the LAN address.
- Does not start Cloudflare Tunnel or any other internet-facing service.
- Lets each player register directly. User accounts, match scores, XP and leaderboard statistics remain in the configured PostgreSQL database on the host PC.

## First run on the host PC

1. Install Node.js 20+ and ensure PostgreSQL is installed and running.
2. Ensure a PostgreSQL database and login already exist. For example, from `psql` as a database administrator (choose your own password):

   ```sql
   CREATE USER tabletop WITH PASSWORD 'change-this-password';
   CREATE DATABASE tabletop_arena OWNER tabletop;
   ```

   If those already exist, don't recreate them. The DB user must be able to create/update the application's tables in `tabletop_arena`.

3. From the repository root, run PowerShell:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
   ```

4. The wizard asks for the host PC's LAN IPv4 and database connection (or lets you reuse a compatible native PostgreSQL URL already in `.env`). It creates/updates `.env`, generates session secrets, generates Prisma Client, applies the Prisma schema, optionally requests a private-LAN Windows Firewall rule, and starts web/server/proxy services.
5. Open the displayed `http://HOST-LAN-IP:8080` on the host PC and each colleague's PC. Keep the terminal and host PC running during play.
6. Every player selects **Make an account**, enters a username and password, and is signed in immediately. A simple password such as `1234` is accepted; don't reuse a work or personal password. The server still stores a password hash, never the plain-text password.

## Network notes

- Everyone must be on the same trusted office LAN/Wi-Fi/VLAN. Guest Wi-Fi/client isolation may prevent peer connections.
- Share the host PC's private IPv4 address, not `localhost`. Other computers' `localhost` points to their own machines.
- The web entry point uses TCP `8080`. The API (`4000`) and Next dev server (`3000`) are proxied internally and should not need separate firewall openings.
- The wizard attempts to create an inbound firewall rule only for TCP 8080, the Private profile, and `LocalSubnet`. If UAC is declined, add that rule from an Administrator PowerShell prompt.
- This is for a trusted LAN. Basic passwords are intentionally low-friction; anyone with LAN access can visit the signup page. Use an office network you trust and do not expose the port to the public internet.
- The `--no-kill-ports` option avoids killing other applications if a selected port is occupied. Change the conflicting app's port or stop that process yourself.

## Start / stop

- Start: `powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1`
- Stop: `Ctrl+C` in the launcher terminal.
- Logs: `logs/dev/` (`all.log`, `web.log`, `server.log`, `proxy.log`).
- Re-run the wizard to update LAN IP or PostgreSQL connection. Your `.env` is ignored by Git and contains local secrets.
- Backups of source files made by the one-time patch script are in `.tmp/local-lan-redesign-backup/` (the repository already ignores `.tmp`).

## If setup fails

- **Database connection error:** start the PostgreSQL Windows service; verify host, port, database name, username/password. If the database doesn't exist, create it first using the SQL above.
- **`P1001` / can't reach database:** the server is not accepting connections at the configured host/port.
- **`P1003` / database missing:** create the database, then rerun the launcher.
- **Colleagues can't open the URL:** confirm both PCs are on the same LAN, the selected LAN IP is still current, the Private firewall rule exists, and port 8080 is free.
- **Login works but room join fails:** check `logs/dev/server.log` and `logs/dev/proxy.log`; use the LAN URL displayed by the wizard rather than a direct port 3000 URL.
- **Rollback:** inspect `git diff` and `git status --short` first. Tracked edits include README, `apps/web/src`, `apps/server/src`, `packages/shared/src`, `packages/game-core/src`, and `scripts/dev-proxy.mjs`. New Shockwave files under `apps/web/src/features/games/strategic-shockwave`, `packages/game-core/src/games/strategic-shockwave`, its test, and `docs/STRATEGIC_SHOCKWAVE.md` should be removed only if you are intentionally rolling the patch back. Don't restore `.env` or delete database data unless you intentionally want to reset local configuration/data.
