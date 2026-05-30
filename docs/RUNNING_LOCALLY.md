# Running Locally

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:8080
```

## Development

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Services:

- web: `http://localhost:3000`
- server: `http://localhost:4000`
- proxy: `http://localhost:8080`

Use the proxy URL for normal browser testing because it matches the one-link Cloudflare deployment shape.
