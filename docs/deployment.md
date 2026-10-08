# deployment

Production is two Coolify resources in the `moventis-lleida` project on the personal VPS:

- **`moventis-web`**, a Docker Image application running `ghcr.io/jtayped/moventis-lleida-web:main`, published at `https://moventis-lleida.joeltaylor.business`.
- **`moventis-lleida`**, a Docker Compose application running `docker-compose.yml` from the root of this repository: `moventis-postgres` and `scraper`, neither with a public address. `moventis-postgres` is also on Coolify's shared `coolify` network, which is how `moventis-web` reaches it. The service is not called `postgres` because a service's name is its hostname on every network it joins, and on `coolify` that name already belongs to Coolify's own database.

They are split because only an application rolls. Coolify starts a new `moventis-web` container beside the old one, waits for its health check, then removes the old one, so a deploy never takes the site down. A compose application stops every service before it starts the replacements, so while `web` lived in the compose file every deploy was a stretch of "no available server".

Coolify does not build anything. GitHub Actions builds both images, pushes them to GHCR, and then tells Coolify to pull:

| runs in           | image                                     | Dockerfile                |
| ----------------- | ----------------------------------------- | ------------------------- |
| `moventis-web`    | `ghcr.io/jtayped/moventis-lleida-web`     | `apps/web/Dockerfile`     |
| `moventis-lleida` | `ghcr.io/jtayped/moventis-lleida-scraper` | `apps/scraper/Dockerfile` |

`moventis-web`'s settings live in Coolify: port 3000, an HTTP health check on `/api/health` against host `127.0.0.1` (Next listens on IPv4 only, and the image's busybox `wget` tries `localhost` as IPv6 first), interval 5s, 10 retries, 10s start period. Its labels route its HTTPS router through `deploy-retry@file` and its service through `fast-dial@file`, both defined in `rolling-deploys.yaml` in the proxy's dynamic configuration on the host. They retry the fraction of a second after the old container is removed in which Traefik still sends it requests. Coolify regenerates the labels when the domain changes, which drops those two lines, so put them back after any domain change. Leave port mappings, a custom container name and consistent container names unset, since any of them makes Coolify stop the old container first.

Both carry two tags: the full commit sha, which is immutable and is the rollback handle, and `main`, which the compose file pulls and every release moves. The reasoning is in [decisions/0001-build-in-ci-deploy-images.md](decisions/0001-build-in-ci-deploy-images.md). The practical consequence: **`docker-compose.yml` must never gain a `build:` key.**

## what triggers a deploy

A merge to `main`, in four steps:

1. `ci` runs on the pull request (lint, typecheck, tests, the Next build, both Docker builds with `push: false`). When it passes, its `passed` job uploads an artifact named `ci-passed-<tree sha>` for the pull request's merge commit.
2. `release` (`.github/workflows/release.yml`) runs on the push to `main`. Its `tree` job looks that artifact up for the pushed commit's tree. A merge of an up-to-date branch puts exactly that tree on `main`, finds it, and skips `ci`. A direct push, or a merge onto a `main` that moved after the pull request's last run, finds nothing, and `release` calls `ci.yml` in full first. Nothing builds unless one of the two passed.
3. `build-web` and `build-scraper` build the pushed commit and push `:<sha>` and `:main`. They use CI's `type=gha` cache scopes (`web`, `scraper`). GitHub lets a pull request read what `main` cached but not the other way round, so a release reads what the previous release left.
4. `deploy` runs `.github/scripts/deploy-coolify.mjs` once per resource: POST the Coolify deploy webhook, poll `GET /api/v1/deployments/<uuid>` until `finished`, then poll the public health URL. An accepted webhook is not treated as a successful deploy, and a container that never becomes healthy fails the workflow. The compose app goes first, and only when the push touched what it runs: `apps/scraper`, `packages` (the scraper applies the Prisma schema as it starts), the lockfile or the compose file. Deploying it recreates `moventis-postgres`, so the site's queries fail for the few seconds the database takes to come back; a push that changes only `apps/web` never does that. `moventis-web` deploys every time.

The old GitHub → Coolify push webhook is gone. Nothing outside this workflow deploys, and a commit that does not build cannot reach the host at all.

Nothing is filtered by path: a docs-only merge still rebuilds and redeploys. That now costs Actions minutes rather than VPS CPU, and it is simpler than a path filter that has to be kept in step with what the Dockerfiles copy.

## manual deploy

Actions → **release** → **Run workflow**, with `image_tag` left empty. It rebuilds both images from the chosen ref and deploys them, running `ci` first if that tree never passed it, or always with `run_ci` ticked. Use it after changing a repository variable — the bundle only picks up a new `NEXT_PUBLIC_*` value when the image is rebuilt.

## rollback

Two ways, both of which need a sha that has already been published.

- **The workflow.** Actions → **release** → **Run workflow**, `image_tag` = the 40-character commit sha. The builds are skipped and `deploy` calls Coolify's `POST /api/v1/applications/<uuid>/rollback` with that tag. The script rejects anything that is not 40 lowercase hex characters, so a rollback cannot silently land on the moving `main` tag. Note the tag is the bare sha, not `sha-<hex>` as in some sibling repos.
- **Coolify.** For the scraper, set `TAG` on `moventis-lleida` to the sha and redeploy; `docker-compose.yml` reads `${TAG:-main}`. Unset it again afterwards, or the next release pushes `:main` and nothing picks it up. For the site, set `moventis-web`'s image tag to the sha and redeploy, then set it back to `main`.

A rollback moves code, not data. The scraper's `db:push` on start is not reversed by redeploying an older image, so a rollback across a schema change needs the schema looked at by hand.

## environment

Values live in two places now, and which one matters depends on when the value is read.

**GitHub repository variables** — read at image build time by `release`, inlined into the browser bundle by Next, and therefore public by design (they ship to every visitor in the JavaScript). Variables, not secrets, deliberately: labelling a public value a secret is how a real one ends up filed beside it.

| variable                       |
| ------------------------------ |
| `NEXT_PUBLIC_MAPS_API_KEY`     |
| `NEXT_PUBLIC_MAPS_MAP_ID`      |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` |
| `COOLIFY_HEALTH_URL`           |

The Maps key is protected by its HTTP referrer restriction and its quota, not by being hidden. Changing any of the four takes effect only on the next image build.

**GitHub Actions secrets** — `COOLIFY_WEBHOOK_URL` (Coolify's `/api/v1/deploy?uuid=<compose app>&force=false`), `COOLIFY_WEB_WEBHOOK_URL` (the same for `moventis-web`) and `COOLIFY_TOKEN` (a Coolify API token with deploy permission). These are genuinely secret: the webhook URLs carry the resource uuids and the token authorises deployments.

**Coolify environment variables** — everything read at runtime. On `moventis-lleida`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and optionally `TAG`. On `moventis-web`: `DATABASE_URL`, pointing at `moventis-postgres:5432` with the same credentials, and runtime copies of the `NEXT_PUBLIC_*` values. `.env.example` lists the full set. Those `NEXT_PUBLIC_*` copies are inert as far as the browser is concerned — the bundle was compiled with the repository variables' values, and editing the Coolify copy changes nothing a visitor sees.

No registry credential is needed on the server: the repository and both packages are public.

## when it does not deploy

In order of likelihood:

1. **`release` stopped before the builds.** Its `tree` job found no passing `ci` run for that tree, ran `ci` itself, and `ci` failed. That is the intended behaviour, not a fault; the run's `ci` jobs have the output.
2. **The GHCR push failed.** The job needs `packages: write` and the `GITHUB_TOKEN` login; a first push also has to be allowed to create the package. A 403 from `docker/build-push-action` is this.
3. **Coolify refused the webhook.** A 401 means `COOLIFY_TOKEN` expired or was rotated; the script fails loudly rather than assuming the deploy happened. A missing deployment uuid in the response means the webhook URL's `uuid` no longer matches an application.
4. **The pull failed on the host.** Coolify's deployment log shows it — usually a tag that does not exist, which means `TAG` was left pinned to a sha that was never published, or the build jobs were skipped.
5. **The health check never passed.** On `moventis-web`, Coolify keeps the old container and marks the deployment failed; its log carries the check's output. A container that boots but cannot reach postgres looks like this: check that the compose app is up and that `moventis-postgres` still resolves on the `coolify` network.

## health

`web` answers `GET /api/health` with `200 ok` after a `SELECT 1`; Coolify's health check on `moventis-web` polls that, and so does the `deploy` job through `COOLIFY_HEALTH_URL`. `scraper` has no HTTP server and instead touches `/tmp/heartbeat` every 30 seconds; its healthcheck fails if the file is older than two minutes, which catches a hung event loop that a "process is running" check would miss.
