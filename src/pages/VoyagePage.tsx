import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { HistoricalEvent } from '../data/types';
import { buildRoute, findEventOnRoutes, fractionAtPoint, lastStopIndex, positionAt, type VoyageRoute } from '../features/map/route';
import { usePlayback, type PlaybackStore } from '../features/map/playback';
import { VoyageMap } from '../features/map/VoyageMap';
import { PlaybackControls } from '../features/map/PlaybackControls';
import { CurrentPositionCard, VoyagePanel, describePosition } from '../features/map/VoyagePanel';
import { LifeStrip } from '../features/timeline/LifeStrip';
import { VerificationBadge } from '../components/VerificationBadge';
import { formatRange } from '../utils/dates';
import './VoyagePage.css';

/** Re-renders only when the ship reaches a different named stop, not on every frame. */
function useCurrentStop(store: PlaybackStore, route: VoyageRoute | null) {
  const get = useCallback(() => {
    if (!route || route.points.length === 0) return '';
    const idx = lastStopIndex(route, positionAt(route, store.get().progress));
    if (idx === null) return '';
    const p = route.points[idx];
    return `${p.Location_ID ?? ''}|${p.Related_Event_ID ?? ''}`;
  }, [store, route]);
  const key = useSyncExternalStore(store.subscribe, get, get);
  const [locationId, eventId] = key.split('|');
  return { locationId: locationId || null, eventId: eventId || null };
}

export function VoyagePage() {
  const data = useMuseum();
  const { t, lang, voyageTitle, locName } = useLang();
  const c = useContent();
  const reducedMotion = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const mapRef = useRef<L.Map>(null);
  const [speed, setSpeed] = useState(1);

  const routes = useMemo(() => data.voyages.map((v) => buildRoute(data, v)), [data]);
  const voyageParam = params.get('voyage');
  const eventParam = params.get('event');
  const locationParam = params.get('location');

  // If only an event is given, open the voyage that contains it.
  const eventTarget = useMemo(() => {
    const ev = eventParam ? data.eventById.get(eventParam) : undefined;
    return ev ? findEventOnRoutes(routes, ev) : null;
  }, [eventParam, data.eventById, routes]);
  const route = (voyageParam ? routes.find((r) => r.voyage.Voyage_ID === voyageParam) : eventTarget?.route) ?? routes[0] ?? null;

  const stopFractions = useMemo(() => (route ? route.stops.map((i) => fractionAtPoint(route, i)).filter((f) => f > 0 && f < 1) : []), [route]);
  const pb = usePlayback({ totalNm: route?.totalNm ?? 0, stopFractions, speed, reducedMotion });
  const current = useCurrentStop(pb.store, route);

  const eventsByLocation = useMemo(() => {
    const m = new Map<string, HistoricalEvent[]>();
    data.events.forEach((e) => {
      if (!e.Location_ID) return;
      const list = m.get(e.Location_ID) ?? [];
      list.push(e);
      m.set(e.Location_ID, list);
    });
    return m;
  }, [data.events]);

  const fly = useCallback((latlng: L.LatLngExpression, zoom?: number) => {
    const map = mapRef.current;
    if (!map) return;
    const z = Math.max(map.getZoom(), zoom ?? 6);
    if (reducedMotion) map.setView(latlng, z, { animate: false });
    else map.flyTo(latlng, z, { duration: 1.1 });
  }, [reducedMotion]);

  const fitRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !route || route.latlngs.length === 0) return;
    map.invalidateSize();
    const bounds = L.latLngBounds(route.latlngs);
    if (reducedMotion) map.fitBounds(bounds, { padding: [48, 48], animate: false });
    else map.flyToBounds(bounds, { padding: [48, 48], duration: 1 });
  }, [route, reducedMotion]);

  // 1. New voyage: stop playback and frame the whole route.
  const voyageId = route?.voyage.Voyage_ID;
  useEffect(() => {
    pb.reset();
    const id = window.setTimeout(() => {
      if (!eventParam && !locationParam) fitRoute();
    }, 60);
    return () => window.clearTimeout(id);
  }, [voyageId]);

  // 2. Event chosen (from the URL, the strip, a popup or the timeline page).
  const handled = useRef('');
  useEffect(() => {
    if (!eventParam || !route) return;
    const key = `${route.voyage.Voyage_ID}:${eventParam}`;
    if (handled.current === key) return;
    handled.current = key;
    const ev = data.eventById.get(eventParam);
    if (!ev) return;
    const idx = route.points.findIndex((p) => p.Related_Event_ID === ev.Event_ID || (ev.Location_ID && p.Location_ID === ev.Location_ID && (route.voyage.Related_Event_IDs ?? []).includes(ev.Event_ID)));
    window.setTimeout(() => {
      if (idx >= 0) {
        pb.seek(fractionAtPoint(route, idx));
        fly(route.latlngs[idx], 6);
      } else if (ev.Location_ID) {
        const loc = data.locationById.get(ev.Location_ID);
        if (loc) fly([loc.Latitude, loc.Longitude], 7);
      }
    }, 80);
  }, [eventParam, route, data, fly, pb]);

  // 3. Place chosen.
  const selectedLocation = locationParam ? data.locationById.get(locationParam) ?? null : null;
  useEffect(() => {
    if (!selectedLocation) return;
    const id = window.setTimeout(() => fly([selectedLocation.Latitude, selectedLocation.Longitude], 7), 80);
    return () => window.clearTimeout(id);
  }, [selectedLocation, fly]);

  const setVoyage = (id: string) => {
    handled.current = '';
    setParams({ voyage: id }, { replace: true });
  };

  const selectEvent = (id: string) => {
    const ev = data.eventById.get(id);
    if (!ev) return;
    handled.current = '';
    const target = findEventOnRoutes(routes, ev);
    const next: Record<string, string> = { event: id };
    if (target) next.voyage = target.route.voyage.Voyage_ID;
    else if (route) next.voyage = route.voyage.Voyage_ID;
    if (!target && ev.Location_ID) next.location = ev.Location_ID;
    setParams(next, { replace: true });
  };

  const selectLocation = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('location', id);
    next.delete('event');
    setParams(next, { replace: true });
  };

  const clearLocation = () => {
    const next = new URLSearchParams(params);
    next.delete('location');
    setParams(next, { replace: true });
  };

  const jumpToPoint = (index: number) => {
    if (!route) return;
    pb.seek(fractionAtPoint(route, index));
    fly(route.latlngs[index], mapRef.current?.getZoom() ?? 5);
  };

  const describe = (f: number) => {
    if (!route) return '';
    const d = describePosition(data, route, f, lang, t, locName);
    return `${d.dateLabel}, ${d.placeLabel}`;
  };

  useEffect(() => {
    document.title = `${t('nav_voyage')} — KD Hang Tuah`;
  }, [t]);

  const voyageEvents = useMemo(() => new Set(route?.voyage.Related_Event_IDs ?? []), [route]);
  const dimmed = useMemo(() => new Set(data.events.filter((e) => !voyageEvents.has(e.Event_ID)).map((e) => e.Event_ID)), [data.events, voyageEvents]);
  const highlightedEvent = eventParam ?? current.eventId;
  const focusEvent = useMemo(() => {
    if (!eventParam || !route) return null;
    const ev = data.eventById.get(eventParam);
    if (!ev) return null;
    const onRoute = route.points.some((p) => p.Related_Event_ID === ev.Event_ID) || (route.voyage.Related_Event_IDs ?? []).includes(ev.Event_ID);
    return onRoute ? null : ev;
  }, [eventParam, route, data.eventById]);

  if (!routes.length) {
    return (
      <div className="wrap section">
        <h1>{t('nav_voyage')}</h1>
        <p className="empty-note">voyages.json contains no voyages yet. Add one to show it on the chart.</p>
      </div>
    );
  }

  return (
    <>
      <header className="voyage-head wrap">
        <div>
          <span className="page-head__number">03</span>
          <h1>{t('nav_voyage')}</h1>
          <p className="lede muted">{c('voyage_intro')}</p>
        </div>
        <div className="voyage-tabs" role="tablist" aria-label={t('voyage')}>
          {routes.map((r) => {
            const active = r.voyage.Voyage_ID === route?.voyage.Voyage_ID;
            return (
              <button key={r.voyage.Voyage_ID} type="button" role="tab" aria-selected={active} className={`voyage-tab${active ? ' is-active' : ''}`} onClick={() => setVoyage(r.voyage.Voyage_ID)}>
                <span className="voyage-tab__title">{voyageTitle(r.voyage)}</span>
                <span className="voyage-tab__date mono">{formatRange(r.voyage.Start_Date, r.voyage.End_Date, null, lang)}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="voyage-layout">
        <div className="voyage-layout__map">
          {route && (
            <PlaybackControls
              route={route}
              store={pb.store}
              speed={speed}
              onSpeed={setSpeed}
              onPlay={pb.play}
              onPause={pb.pause}
              onResume={pb.resume}
              onReplay={pb.replay}
              onReset={() => { pb.reset(); fitRoute(); }}
              onSeek={(f) => pb.seek(f)}
              onJumpToPoint={jumpToPoint}
              onFit={fitRoute}
              describe={describe}
            />
          )}
          <div className="voyage-layout__canvas">
            <VoyageMap
              mapRef={mapRef}
              route={route}
              store={pb.store}
              locations={data.locations}
              eventsByLocation={eventsByLocation}
              selectedLocationId={locationParam}
              currentLocationId={current.locationId}
              selectedEventId={highlightedEvent}
              onSelectEvent={selectEvent}
              onSelectLocation={selectLocation}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>

        <aside className="voyage-layout__panel on-dark" aria-label={route ? voyageTitle(route.voyage) : t('voyage')}>
          {route && (
            <div className="voyage-intro">
              <h2>{voyageTitle(route.voyage)}</h2>
              <p className="mono voyage-intro__dates">{formatRange(route.voyage.Start_Date, route.voyage.End_Date, null, lang)}</p>
              <VerificationBadge status={route.voyage.Verification} demo={route.voyage.Is_Demo_Data} />
              <p className="voyage-intro__notice">{t('schematic_notice')}</p>
            </div>
          )}
          {route && route.points.length > 0 && <CurrentPositionCard data={data} route={route} store={pb.store} preferredEventId={eventParam} />}
          <VoyagePanel
            data={data}
            route={route}
            store={pb.store}
            onJumpToPoint={jumpToPoint}
            selectedLocation={selectedLocation}
            locationEvents={selectedLocation ? eventsByLocation.get(selectedLocation.Location_ID) ?? [] : []}
            onSelectEvent={selectEvent}
            onClearLocation={clearLocation}
            focusEvent={focusEvent}
          />
          <details className="map-legend">
            <summary>{t('legend')}</summary>
            <ul>
              <li><span className="lg lg--pin lg--needs" aria-hidden="true" />{t('legend_named')} — {t('v_Needs_Verification')}</li>
              <li><span className="lg lg--pin lg--illustrative" aria-hidden="true" />{t('legend_named')} — {t('v_Illustrative')}</li>
              <li><span className="lg lg--pin lg--verified" aria-hidden="true" />{t('legend_named')} — {t('v_Verified')}</li>
              <li><span className="lg lg--wp" aria-hidden="true" />{t('legend_waypoint')}</li>
              <li><span className="lg lg--line" aria-hidden="true" />{t('legend_solid')}</li>
              <li><span className="lg lg--dash" aria-hidden="true" />{t('legend_dashed')}</li>
            </ul>
          </details>
          <div className="voyage-strip">
            <h3 className="milestones__title">{t('milestones')}</h3>
            <LifeStrip events={data.events} selectedId={highlightedEvent} dimmedIds={dimmed} onSelect={selectEvent} tone="dark" label={t('milestones')} />
          </div>
        </aside>
      </div>
    </>
  );
}
