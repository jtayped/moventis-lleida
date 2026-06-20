# API fixtures

Recorded / synthesized Moventis API responses that pin the response *shape* so the
parsing and locator logic can be tested deterministically, independent of time of
day or stop/route churn. `now` is always injected into the parser in tests, so the
relative→absolute arrival math does not depend on the wall clock.

| File | Source | Exercises |
| --- | --- | --- |
| `schedule-mixed.json` | **Real** capture (stop 10336 / route 137) | Multi-line response, object-form `trayectos`, `real:"S"` + `real:"N"` together, `selected` 0/1 |
| `schedule-realtime.json` | Synthesized | Two `real:"S"` buses on one line → two ETAs |
| `schedule-scheduled-night.json` | Synthesized | All `real:"N"` (night) → zero locatable buses |
| `schedule-array-form.json` | Synthesized | `trayectos` value as an **array** (Zod union edge case) |
| `schedule-sentinel.json` | Synthesized | `{"idLinea":"N"}` sentinel → filtered to empty |
| `schedule-malformed.json` | Synthesized | Unknown `real` value → `ZodError` (contract-change canary) |

If the live API shape changes, re-capture a realistic fixture and update the parser
+ schemas; the `*.live.test.ts` canary is what tells you it drifted.
