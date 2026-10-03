# Shared fixtures

Real `GetParadas/{line}/{trayecto}/{YYYYMMDD}/0` responses, recorded 2026-10-03, and the `StoredTimetable` each one parses to. `index.ts` exports them as `paradasFixtures` through `@moventis/shared/fixtures`, so tests in other packages (the planner, the stop and line timetable pages) replay the same captures instead of recording their own.

| File                            | Request           | Exercises                                                                                                                                  |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `paradas-line-5-weekday.json`   | `133/13/20261005` | Plain linear line; short-turn trips that stop serving the last stops                                                                       |
| `paradas-line-2-loop.json`      | `130/4/20261005`  | Loop: terminal at both ends; trip ids that carry another bus's pull-in times at the closing stops (125 vs 181)                             |
| `paradas-n1-saturday.json`      | `717/1/20261010`  | Night line: lists run past midnight, stored as 1370–1755                                                                                   |
| `paradas-line-6-segment-1.json` | `134/2/20261005`  | First trayecto of a concatenated variant                                                                                                   |
| `paradas-line-6-segment-2.json` | `134/3/20261005`  | Second trayecto: starts where segment 1 ends, same minutes, different trip ids; two stops whose `hora` and `IdExpedicion` lengths disagree |
| `paradas-no-service.json`       | `717/1/20261005`  | `{}` — the trayecto does not run that day                                                                                                  |
| `paradas-sentinel.json`         | `133/13/20260101` | A row of `"S"` placeholders — a date outside the published calendar                                                                        |

The `*.parsed.json` files are the parser's output, committed so a reader's tests do not depend on the parser running first. When the parser changes on purpose, regenerate them from the raw files and review the diff; `timetable.test.ts` fails until they match.
