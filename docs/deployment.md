# deployment

Production is one Coolify application, `moventis-lleida`, on the personal VPS. It runs `docker-compose.yml` from the root of this repository: three services, `postgres`, `web` and `scraper`. The `web` service is published at `https://moventis-lleida.joeltaylor.business`; the other two have no public address.

Coolify does not build anything. GitHub Actions builds both images, pushes them to GHCR, and then tells Coolify to pull:

| service   | image                                     | Dockerfile                |
| --------- | ----------------------------------------- | ------------------------- |
| `web`     | `ghcr.io/jtayped/moventis-lleida-web`     | `apps/web/Dockerfile`     |
| `scraper` | `ghcr.io/jtayped/moventis-lleida-scraper` | `apps/scraper/Dockerfile` |

Both carry two tags: the full commit sha, which is immutable and is the rollback handle, and `main`, which the compose file pulls and every release moves. The reasoning is in [decisions/0001-build-in-ci-deploy-images.md](decisions/0001-build-in-ci-deploy-images.md). The practical consequence: **`docker-compose.yml` must never gain a `build:` key.**

## what triggers a deploy

A merge to `main`, in four steps:

1. `ci` runs on the push to `main` (lint, typecheck, tests, the Next build, both Docker builds with `push: false`).
2. `release` (`.github/workflows/release.yml`) starts from that run finishing — `on: workflow_run` — and does nothing unless it concluded `success` on `main`. `workflow_run` checks neither of those itself, so each job tests them.
3. `build-web` and `build-scraper` build from the exact `head_sha` of that CI run and push `:<sha>` and `:main`. They reuse CI's `type=gha` cache scopes (`web`, `scraper`), so the layers the pull request already built are warm.
4. `deploy` runs `.github/scripts/deploy-coolify.mjs`: POST the Coolify deploy webhook, poll `GET /api/v1/deployments/<uuid>` until `finished`, then poll the public health URL. An accepted webhook is not treated as a successful deploy, and a container that never becomes healthy fails the workflow.

The old GitHub → Coolify push webhook is gone. Nothing outside this workflow deploys, and a commit that does not build cannot reach the host at all.

Nothing is filtered by path: a docs-only merge still rebuilds and redeploys. That now costs Actions minutes rather than VPS CPU, and it is simpler than a path filter that has to be kept in step with what the Dockerfiles copy.

## manual deploy

Actions → **release** → **Run workflow**, with `image_tag` left empty. It rebuilds both images from the chosen ref and deploys them. Use it after changing a repository variable — the bundle only picks up a new `NEXT_PUBLIC_*` value when the image is rebuilt.

## rollback

Two ways, both of which need a sha that has already been published.

- **The workflow.** Actions → **release** → **Run workflow**, `image_tag` = the 40-character commit sha. The builds are skipped and `deploy` calls Coolify's `POST /api/v1/applications/<uuid>/rollback` with that tag. The script rejects anything that is not 40 lowercase hex characters, so a rollback cannot silently land on the moving `main` tag. Note the tag is the bare sha, not `sha-<hex>` as in some sibling repos.
- **Coolify.** Set `TAG` on the application to the sha and redeploy; `docker-compose.yml` reads `${TAG:-main}`. Unset it again afterwards, or the next release pushes `:main` and nothing picks it up.

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

**GitHub Actions secrets** — `COOLIFY_WEBHOOK_URL` (Coolify's `/api/v1/deploy?uuid=<app>&force=false`) and `COOLIFY_TOKEN` (a Coolify API token with deploy permission). These are genuinely secret: the webhook URL carries the application uuid and the token authorises deployments.

**Coolify environment variables** — everything read at runtime: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `WEB_PORT`, and optionally `TAG`. `.env.example` lists the full set. The `NEXT_PUBLIC_*` entries also present on the Coolify application are inert as far as the browser is concerned — the bundle was compiled with the repository variables' values, and editing the Coolify copy changes nothing a visitor sees.

No registry credential is needed on the server: the repository and both packages are public.

## when it does not deploy

In order of likelihood:

1. **`release` never ran.** It is skipped unless the `ci` run it hangs off concluded `success` **and** was on `main`. A red CI, or a push to any other branch, produces no release at all — this is the intended behaviour, not a fault. Check Actions → release for a run against that sha.
2. **The GHCR push failed.** The job needs `packages: write` and the `GITHUB_TOKEN` login; a first push also has to be allowed to create the package. A 403 from `docker/build-push-action` is this.
3. **Coolify refused the webhook.** A 401 means `COOLIFY_TOKEN` expired or was rotated; the script fails loudly rather than assuming the deploy happened. A missing deployment uuid in the response means the webhook URL's `uuid` no longer matches an application.
4. **The pull failed on the host.** Coolify's deployment log shows it — usually a tag that does not exist, which means `TAG` was left pinned to a sha that was never published, or the build jobs were skipped.
5. **The health check never passed.** The deployment finished but `/api/health` did not answer within two and a half minutes. The container logs in Coolify are the next stop; a `web` container that boots but cannot reach postgres looks exactly like this.

## health

`web` answers `GET /api/health` with `200 ok`; its Docker healthcheck polls that, and so does the `deploy` job through `COOLIFY_HEALTH_URL`. `scraper` has no HTTP server and instead touches `/tmp/heartbeat` every 30 seconds; its healthcheck fails if the file is older than two minutes, which catches a hung event loop that a "process is running" check would miss.
