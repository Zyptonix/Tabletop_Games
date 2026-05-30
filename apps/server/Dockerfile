FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @tabletop/db prisma:generate
CMD ["sh", "-c", "pnpm --filter @tabletop/db prisma:push && pnpm --filter @tabletop/db prisma:seed && pnpm --filter @tabletop/server start"]
