# KD Hang Tuah — Digital Maritime Museum

A frontend-only heritage website for KD Hang Tuah, a historic vessel associated with the Royal Malaysian Navy (TLDM). It presents the ship's timeline, an animated voyage chart, a vessel record card, a catalogue of on-board spaces, the preservation story and a source register.

There is no backend, database, login or API key. Every piece of content comes from JSON files in `public/data/` and photographs in `public/images/`, so the site can be maintained by editing files.

> **All historical content currently in the project is demonstration data.** Nothing has been verified against a source. See `HISTORICAL_VERIFICATION.md` before publishing.

---

## 1. Run it

You need **Node.js 20.19 or newer** (22 LTS recommended). Check with `node -v`.

```bash
npm install          # once, downloads dependencies
npm run dev          # development server with live reload → http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds the finished site into `dist/` |
| `npm run preview` | Serves the built `dist/` folder at http://localhost:4173 |
| `npm run validate-data` | Checks every JSON file and lists problems (exit code 1 on errors) |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Timeline-ordering, photo-privacy and Verified-First tests (Node's built-in test runner) |

**Publishing:** upload the contents of `dist/` to any static host (GitHub Pages, Netlify, a university web server). The site uses hash URLs (`/#/story?event=EVT004`), so no server configuration is needed and it works from a sub-folder.

**Do not** double-click `dist/index.html`: browsers block the JSON files when a page is opened from disk. Always use `npm run dev`, `npm run preview` or a web server.

## 2. Where things are

```
public/
  data/                 ← all editable content (see DATA_GUIDE.md)
    ship.json             vessel profile, specifications, names, service sections
    events.json           every timeline event
    locations.json        ports and places with coordinates
    voyages.json          journeys shown on the chart
    route_points.json     the ordered points that draw each voyage
    ship_components.json  Life Onboard catalogue
    gallery.json          general photographs (archive, ship, museum)
    sources.json          the source register
    site_content.json     page text in English and Malay, visitor info, demo notice switch
  images/               ← photographs (see "Adding photographs" below)
    ship/ events/ archive/ components/ museum/ placeholders/
src/
  components/           shared UI: header, footer, search, lightbox, image frame, badges
  pages/                one file per page (Home, Story, Voyage, Ship, Onboard, Legacy, Sources)
  features/
    timeline/           timeline list, filters, event record, life-span strip
    map/                Leaflet map, route geometry, playback engine, controls, panel
    gallery/            component cards
  data/                 types, JSON loader, validation rules, data context
  i18n/                 interface labels in English and Malay, language switch
  hooks/ utils/ styles/ helpers, date and coordinate formatting, design tokens, print styles
scripts/validate-data.mjs  command-line data checker
tests/                     npm test: timeline ordering, photo privacy, Verified-First rules
research/                  never built or served:
  data/                    research register: every record, incl. unconfirmed and withheld ones
  archive/proposal-v4/     unchanged copy of the data the register was built from
  photos/, reference_images.json   unpublished photographs and reference list
  archive/proposal-v5.2/   the register before the TLDM-materials review (Change_Log undoes to this)
  tldm_reference_inventory.json   photographs from the TLDM materials (all unpublished)
```

## 3. Pages

| Page | URL | Highlights |
| --- | --- | --- |
| Home | `#/` | Hero, milestone strip, timeline and voyage previews, featured photograph |
| The Story | `#/story` | Vertical timeline, life-span strip, search, theme/period/status filters, record view, previous/next, copy link, print |
| The Voyage | `#/voyage` | Leaflet chart, animated ship, Play/Pause/Resume/Replay/Reset, scrubber, speed, previous/next stop, fit route, milestones, location popups |
| The Ship | `#/ship` | Record card of specifications, names in service, service record sections, photographs |
| Life Onboard | `#/onboard` | Component catalogue with search, categories and multi-photo lightbox |
| The Legacy | `#/legacy` | Preservation milestones, Lumut location map, visitor information placeholders |
| Sources | `#/sources` | Verification method, status counts, source register, live data checks |

Shareable links: `#/story?event=EVT004`, `#/voyage?voyage=VOY002`, `#/voyage?event=EVT007`, `#/voyage?location=LOC005`, `#/onboard?component=CMP007`, `#/sources#SRC001`.

Keyboard: `/` or `Ctrl+K` opens search. On the timeline, `[` and `]` move to the previous/next event. In the lightbox, arrow keys change photo and `Esc` closes.

## 4. Adding photographs

1. Put the file in the matching folder, for example `public/images/ship/hero.jpg`.
2. Use the **exact path already written in the JSON** (shown on each grey placeholder as "Add a file at …"), or change the path in the JSON to your file name. Paths start with `/images/…`.
3. Fill in the caption and credit fields next to the path (`Image_Caption`, `Image_Credit`, `Photo_Credit` or `Credit`). The site shows "Credit to be added" until you do.
4. Reload. Missing or misspelt files never show a broken icon; the labelled placeholder stays until the file is found.

Photographs awaiting approval stay in `research/photos/`, which is never published (see DATA_GUIDE.md, "Photo credits and unpublished photographs").

Recommended: JPG, about 2000 px on the long side, under 500 KB. Use lowercase names without spaces (`bridge-wheel-01.jpg`). Only use photographs you have the right to publish, and record the rights in `gallery.json` → `Rights_Status` or in `sources.json`.

| Where it appears | JSON field |
| --- | --- |
| Home hero | `ship.json` → `Hero_Image_URL` (+ `Hero_Image_Caption`, `Hero_Image_Credit`) |
| Timeline record | `events.json` → `Image_URL`, `Image_Caption`, `Image_Credit` |
| Ship service sections | `ship.json` → `Sections[].Image_URL` |
| Ship photographs, featured photo, museum photos | `gallery.json` → `Image_URL` (`Category`: Archive, Ship or Museum) |
| Life Onboard | `ship_components.json` → `Image_URLs` (list, one or more) + `Image_Captions` (same order) + `Photo_Credit` |

## 5. Changing content

See **`DATA_GUIDE.md`** for every field, with copy-and-paste templates for events, locations, route points, voyages, components and sources. After editing, run `npm run validate-data` or open the **Sources → Data checks** section of the site.

The banner currently reads "Research edition". Its text is `demo_notice` in `site_content.json`; `"Show_Demo_Notice": false` hides it, which should only happen once every published record is confirmed.

## 6. Map tiles

The chart uses OpenStreetMap tiles (free, no key). The OSM tile servers are volunteer-run; their [usage policy](https://operations.osmfoundation.org/policies/tiles/) requires attribution (shown on the map) and modest traffic. For a high-traffic launch, change `TILE_URL` and `TILE_ATTRIBUTION` in `src/features/map/mapConfig.ts` to another provider.

Without internet access, tiles cannot load: the page shows a notice and the route, ports and ship animation continue on a plain chart grid. Fonts are bundled with the site, so typography works offline.

## 7. Dependencies

| Package | Purpose |
| --- | --- |
| react, react-dom 19 | UI |
| react-router-dom 7 | Page routing (hash URLs) |
| leaflet 1.9, react-leaflet 5 | Interactive map |
| lucide-react | Icons |
| @fontsource/libre-caslon-display, libre-caslon-text, public-sans, ibm-plex-mono | Self-hosted fonts |
| vite 8, @vitejs/plugin-react, typescript 5.9, @types/* | Build tooling (development only) |

No animation library is used: motion is CSS plus a small `requestAnimationFrame` loop for the ship.

## 8. Design system

Colours, type scale, spacing and motion durations live in `src/styles/tokens.css`.

- Palette: midnight `#071A2B`, deep navy `#102A43`, ocean `#426A7A`, archival paper `#F3EFE6`, off-white `#FAF9F6`, brass `#B69A62`, slate `#697681`.
- Type: Libre Caslon Display (the ship's name), Libre Caslon Text (headings and historical text), Public Sans (interface), IBM Plex Mono (dates, coordinates, record IDs).
- Signature device: the ship's name set on a brass "waterline" draught scale. The same brass line marks the start of records and the ship's travelled course.
- Verification is always shown as icon + words (and on the map, by marker shape), never by colour alone.
- Motion: three durations (140/260/520 ms), two easing curves; all of it is switched off by the system "reduce motion" setting, and voyage playback steps port to port instead of gliding.

## 9. Feature checklist

Tested in Chromium at 1440×900 (desktop), 820×1180 (tablet) and 390×844 (mobile), including with reduced motion and with map tiles unavailable.

- [x] Runs with `npm install` + `npm run dev`; production build with `npm run build`
- [x] No backend, database, login or API key
- [x] All navigation links, mobile menu, active page indicator, skip link, 404 page
- [x] Home: hero, two calls to action, milestone strip, timeline preview, voyage preview, featured photo, onboard and legacy introductions, footer
- [x] Timeline loaded from `events.json`; search, theme, period and status filters; empty state with "Clear filters"
- [x] Event record: date with precision, category, status, demo tag, photo, place, disputed dates, notes, sources, related events, previous/next, copy link, print
- [x] Map loaded from `locations.json`, `voyages.json`, `route_points.json`
- [x] Ship marker moves on Play; Pause, Resume, Replay, Reset, speed (0.5×–4×), previous/next stop, scrubber forwards and backwards, fit route
- [x] Current panel updates date ("between" dates at sea), position, distance, leg, place and event
- [x] Selecting an event (timeline, strip, popup, milestones, URL) moves the map and updates the panel; selecting a place lists its events
- [x] Schematic segments drawn dashed and labelled; verified/needs-verification/illustrative ports use different marker shapes; legend
- [x] Events without coordinates and voyages with fewer than two points are handled
- [x] Vessel profile with "Data pending verification" for every unconfirmed specification
- [x] Life Onboard search, categories, multi-photo lightbox with keyboard support and credits
- [x] Legacy page with preservation milestones, Lumut location, visitor placeholders (no invented hours, prices or contacts)
- [x] Sources page with method, status counts, register, anchors and live data checks
- [x] Global search across events, places, components and sources
- [x] English / Malay interface switch, remembered between visits
- [x] Missing images show labelled placeholders; missing or broken JSON files show an error in Data checks while the rest of the site keeps working
- [x] "Verified" without a source is automatically shown as "Needs verification"
- [x] Reduced-motion support, visible focus, keyboard-operable controls, alt text, print stylesheet
- [x] Timeline order is consistent for mixed-precision dates (`npm test`)
- [x] Unapproved photographs cannot be published or served (`npm test`)
- [x] Public pages show only records supported by their cited sources; the rest stays in `research/data/` (`npm test`)
- [x] Map keeps working (plain chart) when tiles cannot load
