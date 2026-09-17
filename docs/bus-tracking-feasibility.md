# feasibility: following one bus until it arrives

The ask: you are going somewhere in twenty minutes, you open a stop, you long-press one arrival and say "follow this one", and from then on a notification shows that bus's time and keeps it fresh, so you can put the phone away and still know whether to run.

Short answer: **feasible on Android, and only there in the form described. On iPhone it works only while the app is installed to the home screen and the tab is open, which is not the use case.** The honest version for iOS is a live "following" strip inside the app, not a notification. The parts of the work that are shared between both are the parts worth building first, and one of them (the stop-scoped bus identity) already exists in the arrival-drift feature.

## what has to be true for the notification to work

Three separate capabilities, each with its own platform story.

### 1. knowing which bus is "this one" across refreshes

Moventis returns arrivals per journey as bare times with no vehicle id. `packages/shared/src/lib/arrival-drift.ts` already solves this for a stop: an order-preserving alignment that follows one arrival from refresh to refresh and remembers its first prediction. Following a bus means keeping one of those tracks alive and reading its `lastMs`. This is done and tested; no platform dependency.

Limits it carries: the track lives at one stop, and the API lists about five upcoming arrivals per journey, so a bus more than roughly an hour out is not visible at all and cannot be followed yet. The alignment can lose the bus when two on the same journey bunch within a couple of minutes of each other; when it does, the drift shows a jump and the follow should say "we lost this bus" rather than quietly latch onto the next one.

### 2. a notification that updates in place

- **Android (Chrome, Samsung Internet, Firefox):** `ServiceWorkerRegistration.showNotification(title, { tag: "follow-<stop>-<journey>", renotify: false, silent: true })` replaces a notification with the same `tag` in place, without buzzing again. That is exactly the "tracking, refreshing" behaviour wanted. Works from a normal tab and from an installed PWA. Requires the user to grant notification permission once.
- **iOS Safari (16.4 and later):** notifications exist only for web apps added to the home screen, only via Web Push (a server has to send them), and never from a tab. A page cannot call `showNotification` on its own. Silent, in-place-updating pushes are not reliably supported; each push tends to alert. So the "quiet ticker in the notification shade" model does not exist on iPhone.
- **Desktop:** works everywhere, and nobody is going to use it.

### 3. keeping it refreshed when the app is not in front

This is the real constraint. Web pages get no background execution. Once the tab is backgrounded, timers throttle to about once a minute and then stop; when the phone locks or the browser is swiped away, nothing runs.

Two designs follow from that:

**A. Client-driven (no server work).** The page refreshes `stops.get` every 30 s while it is open and redraws the notification. When the user switches away, the notification stays with its last value plus a "darrera actualització fa X" line, and refreshes again when they come back. Android delivers the described experience while the app is in front or recently backgrounded; after a few minutes it goes stale, and the notification has to say so. Cost: a few hours. Risk: none new, it reuses `stops.get` and the drift tracks.

**B. Server-driven (Web Push).** The user subscribes (VAPID keys, `PushManager.subscribe`), the browser gives us an endpoint, and a server-side follower polls Moventis for that stop and pushes the updated time on each change. This works with the phone locked, on Android and on installed iOS web apps. It needs: a `PushSubscription` table and a `follows` table; VAPID keys in the environment; a poller that runs only while at least one follow is active (one Moventis call every 30 s per followed stop, through the same 5 req/s gate as everything else); the service worker `push` handler; expiry when the bus arrives or after ~90 minutes; unsubscribe on notification dismiss. Cost: a couple of days, a schema change, and a new class of running state on the server. Risk: iOS still alerts on each push rather than updating silently, so the iPhone experience is "a buzz every few minutes", which some people will hate; that needs a per-follow "only tell me when it changes by ≥2 min" rule to be tolerable.

## recommendation

Build in this order, each step useful on its own:

1. **In-app "following" strip (both platforms, now).** Long-press an arrival card → "segueix aquest bus". A sticky strip above the map shows the line, destination, live countdown and the drift chip, backed by the existing drift track, refreshing every 30 s while the app is open. It survives closing the drawer and switching lines. It is the piece iPhone users can actually have, and the notification variants are a thin layer on top of it.
2. **Android in-place notification (design A).** Behind the follow, when `Notification.permission` is granted and `showNotification` is available: same content, same `tag`, marked stale after 90 s without a refresh. No server change.
3. **Web Push (design B) only if 1 and 2 show real use.** Umami can answer that: count `bus followed` and how long follows stay active. Do not build the poller speculatively.

Things to decide before step 1: the long-press gesture has no discoverable affordance on a touch screen (add a small "segueix" action in the card as well); one follow at a time or several (one keeps the strip simple and the poller cheap); and what "arrived" means for ending the follow (the arrival dropping out of the API is the only signal there is, and it also fires when the bus stops reporting — say "ha arribat o ha deixat d'informar", not just "ha arribat").

## what this does not solve

Following a bus you are *on*, or a bus approaching a stop you have not opened yet, would need either the per-line locator (`buses.byLine`, still experimental) or the follow to hop stops along the variant. Neither is in scope; the stop-scoped follow covers the "should I leave the house now" case, which is the one described.
