import type { HistoricalEvent, MuseumData, RoutePoint, Voyage } from '../../data/types';
import { distanceNm, lerpLatLng, type LatLng } from '../../utils/geo';

export interface RouteSegment {
  from: number;
  to: number;
  /** Only segments whose two ends are both Verified, documented positions are drawn solid. */
  supported: boolean;
}

export interface VoyageRoute {
  voyage: Voyage;
  points: RoutePoint[];
  latlngs: LatLng[];
  cumNm: number[]; // cumulative distance at each point
  totalNm: number;
  segments: RouteSegment[];
  /** Indexes of points that are named places (not schematic sea waypoints). */
  stops: number[];
}

export function isNamedPoint(p: RoutePoint): boolean {
  return Boolean(p.Location_ID) && p.Position_Type !== 'Illustrative Waypoint';
}

function isDocumented(p: RoutePoint): boolean {
  return p.Route_Status === 'Verified' && p.Position_Type === 'Documented Location';
}

export function buildRoute(data: MuseumData, voyage: Voyage): VoyageRoute {
  const byId = new Map(data.routePoints.map((p) => [p.Route_Point_ID, p]));
  const points = voyage.Route_Point_IDs
    .map((id) => byId.get(id))
    .filter((p): p is RoutePoint => Boolean(p))
    .sort((a, b) => a.Sequence_No - b.Sequence_No);
  const latlngs = points.map((p) => [p.Latitude, p.Longitude] as LatLng);
  const cumNm: number[] = [];
  let total = 0;
  latlngs.forEach((ll, i) => {
    if (i > 0) total += distanceNm(latlngs[i - 1], ll);
    cumNm.push(total);
  });
  const segments: RouteSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ from: i, to: i + 1, supported: isDocumented(points[i]) && isDocumented(points[i + 1]) });
  }
  const stops = points.map((p, i) => (isNamedPoint(p) ? i : -1)).filter((i) => i >= 0);
  return { voyage, points, latlngs, cumNm, totalNm: total, segments, stops };
}

export interface RoutePosition {
  latlng: LatLng;
  segmentIndex: number; // index of the point at the start of the current segment
  t: number;            // 0..1 along that segment
  nm: number;
  /** Index of a point the ship is exactly at (within tolerance), otherwise null. */
  atPoint: number | null;
}

/** Position along the route for a progress fraction 0..1, measured by distance. */
export function positionAt(route: VoyageRoute, fraction: number): RoutePosition {
  const n = route.points.length;
  if (n === 0) return { latlng: [0, 0], segmentIndex: 0, t: 0, nm: 0, atPoint: null };
  if (n === 1 || route.totalNm === 0) return { latlng: route.latlngs[0], segmentIndex: 0, t: 0, nm: 0, atPoint: 0 };
  const f = Math.min(Math.max(fraction, 0), 1);
  const nm = f * route.totalNm;
  let i = 0;
  while (i < n - 2 && route.cumNm[i + 1] <= nm) i++;
  const segLen = route.cumNm[i + 1] - route.cumNm[i];
  const t = segLen > 0 ? (nm - route.cumNm[i]) / segLen : 0;
  const tol = route.totalNm * 0.0015;
  let atPoint: number | null = null;
  if (Math.abs(nm - route.cumNm[i]) <= tol) atPoint = i;
  else if (Math.abs(route.cumNm[i + 1] - nm) <= tol) atPoint = i + 1;
  return { latlng: lerpLatLng(route.latlngs[i], route.latlngs[i + 1], t), segmentIndex: i, t, nm, atPoint };
}

export function fractionAtPoint(route: VoyageRoute, index: number): number {
  if (route.totalNm === 0) return 0;
  return route.cumNm[index] / route.totalNm;
}

/** The latlngs travelled so far, ending exactly at the ship. */
export function travelledPath(route: VoyageRoute, pos: RoutePosition): LatLng[] {
  return [...route.latlngs.slice(0, pos.segmentIndex + 1), pos.latlng];
}

/** Most recent named stop at or before the current position. */
export function lastStopIndex(route: VoyageRoute, pos: RoutePosition): number | null {
  const reached = pos.atPoint !== null ? pos.atPoint : pos.segmentIndex;
  let last: number | null = null;
  for (const s of route.stops) if (s <= reached) last = s;
  return last;
}

export function nextStopIndex(route: VoyageRoute, pos: RoutePosition): number | null {
  const reached = pos.atPoint !== null ? pos.atPoint : pos.segmentIndex;
  return route.stops.find((s) => s > reached) ?? null;
}

/** Nearest dated points before and after the position, used for the "between" date label. */
export function datedNeighbours(route: VoyageRoute, pos: RoutePosition): { before: RoutePoint | null; after: RoutePoint | null } {
  const reached = pos.atPoint !== null ? pos.atPoint : pos.segmentIndex;
  let before: RoutePoint | null = null;
  for (let i = reached; i >= 0; i--) if (route.points[i].Date) { before = route.points[i]; break; }
  let after: RoutePoint | null = null;
  const startAfter = pos.atPoint !== null ? pos.atPoint + 1 : pos.segmentIndex + 1;
  for (let i = startAfter; i < route.points.length; i++) if (route.points[i].Date) { after = route.points[i]; break; }
  return { before, after };
}

/** Find the voyage and point that best represent an event on the chart. */
export function findEventOnRoutes(routes: VoyageRoute[], event: HistoricalEvent): { route: VoyageRoute; index: number } | null {
  for (const r of routes) {
    const i = r.points.findIndex((p) => p.Related_Event_ID === event.Event_ID);
    if (i >= 0) return { route: r, index: i };
  }
  for (const r of routes) {
    if (!(r.voyage.Related_Event_IDs ?? []).includes(event.Event_ID) || !event.Location_ID) continue;
    const i = r.points.findIndex((p) => p.Location_ID === event.Location_ID);
    if (i >= 0) return { route: r, index: i };
  }
  return null;
}
