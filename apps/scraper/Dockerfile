FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── Pruner: trim the monorepo to only what the scraper needs ───────────────────
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @moventis/scraper --docker

# ── Installer: install the pruned dependency set ───────────────────────────────
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

# ── Runner ─────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
# Generate Prisma client for the target OS (Alpine Linux)
RUN pnpm --filter=@moventis/db db:generate
CMD ["pnpm", "--filter=@moventis/scraper", "start"]
