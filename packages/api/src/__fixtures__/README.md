# API fixtures

Recorded / synthesized Moventis API responses that pin the response _shape_ so the
parsing and locator logic can be tested deterministically, independent of time of
day or stop/route churn. `now` is always injected into the parser in tests, so the
relative→absolute arrival math does not depend on the wall clock.

| File                            | Source                                                                          | Exercises                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schedule-mixed.json`           | **Real** capture (stop 10336 / route 137)                                       | Multi-line response, object-form `trayectos`, `real:"S"` + `real:"N"` together, `selected` 0/1                                                                    |
| `schedule-realtime.json`        | Synthesized                                                                     | Two `real:"S"` buses on one line → two ETAs                                                                                                                       |
| `schedule-scheduled-night.json` | Synthesized                                                                     | All `real:"N"` (night) → zero locatable buses                                                                                                                     |
| `schedule-array-form.json`      | Synthesized                                                                     | `trayectos` value as an **array** (Zod union edge case)                                                                                                           |
| `schedule-sentinel.json`        | Synthesized                                                                     | `{"idLinea":"N"}` sentinel → filtered to empty                                                                                                                    |
| `schedule-malformed.json`       | Synthesized                                                                     | Unknown `real` value → `ZodError` (contract-change canary)                                                                                                        |
| `line-2-loop-snapshot.json`     | **Real** capture (every stop of line 2, 2026-09-17 20:16 CEST)                  | Loop line: the terminal is the origin and lists departures; each bus listed on this lap _and_ the next; 10-entry tails at some stops; three buses at `0 min 00 s` |
| `line-5-linear-snapshot.json`   | **Real** capture (every stop of line 5, both directions, 2026-09-17 20:25 CEST) | Linear line: origin lists departures, terminal lists arrivals; shared stops list both journeys; a duplicated entry; `real:"N"` mixed in                           |

The two `line-*-snapshot.json` files hold one raw response per stop (`stops[externalId].body`,
with its own `fetchedAt`) plus the variants' stop order and coordinates. They replay through
`src/lib/testing/snapshot-world.ts` as an offline probe for `locateLineBuses`, against the
capture's own clock, so the locator tests pin real fleet behaviour (not just the shape).
Re-capture with one throttled request per stop and record `capturedAt` as the reference
instant; keep the bodies untouched.

If the live API shape changes, re-capture a realistic fixture and update the parser

- schemas; the `*.live.test.ts` canary is what tells you it drifted.
