import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { VoyageRoute } from './route';
import { positionAt, travelledPath } from './route';
import type { PlaybackStore } from './playback';
import { bearing } from '../../utils/geo';

const SHIP_SVG = `
<svg viewBox="0 0 24 40" width="18" height="30" aria-hidden="true" focusable="false">
  <path d="M12 1 C16 8 17 14 17 22 L17 34 C17 37 15 39 12 39 C9 39 7 37 7 34 L7 22 C7 14 8 8 12 1 Z" fill="#102A43" stroke="#B69A62" stroke-width="1.6"/>
  <rect x="9.5" y="17" width="5" height="8" fill="#B69A62"/>
</svg>`;

interface Props {
  route: VoyageRoute;
  store: PlaybackStore;
  label: string;
  reducedMotion: boolean;
}

/**
 * Ship marker and travelled trail, updated imperatively from the playback store so the
 * rest of the map does not re-render every animation frame.
 */
export function ShipLayer({ route, store, label, reducedMotion }: Props) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (route.points.length === 0) return;
    const icon = L.divIcon({
      className: 'ship-marker',
      html: `<span class="ship-marker__ring"></span><span class="ship-marker__hull">${SHIP_SVG}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    const marker = L.marker(route.latlngs[0], { icon, keyboard: false, interactive: false, zIndexOffset: 1000, title: label });
    const trail = L.polyline([route.latlngs[0]], { className: 'route-trail', color: '#B69A62', weight: 3.2, opacity: 0.95, dashArray: '2 7', lineCap: 'round', lineJoin: 'round', interactive: false });
    trail.addTo(map);
    marker.addTo(map);
    markerRef.current = marker;
    trailRef.current = trail;

    const update = () => {
      const s = store.get();
      const pos = positionAt(route, s.progress);
      marker.setLatLng(pos.latlng);
      trail.setLatLngs(travelledPath(route, pos));
      const a = route.latlngs[pos.segmentIndex];
      const b = route.latlngs[Math.min(pos.segmentIndex + 1, route.latlngs.length - 1)];
      const deg = a && b && (a[0] !== b[0] || a[1] !== b[1]) ? bearing(a, b) : 0;
      const el = marker.getElement();
      if (el) {
        el.style.setProperty('--heading', `${deg}deg`);
        el.classList.toggle('is-playing', s.status === 'playing');
      }
      // Keep the ship on screen while playing.
      if (s.status === 'playing') {
        const inner = map.getBounds().pad(-0.18);
        if (!inner.contains(pos.latlng)) map.panTo(pos.latlng, { animate: !reducedMotion, duration: 0.6 });
      }
    };
    update();
    const unsub = store.subscribe(update);
    return () => {
      unsub();
      marker.remove();
      trail.remove();
    };
  }, [map, route, store, label, reducedMotion]);

  return null;
}
