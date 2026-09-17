# map styles

the light and dark cloud-based map styles, kept here so they are version controlled and reviewable in a diff.

they are **not loaded at runtime**. nothing imports them. they are the source of truth that gets pasted into the google cloud console, which attaches them to a map id, which `apps/web/src/components/ui/map.tsx` passes as `mapId`.

## the wiring

one map id, two style variants:

| | |
| --- | --- |
| map id | `9f408b48be17bc71717542f6` (`NEXT_PUBLIC_MAPS_MAP_ID`) |
| light style | `df11e6f7ffeaabf53b06fbe8` ← `light.json` |
| dark style | `df11e6f7ffeaabf5e9cffa8e` ← `dark.json` |

a map id can carry one style per colour scheme. the app never swaps map ids: it passes `colorScheme: "LIGHT" | "DARK"` (from `resolvedTheme`) and google picks the matching variant. `colorScheme` is fixed at map construction, so the map is recreated when the theme flips rather than restyled in place.

the app passes `renderingType: "VECTOR"`, which is what production has always run; the attached styles apply under it. if you ever test a rendering change, do it in a visible tab — a hidden tab stalls both webgl and raster tiles and looks like the style not applying.

## why it works this way

advanced markers require a `mapId`, and google's guidance is not to mix cloud styling with a hardcoded `styles` array in the same app. the map id means the style lives in the cloud, which would normally trap the design in a web console with no history and no review. keeping the json here fixes that, at the cost of one manual sync step.

(`map.tsx` still carries a legacy `MapTypeStyle[]` array for the no-map-id case — a fork or a local checkout without `NEXT_PUBLIC_MAPS_MAP_ID` set. that path has no advanced markers and is not what production runs.)

## the format

this is the current cloud-based styling schema, not the legacy `MapTypeStyle[]` array. the differences that matter:

- the top level is an **object** (`variant`, `backgroundColor`, `styles`), not a bare array.
- a rule is `{ "id": "...", "geometry": {...}, "label": {...} }`, not `{ featureType, elementType, stylers: [] }`.
- feature ids are a dotted hierarchy (`infrastructure.roadNetwork.road.highway`) and **children inherit from parents**, which is why `pointOfInterest` can be switched off in a single rule.
- stylers are named properties (`fillColor`, `strokeColor`, `textFillColor`) rather than an array of single-key objects.
- any styler value may be replaced by a per-zoom object (`{"z0": "#000", "z12": "#ccc"}`).

pasting legacy json into the console still works and the console converts it approximately. we skip that and author the current format directly.

## schema rules the reference does not spell out

these come from the console's own import validator, which is the authoritative source. a rule broken here is silently dropped on import, so the style half-applies and looks like a design mistake rather than a syntax one.

**the width stylers are `strokeWidth` and `textStrokeWidth`.** `strokeWeight` and `textStrokeWeight` are the legacy names, import with a warning, and will stop working.

**for a line feature, `fillColor` is the line itself and `strokeColor` is its casing.** roads have both: the carriageway and the outline either side of it. features that are a bare line have no casing, so `strokeColor` is rejected on `political.border`, and `natural.water` takes a fill with no stroke at all — which is why the water rules here set only `fillColor`.

**an opacity styler cannot appear without its colour.** `strokeOpacity` alone is a hard error. to suppress a road casing, set `strokeColor` equal to the fill and `strokeWidth` to 0 rather than reaching for opacity.

**`strokeWidth` only accepts 0.5 steps.** `0.8` is rejected as invalid while `0.5` and `1` are fine.

**a deprecation notice is not a promise that the new styler exists on that feature.** the validator will tell you `textStrokeWeight` is deprecated in favour of `textStrokeWidth`, then reject `textStrokeWidth` on the same element as "styler not found" — the rename notice is generic and fires before the per-feature check. **trust "not found" over "deprecated".**

**not every feature has both elements.** getting this wrong is a warning, not an error, so it passes quietly: `natural.land` and `political.landParcel` are geometry only; `infrastructure.transitStation` and `infrastructure.roadNetwork.roadShield` are label only. that is why the `infrastructure.transitStation` rule here carries `label` and nothing else.

**re-import after every edit and read the validator output.** errors and warnings are reported separately, and the warnings are the ones that matter, because an unrecognised field is removed without stopping the import.

## syncing a change

1. edit `light.json` or `dark.json` here, and commit.
2. cloud console > google maps platform > map styles > the style (ids in the table above) > import json, paste the file.
3. save, then **publish**. an unpublished draft does not reach the app.
4. cloud console > map management > map id `9f408b48be17bc71717542f6` > confirm the style is still associated with it, for the right colour scheme.
5. the change is live on the next map load. there is no deploy.

**the console is downstream of this folder.** if someone edits a style in the console, export it and commit the result, or the next import silently reverts their work.

### step 4 is not optional

**a style variant that exists but is not attached to the map id does nothing, and fails silently.** the sdk does not warn, error, or fall back to the other variant — it serves google's stock basemap for that colour scheme, points of interest and all. that is exactly how the dark map shipped broken: `dark.json` was imported as a style, but never associated with the map id under map management, so every dark-mode visitor got google's default dark basemap while light mode looked correct.

so after importing a variant, check both:

- **map management shows the style attached to the map id**, for that colour scheme.
- **the map actually renders it.** open the app, switch themes, and confirm **no coloured dot on screen belongs to google**. if a pin appears that is not ours, either a `pointOfInterest` category is escaping the rule or — more likely — you are looking at google's default basemap and step 4 did not take.

## the design

the reasoning in one line, from [../PRODUCT.md](../PRODUCT.md): **the basemap carries no colour, because in this product colour means the line.** per-line transit colours are the primary visual identity ("let the lines speak"), and the map exists to place them, not to compete with them.

- **points of interest are off entirely**, geometry and labels. google's restaurant and shop pins would sit next to our stop pins meaning something completely different.
- **transit stations are off.** our own stop pins replace them. leaving them on double-draws every stop, once in our line colour and once in google's transit icon.
- **roads recede**: near-tone fills separated by hairline casings, arterials and locals labelled a step quieter than city names.
- **water is tinted just enough to read as water** and not enough to pull the eye.
- labels run muted so they sit behind the pins rather than beside them.

`light.json` is the primary: the product is used outdoors, in daylight, at a bus stop, which is the theme with the tighter contrast budget. `dark.json` adds a `backgroundColor` so the frame around the tiles matches while they load, instead of flashing white.
