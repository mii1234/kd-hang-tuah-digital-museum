import type { DataIssue, MuseumData, ShipProfile, SiteContent } from './types';
import { validateData } from './validate';
import { checkVerifiedFirst } from './verifiedFirst';
import { sortEvents, checkEventOrder } from './sortEvents';
import { assetUrl } from '../utils/assets';

// All editable content lives in public/data/*.json. This module is the only place
// that knows the file names.
export const DATA_FILES = {
  ship: 'data/ship.json',
  events: 'data/events.json',
  locations: 'data/locations.json',
  voyages: 'data/voyages.json',
  routePoints: 'data/route_points.json',
  components: 'data/ship_components.json',
  gallery: 'data/gallery.json',
  sources: 'data/sources.json',
  content: 'data/site_content.json',
} as const;

type Key = keyof typeof DATA_FILES;

/** Placeholder for the project's own photo credit; see site_content.json → Project_Photo_Credit. */
export const PHOTO_CREDIT_TOKEN = '{project_photo_credit}';

const DEFAULT_SHIP: ShipProfile = {
  Ship_Name: 'KD Hang Tuah',
  Historical_Names: [],
  Summary: '',
  Sections: [],
  Specifications: [],
  Is_Demo_Data: true,
};

const DEFAULT_CONTENT: SiteContent = {
  Show_Demo_Notice: true,
  Institution_Name: 'KD Hang Tuah Digital Maritime Museum',
  Institution_Note: '',
  en: {},
  ms: {},
  Visitor_Info: {},
};

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(assetUrl(path), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  // Some servers answer a missing file with the site's own index.html.
  if (text.trimStart().startsWith('<')) throw new Error('file not found');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`invalid JSON — ${(e as Error).message}`);
  }
}

// Timeline ordering lives in sortEvents.ts (key-based, so mixed-precision dates sort consistently).
export { sortEvents };

export async function loadMuseumData(): Promise<MuseumData> {
  const keys = Object.keys(DATA_FILES) as Key[];
  const results = await Promise.allSettled(keys.map((k) => fetchJson(DATA_FILES[k])));
  const issues: DataIssue[] = [];
  const raw: Partial<Record<Key, unknown>> = {};
  let failures = 0;
  results.forEach((r, i) => {
    const key = keys[i];
    if (r.status === 'fulfilled') raw[key] = r.value;
    else {
      failures++;
      issues.push({
        file: DATA_FILES[key].replace('data/', ''),
        level: 'error',
        message: `Could not load this file (${(r.reason as Error).message}). That part of the site is shown empty.`,
      });
    }
  });
  if (failures === keys.length) {
    throw new Error('None of the data files could be loaded. If you opened index.html directly from your computer, run the site with "npm run dev" or "npm run preview" instead.');
  }

  const clean = validateData({
    events: raw.events ?? [],
    locations: raw.locations ?? [],
    voyages: raw.voyages ?? [],
    routePoints: raw.routePoints ?? [],
    components: raw.components ?? [],
    gallery: raw.gallery ?? [],
    sources: raw.sources ?? [],
  });

  const shipRaw = (raw.ship && typeof raw.ship === 'object' ? raw.ship : {}) as Partial<ShipProfile>;
  const ship: ShipProfile = {
    ...DEFAULT_SHIP,
    ...shipRaw,
    Historical_Names: Array.isArray(shipRaw.Historical_Names) ? shipRaw.Historical_Names : [],
    Sections: Array.isArray(shipRaw.Sections) ? shipRaw.Sections : [],
    Specifications: Array.isArray(shipRaw.Specifications) ? shipRaw.Specifications : [],
  };
  // Ship profile fields follow the same rule as events: "Verified" needs a source.
  const guard = <T extends { Verification: string; Source_IDs?: string[] }>(item: T, label: string): T => {
    if (item.Verification === 'Verified' && !(item.Source_IDs ?? []).length) {
      issues.push({ file: 'ship.json', id: label, level: 'warning', message: 'Marked "Verified" but lists no Source_IDs, so it is shown as "Needs Verification".' });
      return { ...item, Verification: 'Needs Verification' };
    }
    return item;
  };
  ship.Specifications = ship.Specifications.map((x) => guard(x, x.Key));
  ship.Historical_Names = ship.Historical_Names.map((x) => guard(x, x.Name));
  ship.Sections = ship.Sections.map((x) => guard(x, x.Section_ID));
  if (ship.Pennant_Number) ship.Pennant_Number = guard(ship.Pennant_Number, 'Pennant_Number');

  const contentRaw = (raw.content && typeof raw.content === 'object' ? raw.content : {}) as Partial<SiteContent>;
  const content: SiteContent = {
    ...DEFAULT_CONTENT,
    ...contentRaw,
    en: { ...(contentRaw.en ?? {}) },
    ms: { ...(contentRaw.ms ?? {}) },
    Visitor_Info: { ...(contentRaw.Visitor_Info ?? {}) },
  };

  // The project's own photographs are credited as {project_photo_credit} in the JSON, so the
  // wording can be changed in one place (site_content.json → Project_Photo_Credit).
  const credit = content.Project_Photo_Credit?.trim() || 'Photograph: KD Hang Tuah Museum Project';
  const fillCredit = (v?: string) => (v ? v.split(PHOTO_CREDIT_TOKEN).join(credit) : v);
  clean.events.forEach((e) => { e.Image_Credit = fillCredit(e.Image_Credit); });
  clean.gallery.forEach((g) => { g.Credit = fillCredit(g.Credit); });
  clean.components.forEach((c) => { c.Photo_Credit = fillCredit(c.Photo_Credit); });
  clean.sources.forEach((s) => { s.Image_Credit = fillCredit(s.Image_Credit); });
  ship.Sections.forEach((s) => { s.Image_Credit = fillCredit(s.Image_Credit); });
  ship.Hero_Image_Credit = fillCredit(ship.Hero_Image_Credit);

  const events = sortEvents(clean.events);
  const verifiedFirst = checkVerifiedFirst({ ...clean, ship, content });
  const allIssues = [...issues, ...clean.issues, ...checkEventOrder(clean.events), ...verifiedFirst];
  if (allIssues.length && import.meta.env.DEV) {
    console.groupCollapsed(`[KD Hang Tuah] ${allIssues.length} data issue(s) — see the Sources page for details`);
    allIssues.forEach((i) => console.warn(`${i.file}${i.id ? ` (${i.id})` : ''}: ${i.message}`));
    console.groupEnd();
  }

  return {
    ship,
    content,
    events,
    locations: clean.locations,
    voyages: clean.voyages,
    routePoints: clean.routePoints,
    components: clean.components,
    gallery: clean.gallery,
    sources: clean.sources,
    issues: allIssues,
    eventById: new Map(events.map((e) => [e.Event_ID, e])),
    locationById: new Map(clean.locations.map((l) => [l.Location_ID, l])),
    sourceById: new Map(clean.sources.map((s) => [s.Source_ID, s])),
  };
}
