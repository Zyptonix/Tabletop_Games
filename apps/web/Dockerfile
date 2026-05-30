FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-core/package.json packages/game-core/package.json
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @tabletop/web build
CMD ["pnpm", "--filter", "@tabletop/web", "start"]
