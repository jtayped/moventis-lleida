# 0001. build in ci, deploy prebuilt images

**status:** accepted, 2026-09-17

## context

Coolify's default is to clone the repository on the deploy host and build there, which is what this project did from the start. Every merge to `main` ran `docker compose build` on the VPS: about two and a half minutes, 65 seconds of it `next build`.

The VPS is shared with other projects. It is not a build machine.

## decision

GitHub Actions builds both images and pushes them to `ghcr.io/jtayped/moventis-lleida-web` and `ghcr.io/jtayped/moventis-lleida-scraper`, tagged with the commit sha and with `main`. Coolify deploys `docker-compose.yml`, which names those images and contains no `build:` key. No build runs on the host.

## consequences

**why.** A Next compile is the most memory-hungry thing this project does, and on a shared box a build that swaps degrades every other container while it runs. Moving it off the host is the difference between this project being a good tenant and being the reason someone else's app went down. The deploy itself becomes a pull and a container swap.

**what it buys beyond that.**

- Images are tagged by commit sha, so redeploying an earlier sha is a real rollback rather than a revert-and-rebuild.
- An image is only published from `main` after `ci` passed, so a commit that does not build can no longer reach the host at all. Under the old flow the host found out by failing the build itself.
- Build cache moves to Actions, on the same `type=gha` scopes the pull request's Docker jobs already warm, and the VPS stops accumulating layers.
- The deploy is verified: the workflow polls Coolify until the deployment reports `finished` and the site answers `/api/health`, instead of firing a webhook and hoping.

**what it costs.** A deploy now depends on GitHub Actions and GHCR being up. `NEXT_PUBLIC_*` values move from Coolify's build arguments to GitHub repository variables, and their copies on the Coolify application become inert for the browser bundle — a trap for anyone who changes one there and waits for it to take effect. And the compose file must never gain a `build:` key, which is exactly the sort of thing that gets added back by someone being helpful.

## revisit when

The project gets a host with room to build on. That would make this optional rather than necessary; it would still be worth keeping for the sha tags alone.
