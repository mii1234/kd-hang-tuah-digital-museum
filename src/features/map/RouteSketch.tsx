import { useMemo, type ReactElement } from 'react';
import type { MuseumData } from '../../data/types';
import { buildRoute } from './route';
import { useLang } from '../../i18n/LanguageContext';

/**
 * A lightweight, tile-free chart sketch of every voyage, used as a preview on the home page.
 * Simple equirectangular projection; good enough for an overview, not for navigation.
 */
export function RouteSketch({ data, title }: { data: MuseumData; title: string }) {
  const { locName } = useLang();
  const routes = useMemo(() => data.voyages.map((v) => buildRoute(data, v)).filter((r) => r.points.length > 1), [data]);
  const all = routes.flatMap((r) => r.latlngs);
  if (all.length < 2) return null;
  const W = 1000;
  const H = 420;
  const pad = 40;
  const lats = all.map((p) => p[0]);
  const lngs = all.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const sx = (W - pad * 2) / Math.max(maxLng - minLng, 1);
  const sy = (H - pad * 2) / Math.max(maxLat - minLat, 1);
  const s = Math.min(sx, sy);
  const offX = (W - (maxLng - minLng) * s) / 2;
  const offY = (H - (maxLat - minLat) * s) / 2;
  const x = (lng: number) => offX + (lng - minLng) * s;
  const y = (lat: number) => H - (offY + (lat - minLat) * s);

  // graticule every 10 degrees
  const grid: ReactElement[] = [];
  for (let g = Math.ceil(minLng / 10) * 10; g <= maxLng; g += 10) grid.push(<line key={`v${g}`} x1={x(g)} x2={x(g)} y1={0} y2={H} />);
  for (let g = Math.ceil(minLat / 10) * 10; g <= maxLat; g += 10) grid.push(<line key={`h${g}`} y1={y(g)} y2={y(g)} x1={0} x2={W} />);

  const named = new Map<string, { lat: number; lng: number; name: string }>();
  routes.forEach((r) => r.points.forEach((p) => {
    if (p.Location_ID && p.Position_Type !== 'Illustrative Waypoint') {
      const loc = data.locationById.get(p.Location_ID);
      if (loc) named.set(loc.Location_ID, { lat: loc.Latitude, lng: loc.Longitude, name: locName(loc).split(',')[0] });
    }
  }));

  // avoid overlapping labels where ports cluster (e.g. the Strait of Malacca)
  const labelled: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const ports = Array.from(named.values()).map((n) => {
    const px = x(n.lng), py = y(n.lat);
    const box = { x0: px - 6, x1: px + 12 + n.name.length * 8.2, y0: py - 26, y1: py + 6 };
    const clash = labelled.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
    if (!clash) labelled.push(box);
    return { ...n, px, py, showLabel: !clash };
  });

  return (
    <svg className="route-sketch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
      <g className="route-sketch__grid">{grid}</g>
      {routes.map((r, i) => (
        <polyline
          key={r.voyage.Voyage_ID}
          className={`route-sketch__line route-sketch__line--${i}`}
          points={r.latlngs.map(([la, ln]) => `${x(ln).toFixed(1)},${y(la).toFixed(1)}`).join(' ')}
        />
      ))}
      {ports.map((n) => (
        <g key={n.name} className="route-sketch__port" transform={`translate(${n.px.toFixed(1)} ${n.py.toFixed(1)})`}>
          <circle r="4" />
        </g>
      ))}
      {ports.filter((n) => n.showLabel).map((n) => (
        <g key={`l-${n.name}`} className="route-sketch__port" transform={`translate(${n.px.toFixed(1)} ${n.py.toFixed(1)})`}>
          <text x="8" y="-7">{n.name}</text>
        </g>
      ))}
    </svg>
  );
}
