# contributing

Short form of how this repo is worked on. CLAUDE.md (mirrored as AGENTS.md) is the long form: architecture, the traps that have already bitten, and the reasoning behind the odd-looking parts.

## the shape of the repo

pnpm + Turborepo workspace.

| path               | what it is                                                     |
| ------------------ | -------------------------------------------------------------- |
| `apps/web`         | Next.js 15 app: the map, the stop drawer, the settings panel   |
| `apps/scraper`     | nightly job that discovers lines, stops and operating days     |
| `apps/expo`        | React Native shell, early stage                                |
| `packages/api`     | tRPC routers and all business logic                            |
| `packages/db`      | Prisma client and schema                                       |
| `packages/shared`  | types, Zod schemas, constants and pure geometry helpers        |
| `tooling/*`        | shared ESLint and TypeScript configs                           |

## getting it running

Node 22 (`.nvmrc`), pnpm 9 (`packageManager` in `package.json`; `corepack enable` picks it up) and a PostgreSQL database.

```sh
pnpm install --frozen-lockfile
cp .env.example .env        # fill in DATABASE_URL and the Google Maps keys
pnpm --filter @moventis/db db:push
pnpm dev:web
```

`docker-compose.dev.yml` starts a local Postgres if you do not have one. The scraper fills the database: `pnpm --filter @moventis/scraper sync:dev` runs one sync and exits.

## checks

CI runs these on every pull request, so a green local run is normally a green pipeline:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build --filter=@moventis/web
```

Notes:

- `pnpm test` is deterministic: no network, no database. The Moventis API canary is `pnpm test:live`, opt-in, and never runs in CI.
- CI also builds both Dockerfiles. Production runs `docker compose build` from them, so a Dockerfile that stops building is a broken deploy that `pnpm build` alone cannot catch.
- `pnpm format:check` exists but is not enforced yet. Run `pnpm format:write` on the files you touch.

## branches and pull requests

`main` is protected: every change lands through a pull request with CI green. Push directly to `main` and GitHub refuses it.

Branch names say what they carry: `feat/…`, `fix/…`, `chore/…`, `docs/…`. Keep a pull request to one topic. A feature, a bug fix and a CI change are three pull requests, not one.

Commit subjects are lowercase, imperative, typed and scoped:

```
feat(web): show how much an arrival has drifted since first seen
fix(api): let getByExternalIds see soft-deleted stops
chore(ci): build both Dockerfiles on every pull request
docs: record how a push to main reaches production
```

Scopes in use: `web`, `api`, `db`, `shared`, `scraper`, `expo`, `ci`, `deps`. The subject says what changed and, where it fits, why.

## deploying

Merging to `main` deploys. Nothing else does. `docs/deployment.md` explains the path from a merge to a running container and what to check when it does not happen.

## comments and docs

Comments explain the code, not the process that produced it: no ticket numbers, no plan names. When a change alters a command, a package, or how data flows, update CLAUDE.md and AGENTS.md in the same pull request. Both files carry a maintenance note at the top saying what does and does not belong there.
