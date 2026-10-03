# Sources

The external sources this project uses or could use, what each is for here, and the terms that come with it. Every entry was checked on 2026-10-03.

| Source                                  | Used for                                                  | Terms                                           |
| --------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Moventis JSON endpoints                 | Lines, stops, geometry, timetables and live arrivals      | None published for these endpoints              |
| Moventis web pages and PDFs             | Reference for fares and line pages                        | Site legal notice                               |
| ATM Lleida                              | Reference for integrated fares                            | Not checked                                     |
| La Paeria                               | Reference only                                            | Not checked                                     |
| NAP GTFS feed 1579, AUTOBUSOS DE LLEIDA | Not integrated. The fallback if Moventis' endpoints break | MITRAMS open data licence, attribution required |
| Transitland mirror of feed 1579         | Not integrated. A browsable copy of the NAP feed          | Same as the NAP feed                            |

## Moventis JSON endpoints

`https://www.moventis.es`, the site of the Moventis bus group, which lists Lleida's urban network under its operator Autobusos de Lleida. Everything the app shows comes from here. The scraper reads the line feed, `GetTrayectos`, `GetKMLs` and `GetParadas`, and `packages/api` reads `GetTiemposParada` on demand. `docs/moventis-api.md` documents every endpoint.

These are the official site's own undocumented endpoints. Moventis does not publish them for third parties and we found no licence covering them. Its developer page, `/es/herramientas-para-desarrolladores`, offers a GTFS export refreshed weekly, on request through a form at `/es/como-conseguir-los-datos-gtfs-de-moventis`, and says the same data has reached Google Maps through Google Transit since 2017. The legal notice at `/es/aviso-legal` asks users not to damage its systems and not to use its content for advertising or to collect personal data. Keep the request rate low.

## Moventis web pages and PDFs

- Line pages, one per line, at `/es/lineas-horarios/linea-autobus-1-interior` and similar. `/es/node/{nid}` serves the same page for a line feed `nid`. Each links one PDF timetable under `/sites/moventis/files/line/files/`, for example `tira_l1_w.pdf`. The PDFs are vector drawings with no text layer. Reference only.
- The Lleida urban fare page, node `118652`, at `/es/tarifas/lleida-urbano` and `/ca/tarifas/lleida-urba`. On 2026-10-03 it listed a single ticket at 1,20 €, T-Estudiant at 2,50 € for 10 trips, T-Nostra B at 1,45 € for 10 trips, and 2,00 € to buy any card. The web app's hand-curated fares come from this page and ATM Lleida's, and nothing scrapes them.

## ATM Lleida

The Autoritat Territorial de la Mobilitat de l'Àrea de Lleida, which sets the integrated fares valid across the area's operators.

- `https://atmlleida.cat/tarifes/`: the integrated fare table, "vigents des del 15 de gener al 31 de desembre de 2026". For one zone its "preus bonificats" table lists T-10 at 5,50 €, T-10/30 at 4,40 €, T-50/30 at 16,80 € and T-MES at 22,10 €. T-JOVE is 44,15 € and T-16 is free. Reference for the hand-curated fares. Recheck it when ATM Lleida publishes the 2027 table.
- `https://atmlleida.cat/en/timetables/`: timetables of the integrated operators. Reference only.

## La Paeria

The Ajuntament de Lleida's public transport page, `https://www.paeria.cat/ca/serveis/mobilitat/mobilitat/lleida-en-bus/en-transport-public`. It says the city has 12 bus lines, that every stop carries a QR code for arrival times, and points to `http://www.paeria.es/buslleida/` for those times. Reference only.

## NAP GTFS feed 1579

Spain's National Access Point for transport data, `https://nap.transportes.gob.es/`, publishes a GTFS feed named "AUTOBUSOS DE LLEIDA" with id 1579. The download, `https://nap.transportes.gob.es/api/Fichero/download/1579`, answers 401 without an `ApiKey` header; a key is free with a NAP account. The version current on 2026-10-03 covers 2026-10-02 to 2026-12-31 and has no `feed_info.txt`. New versions have appeared every one to four weeks, including three in August 2026, while the Moventis line feed did not list Lleida.

The licence is the open data licence of the Ministerio de Transportes y Movilidad Sostenible, at `https://nap.transportes.gob.es/licencia-datos`. It allows commercial and non-commercial reuse and derived products. It requires citing MITRAMS as the source, and on a website or app showing "Powered by MITRAMS" with a link to `https://www.transportes.gob.es/`. It also requires keeping the data up to date, keeping its update-date metadata, and not implying that MITRAMS endorses the product.

Not integrated. It is the documented fallback if Moventis' JSON endpoints stop working. As GTFS it carries lines, stops and scheduled times but no live arrivals; nobody here has downloaded it yet to see which optional files, such as `shapes.txt`, it includes.

## Transitland mirror

`https://www.transit.land/feeds/f-autobusos~de~lleida` mirrors NAP feed 1579 under the operator `o-autobusos~de~lleida`, and lists every version it has fetched with its date range. It is the quickest way to inspect the feed without a NAP key. The NAP licence and attribution apply. Not integrated.
