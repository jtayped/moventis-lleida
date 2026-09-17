# deployment

Production is one Coolify application, `moventis-lleida`, on the personal VPS. It builds and runs `docker-compose.yml` from the root of this repository: three services, `postgres`, `web` (`apps/web/Dockerfile`) and `scraper` (`apps/scraper/Dockerfile`). The `web` service is published at `https://moventis-lleida.joeltaylor.business`; the other two have no public address.

There is no separate image registry and no GitHub Actions deploy step. Coolify clones `main`, runs `docker compose build` on the server, and swaps the containers.

## what triggers a deploy

A push to `main`. The repository has a GitHub webhook pointing at Coolify's manual-source endpoint (`/webhooks/source/github/events/manual`), signed with the application's webhook secret. Coolify verifies the signature, checks the branch is `main`, and queues a deployment.

`main` only changes when a pull request merges, and a pull request only merges with CI green, so every deploy has passed lint, typecheck, tests, the Next build and both Docker builds first.

Nothing is filtered by path: a docs-only merge redeploys too. That costs a few minutes of server CPU and nothing else, and it is simpler than a path filter that has to be kept in step with what the Dockerfiles copy.

## when it does not deploy

The failure in September 2026 was silence: the application was configured as a GitHub App source that did not exist (source id 0), and the repository had no webhook at all, so pushes went nowhere and every deploy since June had been started by hand from the dashboard. Look in this order:

1. **GitHub → Settings → Webhooks.** The Coolify hook should be there, active, with recent deliveries answering 200. A `pong` body on a ping means the endpoint and the secret are fine. A 401 means the secret in GitHub no longer matches `manual_webhook_secret_github` on the application; copy it again from Coolify.
2. **Coolify → the application → Deployments.** A webhook-triggered deployment shows `is_webhook: true` in the API and "Webhook" as its source in the dashboard. If GitHub reports a 200 but nothing appears here, check the branch: the hook fires for every push, and Coolify drops pushes to branches other than `git_branch`.
3. **The build itself.** `web` fails on a Next build error or a missing `NEXT_PUBLIC_*` build argument; `scraper` fails on `prisma db push` refusing a destructive schema change (see CLAUDE.md, "Commands"). Both are visible in the deployment log.

## environment

Runtime and build-time variables live in Coolify (application → Environment Variables), not in the repository. `.env.example` lists them. `NEXT_PUBLIC_*` values are inlined into the browser bundle during the image build, so they are passed as build args in `docker-compose.yml` and must exist in Coolify before the build, not only at runtime.

## health

`web` answers `GET /api/health` with `200 ok`; its Docker healthcheck polls that. `scraper` has no HTTP server and instead touches `/tmp/heartbeat` every 30 seconds; its healthcheck fails if the file is older than two minutes, which catches a hung event loop that a "process is running" check would miss.
