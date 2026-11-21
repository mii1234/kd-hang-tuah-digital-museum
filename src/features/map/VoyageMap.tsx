import { memo, useMemo, useState, type Ref } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import type { HistoricalEvent, Location, Verification } from '../../data/types';
import type { VoyageRoute } from './route';
import { ShipLayer } from './ShipLayer';
import type { PlaybackStore } from './playback';
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './mapConfig';
import { useLang } from '../../i18n/LanguageContext';
import { VerificationBadge } from '../../components/VerificationBadge';
import { formatHistoricalDate } from '../../utils/dates';
import { formatPosition } from '../../utils/geo';
import './VoyageMap.css';

const STATUS_CLASS: Record<Verification, string> = {
  Verified: 'verified',
  'Needs Verification': 'needs',
  Illustrative: 'illustrative',
  Disputed: 'disputed',
};

function pinIcon(status: Verification, opts: { inVoyage: boolean; selected: boolean; current: boolean }) {
  const cls = ['loc-pin', `loc-pin--${STATUS_CLASS[status]}`];
  if (!opts.inVoyage) cls.push('is-other');
  if (opts.selected) cls.push('is-selected');
  if (opts.current) cls.push('is-current');
  return L.divIcon({
    className: 'loc-pin-wrap',
    html: `<span class="${cls.join(' ')}"><span class="loc-pin__dot"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -10],
  });
}

interface Props {
  mapRef: Ref<L.Map>;
  route: VoyageRoute | null;
  store: PlaybackStore;
  locations: Location[];
  eventsByLocation: Map<string, HistoricalEvent[]>;
  selectedLocationId: string | null;
  currentLocationId: string | null;
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onSelectLocation: (id: string) => void;
  reducedMotion: boolean;
}

// Leaflet draws SVG paths with inline colours, so route styles are set here rather than in CSS.
const NAVY = '#102A43';
const SCHEMATIC_STYLE: L.PathOptions = { color: NAVY, weight: 1.8, opacity: 0.85, dashArray: '2 7', lineCap: 'round', interactive: false };
const SUPPORTED_STYLE: L.PathOptions = { color: NAVY, weight: 2, opacity: 0.9, lineCap: 'round', interactive: false };
const WAYPOINT_STYLE: L.PathOptions = { color: NAVY, weight: 1, opacity: 0.55, fillColor: '#FAF9F6', fillOpacity: 1, interactive: false };

const RouteLayer = memo(function RouteLayer({ route }: { route: VoyageRoute }) {
  return (
    <>
      {route.segments.map((s) => (
        <Polyline
          key={`${route.voyage.Voyage_ID}-${s.from}`}
          positions={[route.latlngs[s.from], route.latlngs[s.to]]}
          pathOptions={s.supported ? SUPPORTED_STYLE : SCHEMATIC_STYLE}
        />
      ))}
      {route.points.map((p, i) => (p.Position_Type === 'Illustrative Waypoint' ? (
        <CircleMarker key={p.Route_Point_ID} center={route.latlngs[i]} radius={2.5} pathOptions={WAYPOINT_STYLE} />
      ) : null))}
    </>
  );
});

export function VoyageMap(props: Props) {
  const { t, lang, locName, eventTitle } = useLang();
  const [tilesFailed, setTilesFailed] = useState(false);
  const { route, locations, selectedLocationId, currentLocationId } = props;
  const voyageLocIds = useMemo(() => new Set(route?.points.map((p) => p.Location_ID).filter(Boolean) as string[]), [route]);

  const tileHandlers = useMemo(() => {
    let errors = 0;
    let loads = 0;
    return {
      tileerror: () => { errors++; if (errors >= 4 && loads === 0) setTilesFailed(true); },
      tileload: () => { loads++; setTilesFailed(false); },
    };
  }, []);

  return (
    <div className={`voyage-map${tilesFailed ? ' is-offline' : ''}`}>
      <MapContainer
        ref={props.mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={2}
        maxZoom={TILE_MAX_ZOOM}
        zoomControl={false}
        worldCopyJump
        className="voyage-map__canvas"
        attributionControl
        zoomSnap={0.25}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={TILE_MAX_ZOOM} eventHandlers={tileHandlers} />
        <ZoomControl position="topright" />
        {route && <RouteLayer route={route} />}
        {locations.map((loc) => {
          const inVoyage = voyageLocIds.has(loc.Location_ID);
          const evs = props.eventsByLocation.get(loc.Location_ID) ?? [];
          return (
            <Marker
              key={loc.Location_ID}
              position={[loc.Latitude, loc.Longitude]}
              icon={pinIcon(loc.Verification, { inVoyage, selected: loc.Location_ID === selectedLocationId, current: loc.Location_ID === currentLocationId })}
              zIndexOffset={inVoyage ? 500 : 0}
              title={locName(loc)}
              alt={locName(loc)}
              eventHandlers={{ click: () => props.onSelectLocation(loc.Location_ID) }}
            >
              <Popup className="loc-popup" autoPanPadding={[24, 24]}>
                <div className="loc-popup__body">
                  <p className="loc-popup__name">{locName(loc)}</p>
                  <p className="mono loc-popup__coords">{formatPosition(loc.Latitude, loc.Longitude)}</p>
                  {loc.Coordinate_Basis && <p className="loc-popup__basis">{(lang === 'ms' && loc.Coordinate_Basis_MS) || loc.Coordinate_Basis}</p>}
                  <VerificationBadge status={loc.Verification} demo={loc.Is_Demo_Data} />
                  {loc.Description && <p className="loc-popup__desc">{loc.Description}</p>}
                  {evs.length > 0 && (
                    <div className="loc-popup__events">
                      <p className="loc-popup__label">{t('location_events')}</p>
                      <ul>
                        {evs.map((e) => (
                          <li key={e.Event_ID}>
                            <button type="button" className={e.Event_ID === props.selectedEventId ? 'is-selected' : ''} onClick={() => props.onSelectEvent(e.Event_ID)}>
                              <span className="mono">{formatHistoricalDate(e.Date, e.Date_Precision, lang)}</span>
                              <span>{eventTitle(e)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        {route && route.points.length > 0 && (
          <ShipLayer route={route} store={props.store} label="KD Hang Tuah" reducedMotion={props.reducedMotion} />
        )}
      </MapContainer>
      {tilesFailed && <p className="voyage-map__offline" role="status">{t('map_offline')}</p>}
      <p className="voyage-map__stamp" aria-hidden="true">{t('legend_dashed')}</p>
    </div>
  );
}
