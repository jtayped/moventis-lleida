FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── Pruner: trim the monorepo to only what the web app needs ───────────────────
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @moventis/web --docker

# ── Installer: install the pruned dependency set ───────────────────────────────
FROM base AS installer
WORKDIR /app
# Only package manifests + pruned lockfile — cached unless deps change
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Builder: build Next.js ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must arrive as build args here — setting them only at container runtime is too late.
ARG NEXT_PUBLIC_MAPS_API_KEY
ARG NEXT_PUBLIC_MAPS_MAP_ID
ENV NEXT_PUBLIC_MAPS_API_KEY=$NEXT_PUBLIC_MAPS_API_KEY
ENV NEXT_PUBLIC_MAPS_MAP_ID=$NEXT_PUBLIC_MAPS_MAP_ID
ENV SKIP_ENV_VALIDATION=1
RUN pnpm --filter=@moventis/db db:generate
RUN pnpm --filter=@moventis/web build

# ── Runner: minimal image using Next.js standalone output ──────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
