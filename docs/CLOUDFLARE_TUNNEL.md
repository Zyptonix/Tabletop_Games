# Cloudflare Tunnel

This project is designed for a home PC or private server behind CGNAT.

Start the app:

```bash
docker compose up --build
```

Expose the reverse proxy:

```bash
cloudflared tunnel --url http://localhost:8080
```

Cloudflare prints a public HTTPS URL such as:

```text
https://random.trycloudflare.com
```

Send that one link to friends. They do not need Cloudflare accounts, VPNs, or installed apps.

## Important Notes

- The quick tunnel URL changes when the tunnel restarts.
- The Node server keeps rooms alive if only the tunnel drops.
- Friends can log in again through the new link and reconnect by account.
- Keep the PC awake during long games.
- Do not expose PostgreSQL; only expose `localhost:8080`.

For a stable URL later, create a named Cloudflare Tunnel and point your own domain at the reverse proxy.
