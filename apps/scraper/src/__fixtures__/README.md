# Scraper fixtures

Recorded Moventis responses that pin the shape of every JSON feed the scraper parses, so `src/lib/schemas.ts` and `src/lib/api.ts` can be tested without the network. `docs/moventis-api.md` documents every field.

All of them were recorded on 2026-10-03 between 18:36 and 18:38 CEST with one sequential request each. Big arrays are trimmed and every key is kept: a trimmed `TrayectosDet` keeps the first two stops plus the first and last stop of each segment, so the `SECUENCIA` values skip.

| File                           | Request                       | Exercises                                                                                                                                                 |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lines-feed-slice.json`        | `/es/moventis/es/lines`       | Six of 11,520 rows: line 1 on two dates (one row per line per day), line 5, n1 (`COD_LINEA` `"N1"`), interurban 121 (`ID_SUBZONA` `"3"`) and a zone 8 row |
| `trayectos-line-1-loop.json`   | `GetTrayectos/129/20261005`   | Loop: one variant that starts and ends at stop 10242. Bare-number `ID_TRAYECTO`. Untrimmed, so it shows `SECUENCIA` values such as 91, 101 and 105        |
| `trayectos-line-5-linear.json` | `GetTrayectos/133/20261005`   | Linear line, one variant per direction (`SENTIDO` `"V"` and `"I"`), `CIRCULAR` `"S"` on both                                                              |
| `trayectos-line-n1-night.json` | `GetTrayectos/717/20261003`   | Night line: `FIN_TRAYECTO` past 1440, no `CIRCULAR` key                                                                                                   |
| `trayectos-line-6-concat.json` | `GetTrayectos/134/20261005`   | Array-form `ID_TRAYECTO`: concatenated `[2, 3]` with `ID_TRAYECTO_CONCAT` 3, whose stops belong to segments 4, 5 and 3, and single-element `[8]`          |
| `trayectos-stub.json`          | `GetTrayectos/717/20261005`   | The `[{"numLinea":"717"}]` stub of a date the line does not run (the feed lists n1 on Saturdays only)                                                     |
| `incidencias.json`             | `/es/moventis/es/incidencias` | Three of 20 rows: one alert listed twice for two subzones (`nid` 170669), and one whose `TITLE_LINEA` ends in tabs. None concern Lleida                   |

`src/lib/moventis-contract.test.ts` checks these against the schemas, and `pnpm test:live` runs `src/lib/moventis.live.test.ts` to check the live feeds still parse. When the canary fails, re-record the fixture for that feed, update the schema until the contract test passes, and only then look at the code that consumes it.
