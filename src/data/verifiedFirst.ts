import type { DataIssue, HistoricalEvent, Location, RoutePoint, ShipComponent, ShipProfile, SiteContent, Source, Voyage } from './types';

// Verified-First rules for the public data (site_content.json → "Verified_First": true).
// Everything shown publicly must be Verified and cite only sources that are relied on.
// Unconfirmed, disputed and withheld records live in research/data/, which is never published.

export interface PublicData {
  events: HistoricalEvent[];
  locations: Location[];
  voyages: Voyage[];
  routePoints: RoutePoint[];
  components: ShipComponent[];
  sources: Source[];
  ship: ShipProfile;
  content: SiteContent;
  /**
   * Sources cited by public data checked by its own rules (the 3D Ship Explorer, ship_exterior.json), so that a
   * source relied on only there is not reported as uncited.
   */
  extraCitations?: string[];
}

export const ILLUSTRATIVE_LABEL = 'not a recorded position';

export function checkVerifiedFirst(d: PublicData): DataIssue[] {
  const issues: DataIssue[] = [];
  if (!d.content.Verified_First) return issues;
  const err = (file: string, id: string, message: string) => issues.push({ file, id, level: 'error', message });
  const byId = new Map(d.sources.map((s) => [s.Source_ID, s]));
  const cited = new Set<string>();
  const cites = (file: string, id: string, ids: string[] | undefined, required = true) => {
    const list = ids ?? [];
    if (required && list.length === 0) err(file, id, 'Shown publicly but cites no source.');
    for (const s of list) {
      cited.add(s);
      const src = byId.get(s);
      if (!src) err(file, id, `Cites ${s}, which is not in sources.json.`);
      else if (src.Relied_On === false) err(file, id, `Cites ${s}, which is listed as "not relied on". Cite a relied-on source or withhold the claim.`);
    }
  };
  const verified = (file: string, id: string, status: string) => {
    if (status !== 'Verified') err(file, id, `Status is "${status}". Only Verified records belong in the public data; keep this one in research/data/.`);
  };

  d.events.forEach((e) => { verified('events.json', e.Event_ID, e.Verification); cites('events.json', e.Event_ID, e.Source_IDs); });
  d.locations.forEach((l) => {
    if (l.Verification === 'Illustrative') {
      if (!(l.Description ?? '').toLowerCase().includes(ILLUSTRATIVE_LABEL)) err('locations.json', l.Location_ID, `Illustrative place must say "${ILLUSTRATIVE_LABEL}" in its description.`);
    } else verified('locations.json', l.Location_ID, l.Verification);
    cites('locations.json', l.Location_ID, l.Source_IDs);
    // Coordinates must never be read as the ship's exact position unless a source records it.
    if (!l.Coordinate_Basis) err('locations.json', l.Location_ID, 'Shown publicly without Coordinate_Basis (say what the coordinates represent, e.g. "Approximate port position — not the ship\'s berth").');
  });
  d.routePoints.forEach((p) => {
    if (p.Position_Type === 'Illustrative Waypoint') {
      if (p.Route_Status !== 'Illustrative') err('route_points.json', p.Route_Point_ID, 'Schematic waypoints must be marked Illustrative.');
      return;
    }
    verified('route_points.json', p.Route_Point_ID, p.Route_Status);
    cites('route_points.json', p.Route_Point_ID, p.Source_IDs);
  });
  d.voyages.forEach((v) => { verified('voyages.json', v.Voyage_ID, v.Verification); cites('voyages.json', v.Voyage_ID, v.Source_IDs); });
  d.components.forEach((c) => { verified('ship_components.json', c.Component_ID, c.Verification); cites('ship_components.json', c.Component_ID, c.Source_IDs); });

  const s = d.ship;
  if (s.Pennant_Number) { verified('ship.json', 'Pennant_Number', s.Pennant_Number.Verification); cites('ship.json', 'Pennant_Number', s.Pennant_Number.Source_IDs); }
  s.Historical_Names.forEach((n) => { verified('ship.json', n.Name, n.Verification); cites('ship.json', n.Name, n.Source_IDs); });
  s.Sections.forEach((x) => { verified('ship.json', x.Section_ID, x.Verification); cites('ship.json', x.Section_ID, x.Source_IDs); });
  s.Specifications.forEach((x) => {
    // A specification still being checked may appear only as an empty placeholder row.
    if (x.Value) { verified('ship.json', x.Key, x.Verification); cites('ship.json', x.Key, x.Source_IDs); }
    else if ((x.Source_IDs ?? []).length) err('ship.json', x.Key, 'Placeholder specification (empty value) should not cite sources.');
  });
  if (s.Commanding_Officers) {
    const co = s.Commanding_Officers;
    verified('ship.json', 'Commanding_Officers', co.Verification);
    cites('ship.json', 'Commanding_Officers', co.Source_IDs);
    if (!co.Note) err('ship.json', 'Commanding_Officers', 'The list must say whether it is complete (Note).');
  }

  const planned = d.content.Planned_Opening;
  if (planned) {
    if (planned.Status !== 'Planned') err('site_content.json', 'Planned_Opening', 'Status must be "Planned".');
    cites('site_content.json', 'Planned_Opening', planned.Source_IDs);
  }
  Object.entries(d.content.Page_Text_Sources ?? {}).forEach(([key, ids]) => cites('site_content.json', key, ids));
  for (const id of d.extraCitations ?? []) cited.add(id);

  d.sources.forEach((src) => {
    if (src.Relied_On !== false && !cited.has(src.Source_ID)) {
      issues.push({ file: 'sources.json', id: src.Source_ID, level: 'warning', message: 'Listed as relied on, but no public record cites it. Move it to the further references (Relied_On: false) or cite it.' });
    }
  });
  return issues;
}
