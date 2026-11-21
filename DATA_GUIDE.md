# Data guide

Everything the website shows comes from the JSON files in `public/data/`. You never need to edit the React code to add, change or remove content.

## Before you start

- Edit the files with a code editor (VS Code is ideal: it highlights JSON mistakes in red).
- JSON is strict: use double quotes `"`, put a comma between items but **not** after the last one, and use `true`/`false`/`null` without quotes.
- After every change, run `npm run validate-data` or open **Sources → Data checks** on the site. Problems are listed with the file and record ID.
- IDs (`EVT001`, `LOC005`…) must be unique within their file. Never reuse an ID for a different thing; links and other files refer to it.
- Keep a backup or use Git so you can undo.

## Shared rules

### Verification status

Every historical record has one of these values (exactly as written):

| Value | Meaning | Shown as |
| --- | --- | --- |
| `Verified` | Supported by at least one source listed in `Source_IDs` | Tick icon, "Verified" |
| `Needs Verification` | Believed correct but not yet confirmed | Question icon, "Needs verification" |
| `Illustrative` | Example content, not evidence | Dashed outline, "Illustrative" |
| `Disputed` | Sources disagree; see `Alternative_Dates` | Split icon, "Disputed" |

A record marked `Verified` with an empty `Source_IDs` list is automatically shown as "Needs verification" and flagged in Data checks.

### Demo flag

`"Is_Demo_Data": true` adds a **Demo** tag everywhere the record appears. Set it to `false` only when you have replaced the record with real, researched content. If the field is missing, the site treats the record as demo.

### Dates

| You know | Write `Date` as | `Date_Precision` | Shown as |
| --- | --- | --- | --- |
| The exact day | `"1977-07-22"` | `"day"` | 22 July 1977 |
| Month and year | `"1977-07"` | `"month"` | July 1977 (month only) |
| Only the year | `"1977"` | `"year"` | 1977 (year only) |

Never invent a day or month to make a date look precise. Events are sorted by date; a year-only date sorts at the start of that year, and `Display_Order` breaks ties.

### Timeline order

Events are sorted by year, then month, then day. Where a year contains an event dated only to that year (for example "1973"), the dates cannot say where that event belongs, so **every event in that year is ordered by `Display_Order`**. The same applies inside a month that contains an event dated only to that month. Ties are broken by `Display_Order`, then `Event_ID`; undated events go last.

Because of this, give every event a `Display_Order` and keep the numbers in date order. `npm run validate-data` and the site's Data checks warn when a `Display_Order` contradicts dates that can be compared, or is missing where it decides the order.

### Sources

Records refer to sources by ID: `"Source_IDs": ["SRC001", "SRC003"]`. Add the source to `sources.json` first.

---

## events.json — timeline events

Template (copy, paste, then edit):

```json
{
  "Event_ID": "EVT019",
  "Date": "1985-03",
  "Date_Precision": "month",
  "End_Date": null,
  "Event_Title": "Title in English",
  "Event_Title_MS": "Tajuk dalam Bahasa Melayu",
  "Event_Category": "International Visits",
  "Location_ID": "LOC006",
  "Description": "Two to four sentences in English, based on the cited sources.",
  "Description_MS": "",
  "Historical_Notes": "Research notes: what the sources say, any doubts.",
  "Image_URL": "/images/events/evt019.jpg",
  "Image_Caption": "What the photograph shows",
  "Image_Credit": "Photographer or archive, year",
  "Source_URL": "",
  "Source_IDs": ["SRC006"],
  "Alternative_Dates": [],
  "Related_Event_IDs": [],
  "Verification": "Needs Verification",
  "Is_Demo_Data": false,
  "Display_Order": 19
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `Event_ID` | yes | Unique, e.g. `EVT019` |
| `Date`, `Date_Precision` | yes | See Dates above |
| `End_Date` | no | For periods such as a refit; `null` if none |
| `Event_Title` | yes | English title |
| `Event_Title_MS`, `Description_MS` | no | Malay versions; English is shown if empty. Have translations reviewed. |
| `Event_Category` | yes | One of: Construction and Origins, Commissioning, Naval Service, International Visits, Training, Maintenance and Refits, Museum and Preservation, Decommissioning. A new category appears automatically as a filter (add its Malay name in `src/i18n/strings.ts` → `categoryLabelsMs`). |
| `Location_ID` | no | Must exist in `locations.json`. `null` = no map position (still shown on the timeline). |
| `Image_URL` | no | Leave `""` for no image |
| `Source_URL` | no | A direct link if the source is online; must start with `https://` |
| `Alternative_Dates` | no | For disputed dates, see below |
| `Related_Event_IDs` | no | Shown as "Related records" links |
| `Display_Order` | recommended | Position in the timeline where the dates alone cannot decide (see "Timeline order" below). Keep the numbers in date order. |

**Disputed dates.** Keep the date from your main source in `Date`, list the others, and set `Verification` to `Disputed`:

```json
"Alternative_Dates": [
  { "Date": "1968", "Date_Precision": "year", "Source_ID": "SRC004", "Note": "Given as 1968 in the 1980 yearbook, p. 12." }
],
"Verification": "Disputed"
```

**Remove an event:** delete its `{ … }` block (and the comma before or after it). Also remove its ID from any `Related_Event_IDs`, `voyages.json → Related_Event_IDs`, `route_points.json → Related_Event_ID` and `sources.json → Related_Event_IDs`. Data checks will list any leftovers.

## locations.json — places on the map

```json
{
  "Location_ID": "LOC012",
  "Location_Name": "Penang, Malaysia",
  "Location_Name_MS": "Pulau Pinang, Malaysia",
  "Country": "Malaysia",
  "Latitude": 5.4141,
  "Longitude": 100.3288,
  "Location_Type": "Port",
  "Description": "Why this place matters to the ship.",
  "Source_IDs": [],
  "Verification": "Needs Verification",
  "Is_Demo_Data": false
}
```

- `Latitude` and `Longitude` are decimal numbers (north and east positive, south and west negative). Latitude −90 to 90, longitude −180 to 180. To get them, right-click a place in Google Maps or OpenStreetMap and copy the coordinates.
- `Location_Type`: Port, Naval Base, Canal Entrance, Museum… The Legacy page uses the first location with `"Location_Type": "Museum"` for its map.
- Map markers: filled circle = Verified, ring with centre dot = Needs verification, plain ring = Illustrative, diamond = Disputed.

## voyages.json and route_points.json — the voyage chart

A **voyage** is a journey. Its **route points** are the ordered positions the chart connects.

```json
{
  "Voyage_ID": "VOY004",
  "Voyage_Title": "Visit to Penang",
  "Voyage_Title_MS": "Lawatan ke Pulau Pinang",
  "Start_Date": "1986-04",
  "End_Date": "1986-05",
  "Description": "One or two sentences.",
  "Route_Point_IDs": ["RPT039", "RPT040", "RPT041"],
  "Related_Event_IDs": ["EVT019"],
  "Source_IDs": [],
  "Verification": "Needs Verification",
  "Is_Demo_Data": false
}
```

```json
{
  "Route_Point_ID": "RPT040",
  "Voyage_ID": "VOY004",
  "Sequence_No": 2,
  "Date": "1986-04",
  "Date_Precision": "month",
  "Location_ID": "LOC012",
  "Related_Event_ID": "EVT019",
  "Latitude": 5.4141,
  "Longitude": 100.3288,
  "Position_Type": "Documented Location",
  "Route_Status": "Verified",
  "Source_IDs": ["SRC006"],
  "Is_Demo_Data": false,
  "Notes": "Arrival recorded in the ship's log, p. 44."
}
```

How the chart reads them:

- Points are drawn in `Sequence_No` order (1, 2, 3…). Every point with the voyage's `Voyage_ID` is included even if you forget to list it in `Route_Point_IDs`.
- A point with a `Location_ID` (and a `Position_Type` other than `Illustrative Waypoint`) is a **stop**: it appears in the milestone list, the ship pauses there during playback, and its `Related_Event_ID` is shown in the panel.
- `Position_Type`:
  - `Documented Location` — a source places the ship here.
  - `Approximate Position` — a named place, but the exact position or visit is unconfirmed.
  - `Illustrative Waypoint` — a point added only so the line follows the sea (e.g. around a cape). Leave `Location_ID` and `Date` as `null`. Drawn as a tiny dot.
- A line between two points is drawn **solid only if both ends are `Documented Location` with `Route_Status: "Verified"`**. Everything else is dashed and labelled schematic.
- If you leave `Latitude`/`Longitude` out of a point that has a `Location_ID`, the location's coordinates are used.
- Dates are optional on waypoints. Between two dated stops the panel says "Between August 1977 and September 1977" instead of guessing a day.
- A voyage needs at least two points to animate.

**To add a voyage:** add the locations, then the route points (unique `Route_Point_ID`, same `Voyage_ID`, sequence 1…n), then the voyage. It appears as a new tab on the chart automatically.

**To edit a route:** change coordinates or `Sequence_No`, or insert a new point with the next free ID and renumber the sequence.

## ship.json — vessel profile

- `Specifications[]`: each row has `Label`, `Label_MS`, `Value`, `Unit`, `Verification`, `Source_IDs`. Leave `Value` as `""` until confirmed; the card shows "Data pending verification". Add rows by copying an existing one with a new `Key`.
- `Historical_Names[]`: `Name`, `Navy`, `From`, `To`, `Verification`, `Source_IDs`, `Notes`.
- `Sections[]`: the "Service record" blocks (title, body text, optional photo).
- `Pennant_Number`: `{ "Value": "", "Verification": "...", "Source_IDs": [] }`.
- `Hero_Image_URL`, `Hero_Image_Caption`, `Hero_Image_Credit`: the home page photograph.

## ship_components.json — Life Onboard

```json
{
  "Component_ID": "CMP018",
  "Component_Name": "Engine telegraph",
  "Component_Name_MS": "Telegraf enjin",
  "Category": "Bridge and Navigation",
  "Description": "What it is, what it did, and anything specific to this ship.",
  "Ship_Section": "Bridge",
  "Image_URLs": ["/images/components/cmp018-1.jpg", "/images/components/cmp018-2.jpg"],
  "Image_Captions": ["Port telegraph, facing aft", "Detail of the dial"],
  "Photo_Credit": "Your name, site visit 14 March 2026",
  "Source_IDs": [],
  "Verification": "Needs Verification",
  "Is_Demo_Data": false
}
```

Categories: Exterior, Bridge and Navigation, Deck, Armament, Engine and Machinery, Living Quarters, Training Facilities, Communication Equipment, Safety Equipment, Other Components. Any number of photographs is allowed; the first is the card image.

## Verified-First: public data and the research register

`site_content.json` → `"Verified_First": true` turns on extra checks (`src/data/verifiedFirst.ts`, run by the site, `npm run validate-data` and `npm test`):

- Every event, place, voyage stop, ship space, ship name, section and specification value in `public/data/` must be **Verified** and cite at least one source. Exceptions: an Illustrative place whose description says "not a recorded position", Illustrative schematic waypoints, and a specification row with an empty value (shown as "Data pending verification").
- A public record may cite only sources with `"Relied_On"` not set to `false`. Sources with `"Relied_On": false` appear on the Sources page under "Further References (Not Relied On)".
- `Planned_Opening` (an announced plan, shown on the Legacy page) must have `"Status": "Planned"` and sources. `Page_Text_Sources` lists the sources for page text that makes historical statements (see 'Coordinate basis and page-text sources' above).

Unconfirmed, disputed and withheld records belong in `research/data/` (same file names and fields, plus `Public_Status` and `Public_Note`). Never delete a research record: to publish one, copy the supported part into `public/data/`, update its `Public_Status`, and run `npm test`.

### Change log and archives (Proposal v6)

Research records changed after Proposal v5.2 carry a `Change_Log`: one entry per changed field with `Before`, `After`, `Evidence` (source and page) and `Decision`. Records added in v6 have a single entry with `Field: "(record added)"`. `npm test` undoes every entry and checks that the result equals `research/archive/proposal-v5.2/`, so no research value is ever lost. Evidence notes that do not change a public value are kept in `TLDM_Evidence`.

### Coordinate basis and page-text sources (Proposal v6.2)

Every public place needs `Coordinate_Basis` (and `Coordinate_Basis_MS`): a short statement of what the coordinates represent, such as "Approximate port position — not the ship's berth" or "Illustrative — not a recorded position". The Verified-First checker rejects a public place without it. Page text that makes historical statements lists its sources in `site_content.json` → `Page_Text_Sources` (keys: `legacy_body`, `hero_intro`, `home_legacy_body`, `visit_body`, `ship_summary`); the pages show them as a short "Sources for this text" line. Files that must never be published are listed by SHA-256 in `research/reference_images.json` → `Blocked_Public_Files`; `npm test` fails if one appears under `public/` or `dist/` under any name.

### Commanding officers (`ship.json` → `Commanding_Officers`)

`Entries` hold `No`, `Rank`, `Name`, `From` and `To` (ISO dates) and the dates as written. `Note` must say whether the list is complete; it is checked by the Verified-First rules. Never add service numbers.

## Photo credits and unpublished photographs

- For the project's own photographs, write the credit as `{project_photo_credit}` (in `Image_Credit`, `Credit`, `Photo_Credit` or `Hero_Image_Credit`). The site replaces it with `Project_Photo_Credit` from `site_content.json`, currently "Photograph: KD Hang Tuah Museum Project", so the wording can be changed in one place. Never use it for photographs taken by other people.
- Photographs that are not yet approved stay in `research/photos/` and are listed in `research/reference_images.json`. Nothing in `research/` is published: the build ignores it and the development server refuses it. `npm test` fails if a withheld image appears under `public/` or `dist/`, or if a data file points to one.
- To publish an approved photograph: copy it into `public/images/…`, set the record's image path and credit, update its entry in `reference_images.json`, and run `npm test`.

## gallery.json — general photographs

`Category` decides where a photo appears: `Archive` (the first one is the home page's featured photograph), `Ship`, `Museum` (Legacy page). All appear on The Ship → Photographs. Fill `Credit` and `Rights_Status` for every real photograph.

## sources.json — source register

```json
{
  "Source_ID": "SRC006",
  "Source_Title": "Exact title of the book, article, file or web page",
  "Author_or_Organisation": "Author or publisher",
  "Source_Type": "Primary — official",
  "Publication_Date": "1986",
  "Source_URL": "https://…",
  "Document_Reference": "p. 44 / file no. / archive box",
  "Related_Event_IDs": ["EVT019"],
  "Related_Location_IDs": ["LOC012"],
  "Image_Credit": "",
  "Rights_Status": "",
  "Verification_Notes": "What this source confirms and any limitations.",
  "Is_Placeholder": false
}
```

Only enter URLs you have opened yourself. Links appear at `#/sources#SRC006`.

## site_content.json — page text

`en` and `ms` hold the introductory text for each page. `Visitor_Info` holds opening hours, admission, address, contact and official website; empty values show "Not yet confirmed". Only fill these from the operator's official announcement, and set `Last_Checked` to the date you checked. `Show_Demo_Notice` turns the demonstration banner on or off. `Home_Coordinates` is the position shown under the hero.

Interface labels (buttons, menu) are in `src/i18n/strings.ts`.

## Deleting the demonstration data

When you are ready to start from your own research:

1. Delete the demo records you are not keeping (or set their content to your researched version and `Is_Demo_Data` to `false`).
2. Delete `SRC004` ("Second reference for launch date (demonstration)").
3. Replace placeholder sources (`Is_Placeholder: true`) with real ones.
4. Run `npm run validate-data` until it reports no errors.
5. Keep `Show_Demo_Notice` set to `true` with the "Research edition" wording while any record is Needs Verification or Disputed; set it to `false` only when every published record is confirmed.

## 3D Ship Explorer (prototype, staging only)

The Ship page has an interactive 3D exterior model between the introduction and the specifications.

- **Model:** `public/models/kd-hang-tuah-exterior.glb`, an approximate reconstruction generated by `node scripts/build-ship-model.mjs` (no textures or photographs). Units are metres; +x is the bow, +y up, +z starboard, y = 0 the waterline. Configuration parts sit under the nodes `config_as_built` and `config_later`; everything else is under `shared`. Provenance, assumptions and evidence still needed: `research/model-notes.json`.
- **Data:** `public/data/ship_exterior.json`, kept separate from the 3D code (`src/features/ship3d/`).
  - `Components`: one entry per selectable part, with `Meshes` (node names in the GLB), `Config` (`shared`, `as_built` or `later`), `Counterpart_ID` (the part that takes its place in the other configuration), `Description`, `Function`, `History`, `Model_Accuracy`, `Source_IDs`, `Verification`, `Related_Space_ID` (a Life Onboard space) and `Imagery` (approved photographs and documents only; empty for now).
  - `Dimensions`: the recorded figures. `Line` says which measurement line the model draws (`length_overall`, `beam_max`, `draught`) or `null` when the figure cannot be mapped to the model (Height). `Mapping_Note` explains the mapping.
  - `Configurations` and `Comparison_Note`: the As built and Later TLDM configurations. Do not add a date to the Later configuration without a source.
- **Rules** (checked by `npm run validate-data` and `npm test`): every component and dimension is Verified and cites sources that are relied on; every component states its model accuracy; only approved imagery may be listed; every mesh named exists in the model.
- To change a shape, edit `scripts/build-ship-model.mjs`, run it, and update `research/model-notes.json`.
- **Phase 2 (5 November 2026):** the model adds railings (separate `railing_*` parts), ladders, deck fittings, the pennant marking (`pennant_f76_*` as built, `pennant_76_*` later; painted onto the hull surface), boats per configuration, and a conceptual internal group `internal_conceptual` (deck levels, watertight bulkheads from the No. 3 deck plan, approximate machinery compartments, shaft lines). Components have a `Layer` (`exterior`, `structural`, `internal`); structural and internal parts must say they are conceptual or approximate. `Marker: false` hides a part's numbered marker; `Anchor_Meshes` chooses which meshes place its marker. Technical view offers four displays: Exterior, Wireframe, Structural and Internal / engine room.

- **3D Ship Explorer, Phase 3 (staging):** `ship_exterior.json` adds `Spaces` (the five spaces that can be inspected from the inside), `Interior_Note`, and per component `Space` (interior parts), `Inspect_Space` (a part whose inside can be opened from its panel) and `Model_Status` (`Supported`, `Approximate reconstruction`, `Conceptual`, `Pending verification`; separate from the record's `Verification`). Interior parts use `Layer: "interior"`, belong to the later configuration and must say they are approximate or representative. The evidence for each reconstructed part is in `research/evidence-register.json` (research only). Site-visit photographs are internal modelling references: never add them to `public/`, the GLB or the distributable ZIP.
