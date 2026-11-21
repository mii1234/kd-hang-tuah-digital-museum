import type {
  DataIssue, GalleryImage, HistoricalEvent, Location, RoutePoint, ShipComponent, Source, Verification, Voyage,
} from './types';
import { VERIFICATION_VALUES } from './types';
import { parseHistoricalDate } from '../utils/dates';
import { isValidLatLng } from '../utils/geo';
import { isUsableUrl } from '../utils/assets';

// Data checks run every time the site loads. Problems are collected as "issues"
// (shown on the Sources page and in the browser console) rather than crashing the site.
// Records that cannot be displayed safely are dropped; everything else is kept.

export interface RawData {
  events: unknown;
  locations: unknown;
  voyages: unknown;
  routePoints: unknown;
  components: unknown;
  gallery: unknown;
  sources: unknown;
}

export interface CleanData {
  events: HistoricalEvent[];
  locations: Location[];
  voyages: Voyage[];
  routePoints: RoutePoint[];
  components: ShipComponent[];
  gallery: GalleryImage[];
  sources: Source[];
  issues: DataIssue[];
}

type Rec = Record<string, unknown>;

function asArray(value: unknown, file: string, issues: DataIssue[]): Rec[] {
  if (!Array.isArray(value)) {
    issues.push({ file, level: 'error', message: 'File must contain a JSON array [ … ]. Nothing from this file is shown.' });
    return [];
  }
  return value.filter((r, i) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) return true;
    issues.push({ file, level: 'error', message: `Item #${i + 1} is not an object and was skipped.` });
    return false;
  }) as Rec[];
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim() !== '') : [];
}

function verification(v: unknown, file: string, id: string, issues: DataIssue[]): Verification {
  if (VERIFICATION_VALUES.includes(v as Verification)) return v as Verification;
  issues.push({ file, id, level: 'warning', message: `Verification "${str(v)}" is not one of ${VERIFICATION_VALUES.join(', ')}. Treated as "Needs Verification".` });
  return 'Needs Verification';
}

function demoFlag(v: unknown, file: string, id: string, issues: DataIssue[]): boolean {
  if (typeof v === 'boolean') return v;
  issues.push({ file, id, level: 'warning', message: 'Is_Demo_Data missing or not true/false. Treated as demo data so it is never mistaken for verified history.' });
  return true;
}

function uniqueIds(recs: Rec[], key: string, file: string, issues: DataIssue[]): Rec[] {
  const seen = new Set<string>();
  return recs.filter((r, i) => {
    const id = str(r[key]).trim();
    if (!id) {
      issues.push({ file, level: 'error', message: `Item #${i + 1} has no ${key} and was skipped.` });
      return false;
    }
    if (seen.has(id)) {
      issues.push({ file, id, level: 'error', message: `Duplicate ${key} "${id}". Only the first record with this ID is shown.` });
      return false;
    }
    seen.add(id);
    return true;
  });
}

/** "Verified" requires at least one source. Without one the record is shown as "Needs Verification". */
function checkVerifiedHasSource(status: Verification, sourceIds: string[], file: string, id: string, issues: DataIssue[]): Verification {
  if (status === 'Verified' && sourceIds.length === 0) {
    issues.push({ file, id, level: 'warning', message: 'Marked "Verified" but lists no Source_IDs, so it is shown as "Needs Verification". Add the supporting source.' });
    return 'Needs Verification';
  }
  return status;
}

export function validateData(raw: RawData): CleanData {
  const issues: DataIssue[] = [];

  // ---- sources
  const sources: Source[] = uniqueIds(asArray(raw.sources, 'sources.json', issues), 'Source_ID', 'sources.json', issues).map((r) => {
    const id = str(r.Source_ID);
    const url = str(r.Source_URL);
    if (url && !isUsableUrl(url)) {
      issues.push({ file: 'sources.json', id, level: 'warning', message: `Source_URL "${url}" is not a valid http(s) link and will not be shown as a link.` });
    }
    if (!str(r.Source_Title)) issues.push({ file: 'sources.json', id, level: 'warning', message: 'Source_Title is empty.' });
    return {
      Source_ID: id,
      Source_Title: str(r.Source_Title) || 'Untitled source',
      Author_or_Organisation: str(r.Author_or_Organisation),
      Source_Type: str(r.Source_Type),
      Publication_Date: str(r.Publication_Date),
      Source_URL: isUsableUrl(url) ? url : '',
      Document_Reference: str(r.Document_Reference),
      Related_Event_IDs: strArr(r.Related_Event_IDs),
      Related_Location_IDs: strArr(r.Related_Location_IDs),
      Image_Credit: str(r.Image_Credit),
      Rights_Status: str(r.Rights_Status),
      Verification_Notes: str(r.Verification_Notes),
      Is_Placeholder: r.Is_Placeholder === true,
      Relied_On: r.Relied_On !== false,
    };
  });
  const sourceIds = new Set(sources.map((s) => s.Source_ID));
  const checkSourceRefs = (ids: string[], file: string, id: string) => {
    ids.forEach((s) => {
      if (!sourceIds.has(s)) issues.push({ file, id, level: 'warning', message: `Refers to Source_ID "${s}", which is not in sources.json.` });
    });
  };

  // ---- locations
  const locations: Location[] = [];
  uniqueIds(asArray(raw.locations, 'locations.json', issues), 'Location_ID', 'locations.json', issues).forEach((r) => {
    const id = str(r.Location_ID);
    const lat = typeof r.Latitude === 'string' ? Number(r.Latitude) : r.Latitude;
    const lng = typeof r.Longitude === 'string' ? Number(r.Longitude) : r.Longitude;
    if (!isValidLatLng(lat, lng)) {
      issues.push({ file: 'locations.json', id, level: 'error', message: `Latitude/Longitude (${str(r.Latitude)}, ${str(r.Longitude)}) are missing or out of range. Location skipped.` });
      return;
    }
    const src = strArr(r.Source_IDs);
    checkSourceRefs(src, 'locations.json', id);
    const v = checkVerifiedHasSource(verification(r.Verification, 'locations.json', id, issues), src, 'locations.json', id, issues);
    locations.push({
      Location_ID: id,
      Location_Name: str(r.Location_Name) || id,
      Location_Name_MS: str(r.Location_Name_MS) || undefined,
      Country: str(r.Country),
      Latitude: lat as number,
      Longitude: lng as number,
      Location_Type: str(r.Location_Type),
      Description: str(r.Description),
      Coordinate_Basis: str(r.Coordinate_Basis) || undefined,
      Coordinate_Basis_MS: str(r.Coordinate_Basis_MS) || undefined,
      Source_IDs: src,
      Verification: v,
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'locations.json', id, issues),
    });
  });
  const locationIds = new Set(locations.map((l) => l.Location_ID));

  // ---- events
  const events: HistoricalEvent[] = [];
  uniqueIds(asArray(raw.events, 'events.json', issues), 'Event_ID', 'events.json', issues).forEach((r) => {
    const id = str(r.Event_ID);
    const date = str(r.Date);
    const precision = (['day', 'month', 'year'].includes(str(r.Date_Precision)) ? str(r.Date_Precision) : null) as HistoricalEvent['Date_Precision'];
    const parsed = parseHistoricalDate(date, precision);
    if (!parsed) {
      issues.push({ file: 'events.json', id, level: 'error', message: `Date "${date}" is not in YYYY, YYYY-MM or YYYY-MM-DD format. It is listed at the end of the timeline as "Date unknown".` });
    } else if (r.Date_Precision && !precision) {
      issues.push({ file: 'events.json', id, level: 'warning', message: `Date_Precision "${str(r.Date_Precision)}" should be "day", "month" or "year".` });
    } else if (precision && parsed.precision !== precision) {
      issues.push({ file: 'events.json', id, level: 'warning', message: `Date_Precision is "${precision}" but the Date "${date}" is less precise. Shown as ${parsed.precision}.` });
    }
    const end = r.End_Date == null || r.End_Date === '' ? null : str(r.End_Date);
    if (end && !parseHistoricalDate(end)) issues.push({ file: 'events.json', id, level: 'warning', message: `End_Date "${end}" is malformed and is ignored.` });
    let locId = r.Location_ID == null || r.Location_ID === '' ? null : str(r.Location_ID);
    if (locId && !locationIds.has(locId)) {
      issues.push({ file: 'events.json', id, level: 'warning', message: `Location_ID "${locId}" is not in locations.json (or was skipped). The event is shown without a map position.` });
      locId = null;
    }
    const src = strArr(r.Source_IDs);
    checkSourceRefs(src, 'events.json', id);
    const v = checkVerifiedHasSource(verification(r.Verification, 'events.json', id, issues), src, 'events.json', id, issues);
    const surl = str(r.Source_URL);
    if (surl && !isUsableUrl(surl)) issues.push({ file: 'events.json', id, level: 'warning', message: `Source_URL "${surl}" is not a valid http(s) link and is hidden.` });
    const alts = Array.isArray(r.Alternative_Dates) ? (r.Alternative_Dates as Rec[]).filter((a) => a && typeof a === 'object').map((a) => ({
      Date: str(a.Date),
      Date_Precision: (['day', 'month', 'year'].includes(str(a.Date_Precision)) ? str(a.Date_Precision) : null) as HistoricalEvent['Date_Precision'],
      Source_ID: str(a.Source_ID),
      Note: str(a.Note),
    })) : [];
    if (alts.length && v !== 'Disputed') {
      issues.push({ file: 'events.json', id, level: 'warning', message: 'Has Alternative_Dates but is not marked "Disputed". Consider changing Verification.' });
    }
    if (!str(r.Event_Title)) issues.push({ file: 'events.json', id, level: 'warning', message: 'Event_Title is empty.' });
    events.push({
      Event_ID: id,
      Date: date,
      Date_Precision: precision ?? parsed?.precision ?? null,
      End_Date: end && parseHistoricalDate(end) ? end : null,
      Event_Title: str(r.Event_Title) || 'Untitled event',
      Event_Title_MS: str(r.Event_Title_MS) || undefined,
      Event_Category: str(r.Event_Category) || 'Other',
      Location_ID: locId,
      Description: str(r.Description),
      Description_MS: str(r.Description_MS) || undefined,
      Historical_Notes: str(r.Historical_Notes),
      Image_URL: str(r.Image_URL),
      Image_Caption: str(r.Image_Caption),
      Image_Credit: str(r.Image_Credit),
      Source_URL: isUsableUrl(surl) ? surl : '',
      Source_IDs: src,
      Alternative_Dates: alts,
      Related_Event_IDs: strArr(r.Related_Event_IDs),
      Verification: v,
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'events.json', id, issues),
      Display_Order: typeof r.Display_Order === 'number' ? r.Display_Order : undefined,
    });
  });
  const eventIds = new Set(events.map((e) => e.Event_ID));
  events.forEach((e) => {
    e.Related_Event_IDs = (e.Related_Event_IDs ?? []).filter((rid) => {
      if (eventIds.has(rid)) return true;
      issues.push({ file: 'events.json', id: e.Event_ID, level: 'warning', message: `Related_Event_IDs refers to unknown event "${rid}".` });
      return false;
    });
  });

  // ---- route points
  const routePoints: RoutePoint[] = [];
  uniqueIds(asArray(raw.routePoints, 'route_points.json', issues), 'Route_Point_ID', 'route_points.json', issues).forEach((r) => {
    const id = str(r.Route_Point_ID);
    let lat = r.Latitude as number;
    let lng = r.Longitude as number;
    const locId = r.Location_ID == null || r.Location_ID === '' ? null : str(r.Location_ID);
    const loc = locId ? locations.find((l) => l.Location_ID === locId) : undefined;
    if (locId && !loc) issues.push({ file: 'route_points.json', id, level: 'warning', message: `Location_ID "${locId}" is not in locations.json.` });
    if (!isValidLatLng(lat, lng)) {
      if (loc) {
        lat = loc.Latitude;
        lng = loc.Longitude;
        issues.push({ file: 'route_points.json', id, level: 'warning', message: 'Coordinates missing or invalid; using the coordinates of its Location_ID.' });
      } else {
        issues.push({ file: 'route_points.json', id, level: 'error', message: 'Coordinates missing or out of range. Route point skipped.' });
        return;
      }
    }
    const date = r.Date == null || r.Date === '' ? null : str(r.Date);
    if (date && !parseHistoricalDate(date)) issues.push({ file: 'route_points.json', id, level: 'warning', message: `Date "${date}" is malformed and is ignored.` });
    const evId = r.Related_Event_ID == null || r.Related_Event_ID === '' ? null : str(r.Related_Event_ID);
    if (evId && !eventIds.has(evId)) issues.push({ file: 'route_points.json', id, level: 'warning', message: `Related_Event_ID "${evId}" is not in events.json.` });
    const seq = Number(r.Sequence_No);
    if (!Number.isFinite(seq)) issues.push({ file: 'route_points.json', id, level: 'warning', message: 'Sequence_No is missing; the point is placed at the end of its voyage.' });
    routePoints.push({
      Route_Point_ID: id,
      Voyage_ID: str(r.Voyage_ID),
      Sequence_No: Number.isFinite(seq) ? seq : 9999,
      Date: date && parseHistoricalDate(date) ? date : null,
      Date_Precision: (['day', 'month', 'year'].includes(str(r.Date_Precision)) ? str(r.Date_Precision) : null) as RoutePoint['Date_Precision'],
      Location_ID: loc ? locId : null,
      Related_Event_ID: evId && eventIds.has(evId) ? evId : null,
      Latitude: lat,
      Longitude: lng,
      Position_Type: str(r.Position_Type) || 'Illustrative Waypoint',
      Route_Status: checkVerifiedHasSource(verification(r.Route_Status, 'route_points.json', id, issues), strArr(r.Source_IDs), 'route_points.json', id, issues),
      Source_IDs: strArr(r.Source_IDs),
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'route_points.json', id, issues),
      Notes: str(r.Notes),
    });
  });
  routePoints.sort((a, b) => a.Voyage_ID.localeCompare(b.Voyage_ID) || a.Sequence_No - b.Sequence_No);
  const rpIds = new Set(routePoints.map((p) => p.Route_Point_ID));

  // ---- voyages
  const voyages: Voyage[] = uniqueIds(asArray(raw.voyages, 'voyages.json', issues), 'Voyage_ID', 'voyages.json', issues).map((r) => {
    const id = str(r.Voyage_ID);
    const listed = strArr(r.Route_Point_IDs).filter((p) => {
      if (rpIds.has(p)) return true;
      issues.push({ file: 'voyages.json', id, level: 'warning', message: `Route_Point_IDs refers to "${p}", which is not in route_points.json (or was skipped).` });
      return false;
    });
    // Points that name this voyage but are not listed are still included, in sequence order.
    const owned = routePoints.filter((p) => p.Voyage_ID === id).map((p) => p.Route_Point_ID);
    const ids = Array.from(new Set([...owned, ...listed]));
    if (ids.length < 2) issues.push({ file: 'voyages.json', id, level: 'warning', message: 'Fewer than two route points: the voyage can be shown but not animated.' });
    return {
      Voyage_ID: id,
      Voyage_Title: str(r.Voyage_Title) || id,
      Voyage_Title_MS: str(r.Voyage_Title_MS) || undefined,
      Start_Date: str(r.Start_Date),
      End_Date: str(r.End_Date),
      Description: str(r.Description),
      Route_Point_IDs: ids,
      Related_Event_IDs: strArr(r.Related_Event_IDs).filter((e) => eventIds.has(e)),
      Source_IDs: strArr(r.Source_IDs),
      Verification: checkVerifiedHasSource(verification(r.Verification, 'voyages.json', id, issues), strArr(r.Source_IDs), 'voyages.json', id, issues),
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'voyages.json', id, issues),
    };
  });

  // ---- components
  const components: ShipComponent[] = uniqueIds(asArray(raw.components, 'ship_components.json', issues), 'Component_ID', 'ship_components.json', issues).map((r) => {
    const id = str(r.Component_ID);
    const imgs = strArr(r.Image_URLs);
    if (!imgs.length) issues.push({ file: 'ship_components.json', id, level: 'warning', message: 'No Image_URLs; a placeholder is shown.' });
    return {
      Component_ID: id,
      Component_Name: str(r.Component_Name) || id,
      Component_Name_MS: str(r.Component_Name_MS) || undefined,
      Category: str(r.Category) || 'Other Components',
      Description: str(r.Description),
      Ship_Section: str(r.Ship_Section),
      Image_URLs: imgs,
      Image_Captions: strArr(r.Image_Captions),
      Photo_Credit: str(r.Photo_Credit),
      Source_IDs: strArr(r.Source_IDs),
      Verification: checkVerifiedHasSource(verification(r.Verification, 'ship_components.json', id, issues), strArr(r.Source_IDs), 'ship_components.json', id, issues),
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'ship_components.json', id, issues),
    };
  });

  // ---- gallery
  const gallery: GalleryImage[] = uniqueIds(asArray(raw.gallery, 'gallery.json', issues), 'Image_ID', 'gallery.json', issues).map((r) => {
    const id = str(r.Image_ID);
    return {
      Image_ID: id,
      Image_URL: str(r.Image_URL),
      Caption: str(r.Caption),
      Category: str(r.Category) || 'Archive',
      Date: r.Date == null ? null : str(r.Date),
      Date_Precision: (['day', 'month', 'year'].includes(str(r.Date_Precision)) ? str(r.Date_Precision) : null) as GalleryImage['Date_Precision'],
      Related_Event_IDs: strArr(r.Related_Event_IDs),
      Credit: str(r.Credit),
      Rights_Status: str(r.Rights_Status),
      Is_Demo_Data: demoFlag(r.Is_Demo_Data, 'gallery.json', id, issues),
    };
  });

  return { events, locations, voyages, routePoints, components, gallery, sources, issues };
}
