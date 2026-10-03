# Moventis API

Every endpoint of `https://www.moventis.es` that this project calls or has looked at, with the fields each one returns and what we do with them. Moventis publishes none of it for third parties. We found the endpoints by reading the Backbone code the official site serves under `/sites/all/themes/st_moventis/js/backbone/`, mainly the `collections/all*.js` files, `views/allTrayectosView.js`, `routers/router.js` and `moventis.js`, and confirmed them in the network tab of a line page. Everything here was last verified on 2026-10-03.

There is no authentication and no published rate limit, and it is someone else's server. The scraper keeps at most 12 requests in flight, `packages/api` sends live arrival requests through a 5 req/s throttle, and anything exploratory should go one request at a time.

## Endpoints at a glance

| Endpoint                                     | What it returns                                | Used by                                              |
| -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `/{lang}/moventis/{lang}/lines`              | One row per line per operating day, every zone | Scraper discovery (`fetchLleidaLines`)               |
| `/{lang}/moventis/{lang}/zones`              | Zones and subzones                             | Reference only                                       |
| `/{lang}/moventis/{lang}/brands`             | Operator brands                                | Reference only                                       |
| `/{lang}/moventis/{lang}/tarifas`            | Index of fare pages, no prices                 | Reference only                                       |
| `/{lang}/moventis/{lang}/incidencias`        | Network-wide service alerts                    | `fetchIncidencias`, not wired into any job yet       |
| `/api/json/GetTrayectos/{line}/{date}`       | A line's variants and their stops on one date  | Scraper sync (`fetchTrayectos`)                      |
| `/api/json/GetKMLs/{line}/{segment}`         | One segment's geometry as KML                  | Scraper sync (`fetchKml`)                            |
| `/api/json/GetParadas/...`                   | One segment's full timetable for a date        | Timetable sync                                       |
| `/api/json/GetParadasCircular/...`           | The same timetable in another shape            | Not used                                             |
| `/api/json/GetTiemposParada/{lang}/{stop}/…` | Live and scheduled arrivals at one stop        | `packages/api` (`stops.get`, `buses.byLine`, others) |
| `/api/json/GetLineas/0`                      | 404                                            | Dead                                                 |

## Conventions

Two URL families exist. The Drupal feeds live at `/{lang}/moventis/{lang}/{name}` and return a JSON array. The JSON API lives at `/api/json/{Method}/...`. `lang` is `es` or `ca`. The scraper reads the `es` feeds.

Drupal node ids are per language. The same line, brand or alert has one `nid` in the `es` feeds and another in the `ca` feeds: line 1 is `86606` in `es` and `86607` in `ca`, the Lleida urban brand is `86862` and `86863`, and one alert is `170669` and `170670`. Compare node ids only between responses fetched in the same language. The texts are translated per language too.

The ids that matter:

| Id            | Example   | Meaning                                                                                      |
| ------------- | --------- | -------------------------------------------------------------------------------------------- |
| `ID_LINEA`    | `129`     | A line. Stored as `Route.externalId`. Every per-line endpoint takes it                       |
| `COD_LINEA`   | `1`, `N1` | The public line code. Stored lowercased as `Route.code` through `normalizeLineCode`          |
| `ID_TRAYECTO` | `3`       | A trayecto segment, numbered per line. A variant is one segment or several concatenated      |
| `ID_PARADA`   | `10242`   | A stop. Stored as `Stop.externalId`. `GetTiemposParada` takes it                             |
| `COD_PARADA`  | `20001`   | The public stop code the official site prints as "Código 20001". Not the same as `ID_PARADA` |
| `nid`         | `86606`   | A Drupal node. Per language, see above                                                       |

Dates in URLs and in the line feed are `YYYYMMDD`. Times of day are either `HH:MM` strings or integer minutes after the service day's midnight, and the integer form goes past 1440 for a service that runs after midnight. Every clock time is a `Europe/Madrid` wall clock; `CLAUDE.md` explains why that matters on a UTC server.

An error comes back as an HTML page, not JSON. An unknown endpoint answers `404` with `text/html`.

## Line feed

`GET /es/moventis/es/lines`

About 3.6 MB. On 2026-10-03 it held 11,520 rows covering every Moventis zone, one row per line per operating day. The scraper keeps the rows whose `ID_ZONA` is `"2"`, which is Lleida, or whose `ID_LINEA` it already stores. `CLAUDE.md` explains the second test.

| Field              | Example       | Notes                                                                                     |
| ------------------ | ------------- | ----------------------------------------------------------------------------------------- |
| `ID_LINEA`         | `"129"`       | Stored as `Route.externalId`                                                              |
| `COD_LINEA`        | `"1"`, `"N1"` | Stored as `Route.code` after `normalizeLineCode`, which also maps a legacy `"22"` to `n1` |
| `DESC_LINEA`       | `"INTERIOR"`  | Stored as `Route.name` after `normalizeName`, lowercased with diacritics fixed            |
| `ID_ZONA`          | `"2"`         | Lleida is `"2"`                                                                           |
| `ID_SUBZONA`       | `"1"`         | `"1"` urban, `"3"` interurban                                                             |
| `COLOR`            | `"#FFFF18"`   | Stored as `Route.color`                                                                   |
| `TEXT_COLOR`       | `null`        | `null` for every Lleida line                                                              |
| `FORMA`            | `"cuadrado"`  | Badge shape: `"cuadrado"` urban, `"redondo"` interurban                                   |
| `DIAS_QUE_CIRCULA` | `"20261002"`  | The operating day this row stands for. Becomes one `OperatingDay`                         |
| `ADAPTADA`         | `"S"`         | Accessible. `"S"` on every urban line, `"N"` only on interurban 121                       |
| `TREAL`            | `"S"`         | Not read                                                                                  |
| `MARCA`            | `"86862"`     | Brand node. `86862` is Autobusos de Lleida in `es`, `120759` is Sarbus                    |
| `nid`              | `"86606"`     | The line's Drupal node                                                                    |
| `ID_EXPLOTADORA`   | `"5"`         | `"5"` on urban lines, `"1"` on interurban ones                                            |
| `ID_CONCESION`     | `"1"`         | `"1"` urban, `"14"` interurban                                                            |
| `ID_GRUPO`         | `"1"`         | The official site filters on it                                                           |

The calendar is shorter than the code once assumed. On 2026-10-03 the Lleida rows ran from 20261002 to 20261030, 29 days, while other zones reached 20261201. The Lleida zone was missing from the feed entirely from 2026-08-02 and was back by 2026-10-03 with 413 rows and 18 lines.

The Lleida lines on 2026-10-03:

| `ID_LINEA` | `COD_LINEA` | `DESC_LINEA`                     | Subzone    | `nid` (es) |
| ---------- | ----------- | -------------------------------- | ---------- | ---------- |
| 129        | 1           | INTERIOR                         | urban      | 86606      |
| 130        | 2           | RONDA - HOSPITALS                | urban      | 86608      |
| 131        | 3           | EXTERIOR - HOSPITALS             | urban      | 86610      |
| 132        | 4           | PARDINYES-MARIOLA                | urban      | 86883      |
| 133        | 5           | CAPPONT - ARNAU DE VILANOVA      | urban      | 86614      |
| 134        | 6           | MERCAT BORDETA AGRONOMS TANATORI | urban      | 86616      |
| 135        | 7           | COSTA MANGRANERS-AV.SANT PERE    | urban      | 86618      |
| 136        | 8           | BALÀFIA - CLOT - CENTRE          | urban      | 86620      |
| 137        | 9           | POLIGONS                         | urban      | 86622      |
| 138        | 10          | GRAN DE LLIVIA-CAPARRELLA        | urban      | 86624      |
| 713        | 16          | CIUTAT JARDI                     | urban      | 169724     |
| 332        | 20          | RONDA                            | urban      | 86638      |
| 628        | 70          | LLIVIA-CAPPONT                   | urban      | 124404     |
| 717        | N1          | N1 MAGRANERS-SECÀ-BALÀFIA        | urban      | 170048     |
| 178        | 120         | LLEIDA-L\`ALBAGÉS                | interurban | 86626      |
| 177        | 121         | LLEIDA-EL COGUL                  | interurban | 87870      |
| 180        | 122         | LLEIDA-TORRES DE SEGRE           | interurban | 86628      |
| 181        | 401         | ALCARRAS-TORRES DE SEGRE         | interurban | 86630      |

The four interurban lines are Sarbus lines and `EXCLUDED_CODES` in `discovery.ts` keeps them out. The `ca` feed lists each of them twice per date, once under subzone `"1"` and once under `"3"`.

A line's `nid` is its page on the official site: `/es/node/86606` serves the line 1 page, whose canonical URL is `/es/lineas-horarios/linea-autobus-1-interior`. Each line page links one PDF timetable under `/sites/moventis/files/line/files/`, for example `tira_l1_w.pdf`. The PDFs are vector drawings with no text layer, so nothing can be extracted from them.

The scraper validates only the Lleida rows. A malformed Lleida row rejects the whole feed, and discovery falls back to probing the routes it already stores; the reason is in `fetchLleidaLines`.

## Zones feed

`GET /es/moventis/es/zones`

16 zones, each `{ ID_ZONA, DESCRIPCION, IMAGE, Banners, Empresas_colaboradoras, Subzonas }`. A subzone is `{ ID_ZONA, ID_SUBZONA, DESCRIPCION, Banners, Empresas_colaboradoras, NUM_LINES }`.

Zone `"2"` is LLEIDA. Its subzones are `"1"` LLEIDA with 17 lines, `"2"` BUS TURÍSTIC DE LLEIDA with 1 and `"3"` INTERURBANS with 5. Those counts do not match the line feed, which on the same day listed 14 urban lines, no tourist line and 4 interurban ones. Its partner links are fecav.org, gencat.cat, atm.cat, atmlleida.cat, paeria.es and turismedelleida.cat.

Not read by the project.

## Brands feed

`GET /es/moventis/es/brands`

25 brands, each `{ nid, TITLE, IMAGE, Banners, Empresas_colaboradoras, Zonas }`. Sarbus is `120759` and serves zones 10, 7, 2 and 8. The Lleida urban brand `86862` that every urban row of the line feed names in `MARCA` is not in this feed, and `/es/node/86862` answers "Acceso denegado". The operator's name comes from `GetTrayectos` instead, where every stop says `EXPLOTADORA: "AUTOBUSOS DE LLEIDA"`.

Not read by the project.

## Fares feed

`GET /es/moventis/es/tarifas`

250 rows of `{ nid, TITLE_TARIFA, ID_TARIFA, ID_ZONA, ID_SUBZONA, NID_MARCA }`, many repeated, pointing at 21 fare pages. It is an index only and carries no prices. Lleida urban is node `118652`, "LLEIDA - URBANO", `ID_TARIFA` `500`, served at `/es/tarifas/lleida-urbano` and `/ca/tarifas/lleida-urba`. Sarbus interurban Lleida is node `118684`, `ID_TARIFA` `502`.

The prices exist only in that page's HTML. On 2026-10-03 it listed a single ticket bought on the bus at 1,20 €, T-Estudiant at 2,50 € for 10 trips, T-Nostra B at 1,45 € for 10 trips, T-Nostra A and T-Temps at 0 €, T-Jove as a link to atmlleida.cat, and 2,00 € to buy any of the cards.

The web app keeps fares as a hand-curated list and nothing scrapes them. `docs/sources.md` lists where to check them.

## Incidencias feed

`GET /es/moventis/es/incidencias`

Network-wide service alerts. On 2026-10-03 it held 20 rows, none for Lleida. One alert affecting several lines or subzones comes as several rows sharing one `nid`.

| Field                | Example                          | Notes                                                                |
| -------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `nid`                | `"170669"`                       | The alert's node. Per language                                       |
| `destacada`          | `"1"`                            | `"1"` for a highlighted alert, otherwise `"0"`                       |
| `TITLE_INCIDENCIA`   | `"CERDANYOLA DEL VALLÈS. ..."`   | Headline, in the feed's language                                     |
| `RESUMEN_INCIDENCIA` | `"\"Botiga al carrer\". ..."`    | Summary                                                              |
| `TITLE_LINEA`        | `"CAP CANALETES - CAN COLL\t\t"` | Affected line's name, sometimes padded with tabs                     |
| `NID_LINEA`          | `"170115"`                       | Affected line's node. Matches a line feed `nid` in the same language |
| `CODE_LINEA`         | `"CV1"`                          | Affected line's code                                                 |
| `ID_SUBZONA`         | `"1"`                            | Subzone of the affected line                                         |
| `ID_ZONA`            | `null`                           | `null` in every row recorded                                         |
| `NID_MARCA`          | `"120759"`                       | Brand node. Matches the line feed's `MARCA` in the same language     |
| `ENDATE`             | `"2026-10-03 21:30:00"`          | When the alert ends                                                  |

`ENDATE` reads as a Madrid wall clock: an alert titled "de 9:00 a 21:00" on 3 October ends at `"2026-10-03 21:30:00"`, half an hour after the event, which only fits local time.

To find Lleida alerts, match `NID_LINEA` against the `nid` of a Lleida line or `NID_MARCA` against `86862`, with every id taken from `es` responses. The official site filters on `NID_MARCA`, `ID_ZONA` and `ID_SUBZONA`, but with `ID_ZONA` `null` in every row recorded, its zone filters match nothing.

`fetchIncidencias(lang)` in `apps/scraper/src/lib/api.ts` reads it, dropping and logging any malformed row. No job calls it yet.

## GetTrayectos

`GET /api/json/GetTrayectos/{ID_LINEA}/{YYYYMMDD}`

The variants a line runs on one date, each with its stops in order. On a date the line does not run it answers a stub instead, for example `[{"numLinea":"717"}]`. That makes it a reliable operating-day oracle, and the scraper's fallback rebuilds a line's calendar by asking it day by day.

A trayecto:

| Field                | Example                 | Notes                                                                                                   |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `ID_TRAYECTO`        | `3`, `[2, 3]`           | The segments that make up this variant. Normalised to an array and stored as `RouteVariant.trayectoIds` |
| `ID_TRAYECTO_CONCAT` | `null`, `3`             | Set on a concatenated variant                                                                           |
| `DESC_TRAYECTO`      | `"ESTACIÓ D'AUTOBUSOS"` | Stored as `RouteVariant.description`                                                                    |
| `DESC_REDUCIDA`      | `"1N"`                  | Short label                                                                                             |
| `PRINCIPAL`          | `"S"`                   | `"S"` main variant, `"N"` secondary. Stored as `RouteVariant.isPrincipal`                               |
| `SENTIDO`            | `"I"`                   | `"I"` outbound, `"V"` return. Stored as `RouteVariant.direction`                                        |
| `INI_TRAYECTO`       | `414`                   | First service, in minutes after the service day's midnight. 414 is 06:54                                |
| `FIN_TRAYECTO`       | `1331`                  | Last service, same unit. n1 runs from 1370 to 1755, 22:50 to 05:15                                      |
| `CIRCULAR`           | `"S"`                   | Not a loop flag. See below                                                                              |
| `COLOR`              | `"#FFFF18"`             | Same as the line feed's                                                                                 |
| `ID_LINEA`           | `129`                   | Number here, string in the line feed                                                                    |
| `numLinea`           | `"129"`                 | The line again, as a string. The stub carries only this                                                 |
| `ID_GRUPO`           | `1`                     |                                                                                                         |
| `ID_TRAYECTO_SAE`    | `1`                     |                                                                                                         |
| `TrayectosDet`       | `[...]`                 | The stops, in order                                                                                     |

`RouteVariant.externalId` is `ID_TRAYECTO_CONCAT` when set, otherwise the last element of `ID_TRAYECTO`. `primaryTrayectoId` in `api.ts` computes it.

A stop in `TrayectosDet`:

| Field         | Example | Notes                                                                                     |
| ------------- | ------- | ----------------------------------------------------------------------------------------- |
| `Parada`      | `{...}` | The stop itself, below                                                                    |
| `SECUENCIA`   | `10`    | Position. Stored as `RouteVariantStop.sequence`                                           |
| `ID_PARADA`   | `10242` | Same as `Parada.ID_PARADA`                                                                |
| `ID_TRAYECTO` | `3`     | The segment this stop belongs to                                                          |
| `NKM_ORIGEN`  | `3.63`  | Cumulative distance from the first stop, in km. Line 1 ends at 3.63, n1 outbound at 10.18 |
| `SUBE_BAJA`   | `1`     | `1` on every stop recorded                                                                |
| `ID_GRUPO`    | `1`     |                                                                                           |
| `ID_LINEA`    | `129`   |                                                                                           |

`Parada`:

| Field                                          | Example                     | Notes                                                    |
| ---------------------------------------------- | --------------------------- | -------------------------------------------------------- |
| `ID_PARADA`                                    | `10242`                     | Stored as `Stop.externalId`                              |
| `DESC_PARADA`                                  | `"PLAÇA ESPANYA/SARACIBAR"` | Stored as `Stop.name` after `normalizeName`              |
| `LATITUD`                                      | `41.61090045882`            | Stored as `Stop.latitude`                                |
| `LONGITUD`                                     | `0.62279917430489`          | Stored as `Stop.longitude`                               |
| `COD_PARADA`                                   | `20001`                     | The public stop code                                     |
| `UTMX`, `UTMY`                                 | `302016`, `4609507`         | The same position in UTM metres                          |
| `MUNICIPIO`                                    | `"LLEIDA"`                  | With `ID_MUNICIPIO` `251207`                             |
| `EXPLOTADORA`                                  | `"AUTOBUSOS DE LLEIDA"`     | With `ID_EXPLOTADORA` `5`                                |
| `ID_ZONA`                                      | `0`                         | `0` on every stop recorded, unlike the line feed's `"2"` |
| `ZONA`, `ID_SUBZONA`, `SUBZONA`, `CONCESIONES` | `null`                      | `null` on every stop recorded                            |
| `ID_GRUPO`                                     | `1`                         |                                                          |

Things that are easy to get wrong:

- `ID_TRAYECTO` is a bare number on lines 1, 5 and n1 and an array on line 6, even for a single segment: `[8]`.
- On a concatenated variant the stops' own `ID_TRAYECTO` need not appear in the variant's list. Line 6's variant `[2, 3]` with `ID_TRAYECTO_CONCAT` `3` lists stops from segments 4, 5 and 3, in that order.
- `CIRCULAR` is `"S"` on line 1, a loop, but also on line 5, which runs out and back, and on every line 6 variant. n1's trayectos have no `CIRCULAR` key at all. The official site uses it only to decide between `GetParadas` and `GetParadasCircular`. Whether a variant is a loop has to come from its stops, since a loop ends at the stop it starts from. Line 1 starts and ends at 10242, at `SECUENCIA` 10 and 131.
- `SECUENCIA` rises in steps of 10 most of the time but not always. Line 1 runs 10, 20 ... 80, 91, 101, 105, 110, 120, 131.
- `DESC_PARADA` can embed the public code: n1's terminal is `"20000 MARIMUNT/SOLÉ TURA"`.
- The official site's code reads a `fechaProxima` field on a trayecto whose last service has passed. No recorded response has carried it.

Stored today: `ID_TRAYECTO`, `ID_TRAYECTO_CONCAT`, `DESC_TRAYECTO`, `SENTIDO`, `PRINCIPAL`, `SECUENCIA`, and the stop's `ID_PARADA`, `DESC_PARADA`, `LATITUD` and `LONGITUD`. Planned and not stored yet: `COD_PARADA` as `Stop.code`, `NKM_ORIGEN` as `RouteVariantStop.distanceKm`, the line feed's `ADAPTADA` as `Route.accessible`, and the line's `nid` and PDF URL on `Route`.

A trayecto that fails the schema rejects the whole response, and the probe counts as unreachable. `trayectosResponseSchema` in `apps/scraper/src/lib/schemas.ts` explains why dropping the row would be worse.

## GetKMLs

`GET /api/json/GetKMLs/{ID_LINEA}/{ID_TRAYECTO segment}`

It answers with `text/html; charset=UTF-8`, but the body is a Google Earth KML document. Line 1's segment 3 is a document named `L1 3.kml` holding one `Placemark` with one `LineString`. `lib/kml.ts` reads the first `<coordinates>` block as `lng,lat,alt` triples and drops the altitude.

The scraper fetches one per segment of each variant, stores the paths in `RouteVariant.geometry`, and aggregates the principal outbound variants into `Route.path`.

## GetParadas

`GET /api/json/GetParadas/{ID_LINEA}/{segment}/{YYYYMMDD}/{fromMinute};{segment ids joined by ;}`

The scheduled timetable of one trayecto segment on one date, every stop with every time. `fromMinute` cuts the day: `0` returns the whole day, `600` starts at 10:00. The official line page appends `;` and the variant's segment ids, as in `GetParadas/129/3/20261005/0;3`. Its timetable route sends the same request without that suffix.

It is keyed by segment, so it takes an id from `RouteVariant.trayectoIds`, not `RouteVariant.externalId`.

The response is one entry per stop in route order:

| Field                                    | Example                              | Notes                                                                                        |
| ---------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `secuencia`                              | `1`                                  | Position, counting from 1                                                                    |
| `DESC_PARADA`                            | `"PLAÇA ESPANYA/SARACIBAR"`          |                                                                                              |
| `COD_PARADA`                             | `"10242-10"`                         | `ID_PARADA` and `GetTrayectos`' `SECUENCIA` joined by a hyphen. Line 1 ends at `"10242-131"` |
| `COD_PARADA_WEB`                         | `20001`                              | The public stop code, `GetTrayectos`' `Parada.COD_PARADA`                                    |
| `hora`                                   | `["06:54", "07:16", ...]`            | Times at this stop. After midnight they wrap: n1 lists `"23:00"`, `"23:30"`, `"00:00"`       |
| `IdExpedicion`                           | `[615, 616, ...]`                    | Trip ids, meant to line up with `hora`                                                       |
| `nHoras`                                 | `77`                                 | Count of `hora`                                                                              |
| `LATITUD`, `LONGITUD`                    | `41.61090045882`, `0.62279917430489` |                                                                                              |
| `CIRCULAR`                               | `"N"`                                | `"N"` even on line 1, whose `GetTrayectos` says `"S"`                                        |
| `TREAL`, `SubeBaja`, `ID_GRUPO`, `COLOR` | `"S"`, `1`, `1`, `"#FFFF18"`         |                                                                                              |

What turning it into trips takes:

- Loops reuse trip ids from one lap to the next, so a trip has to be split where its time runs backwards.
- A concatenated variant spans several segments, so its trips have to be stitched across one request per segment. This affects lines 6 and 8.
- `hora` and `IdExpedicion` often disagree in length. In a full local sync, 76 of 248 timetables had at least one such stop, on lines 4, 5 inbound, 7 and others. The main cause is that `hora` lists a minute once even when two trips pass in that same minute, so `IdExpedicion` comes out one longer. Some stops also list the ids of trips that do not stop there: line 7's PLAÇA ESPANYA/SARACIBAR has 78 times and 101 ids, and line 6 segment 3's P.ESPANYA/CATALUNYA has 41 and 51.

It has two ways of saying there is no service. `{}` means the segment does not run that day or does not exist. A single entry of `"S"` placeholders with `COD_PARADA` `"S-S"` means the date is outside the published calendar, as seen for 20260101.

The stored form belongs to the timetable sync: the `Timetable` model, with `parseParadasResponse` and `readStoredTimetable` in `packages/shared/src/lib/timetable.ts`, added in #41. Read those rather than this page for how it is stored.

## GetParadasCircular

`GET /api/json/GetParadasCircular/{ID_LINEA}/{segment}/{YYYYMMDD}/{fromMinute};{segment ids}`

The same timetable in another shape. The official site calls it for a trayecto with `CIRCULAR` `"S"`; the line 2 page was seen calling `GetParadasCircular/130/4/20261003/1105;4`.

The differences from `GetParadas`:

- Stops come in no particular order. Line 1 starts 20, 120, 80, 105, 10. `secuencia` carries `GetTrayectos`' `SECUENCIA` values, so sorting by it restores route order.
- A loop's closing stop is not repeated: line 1 has 13 entries here and 14 in `GetParadas`.
- `hora` is integer minutes after the service day's midnight and keeps counting past 1440. n1 reaches 1755.
- `horas` holds the clock-time strings keyed by segment id: `{"3": ["06:56", "07:18", ...]}`.
- `COD_PARADA` is the bare `ID_PARADA` as a number, `10211`. There is no `ID_GRUPO` and no `nHoras`.

Not used.

## GetTiemposParada

`GET /api/json/GetTiemposParada/{lang}/{ID_PARADA}/{ID_LINEA}/{second ID_LINEA or 0}`

Arrivals at one stop, a mix of real-time countdowns and timetable times. The official site passes up to two lines and polls every 10 seconds. `packages/api/src/lib/stop-schedule.ts` reads it with `lang` `es` and second line `0`, and `packages/shared/src/schemas/schedule.ts` holds its schema. `CLAUDE.md` covers how arrivals are parsed and why the throttle exists.

The answer is an array with one entry per line serving the stop: `{ idLinea, desc_linea, trayectos, incidencias, selected }`. `desc_linea` is `"CODE - NAME"`. `trayectos` maps each journey name to its arrivals, as an object or as an array. `selected` is `1` for the lines named in the URL and `0` for the rest, which the official site shows as connections.

An arrival is `{ minutos, adaptada, real }` plus, when `real` is `"N"`, `hora` and `tiempo`:

- `real: "S"` is live, and `minutos` is a countdown such as `"05 min 30 s"`.
- `real: "N"` is scheduled, and `hora` is a clock time such as `"14:35"`.

Facts the project depends on:

- It answers with every line serving the stop, whichever line the URL names. `stops.nextArrivals` relies on that to spend one request per stop, and `schedule-contract.test.ts` pins it.
- When the line named has no service, or is dormant, it answers a sentinel: `[{"idLinea":"N","desc_linea":"","trayectos":{},"incidencias":null,"selected":0}]`.
- `adaptada` and `incidencias` were `null` in all of about 830 recorded arrivals. `tiempo` and the keys of the object form of `trayectos` are ignored.

## GetLineas

`GET /api/json/GetLineas/0`

Answers 404 with an HTML error page. It appears only in commented-out code in the official site's `allLineas.js`, which now reads the line feed instead.
