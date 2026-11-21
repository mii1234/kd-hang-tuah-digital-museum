import { Link } from 'react-router-dom';
import { Anchor, Waves } from 'lucide-react';
import type { HistoricalEvent, Location, MuseumData } from '../../data/types';
import type { VoyageRoute } from './route';
import { datedNeighbours, fractionAtPoint, lastStopIndex, positionAt } from './route';
import { usePlaybackState, type PlaybackStore } from './playback';
import { useLang } from '../../i18n/LanguageContext';
import { formatHistoricalDate } from '../../utils/dates';
import { formatPosition } from '../../utils/geo';
import { VerificationBadge } from '../../components/VerificationBadge';

/** Works out what the panel should say for a given progress value. Shared with the scrubber label. */
export function describePosition(data: MuseumData, route: VoyageRoute, progress: number, lang: 'en' | 'ms', t: ReturnType<typeof useLang>['t'], locName: (l: Location) => string) {
  const pos = positionAt(route, progress);
  const point = pos.atPoint !== null ? route.points[pos.atPoint] : null;
  const loc = point?.Location_ID ? data.locationById.get(point.Location_ID) ?? null : null;
  const atNamed = Boolean(loc && point && point.Position_Type !== 'Illustrative Waypoint');
  let dateLabel: string;
  if (point?.Date) dateLabel = formatHistoricalDate(point.Date, point.Date_Precision, lang);
  else {
    const { before, after } = datedNeighbours(route, pos);
    if (before && after) dateLabel = t('between', { a: formatHistoricalDate(before.Date, before.Date_Precision, lang), b: formatHistoricalDate(after.Date, after.Date_Precision, lang) });
    else if (before) dateLabel = formatHistoricalDate(before.Date, before.Date_Precision, lang);
    else if (after) dateLabel = formatHistoricalDate(after.Date, after.Date_Precision, lang);
    else dateLabel = formatHistoricalDate(null, null, lang);
  }
  const placeLabel = atNamed && loc ? locName(loc) : t('at_sea');
  const stop = lastStopIndex(route, pos);
  const stopPoint = stop !== null ? route.points[stop] : null;
  const event = stopPoint?.Related_Event_ID ? data.eventById.get(stopPoint.Related_Event_ID) ?? null : null;
  return { pos, point, loc: atNamed ? loc : null, dateLabel, placeLabel, event, stop };
}

interface Props {
  data: MuseumData;
  route: VoyageRoute | null;
  store: PlaybackStore;
  onJumpToPoint: (index: number) => void;
  selectedLocation: Location | null;
  locationEvents: HistoricalEvent[];
  onSelectEvent: (id: string) => void;
  onClearLocation: () => void;
  /** An event the visitor picked that is not a stop on this voyage. */
  focusEvent?: HistoricalEvent | null;
}

export function CurrentPositionCard({ data, route, store, preferredEventId }: { data: MuseumData; route: VoyageRoute; store: PlaybackStore; preferredEventId?: string | null }) {
  const { t, lang, locName, eventTitle, eventDescription, cat } = useLang();
  const s = usePlaybackState(store);
  const d = describePosition(data, route, s.progress, lang, t, locName);
  // If the visitor picked an event that happened at the stop the ship is at, show that one.
  const preferred = preferredEventId ? data.eventById.get(preferredEventId) : undefined;
  if (preferred && d.stop !== null && preferred.Location_ID && route.points[d.stop].Location_ID === preferred.Location_ID && d.pos.atPoint === d.stop) {
    d.event = preferred;
  }
  const legs = Math.max(route.stops.length - 1, 1);
  const legIndex = d.stop !== null ? Math.min(route.stops.indexOf(d.stop) + 1, legs) : 1;
  return (
    <section className="now-card" aria-live="polite" aria-atomic="false">
      <div className="now-card__instrument">
        <div>
          <span className="now-card__label">{t('simulated_date')}</span>
          <span className="now-card__value">{d.dateLabel}</span>
        </div>
        <div>
          <span className="now-card__label">{t('position')}</span>
          <span className="now-card__value mono">{formatPosition(d.pos.latlng[0], d.pos.latlng[1])}</span>
        </div>
        <div>
          <span className="now-card__label">{t('distance')}</span>
          <span className="now-card__value mono">{Math.round(d.pos.nm).toLocaleString()} {t('nm')}</span>
        </div>
        <div>
          <span className="now-card__label">{t('leg', { a: legIndex, b: legs })}</span>
          <span className="now-card__value now-card__place">
            {d.loc ? <Anchor size={14} aria-hidden="true" /> : <Waves size={14} aria-hidden="true" />} {d.placeLabel}
          </span>
        </div>
      </div>
      {d.event ? (
        <div className="now-card__event" key={d.event.Event_ID}>
          <p className="now-card__event-meta mono">{formatHistoricalDate(d.event.Date, d.event.Date_Precision, lang)} — {cat(d.event.Event_Category)}</p>
          <h3 className="now-card__event-title">{eventTitle(d.event)}</h3>
          <VerificationBadge status={d.event.Verification} demo={d.event.Is_Demo_Data} />
          <p className="now-card__event-desc">{eventDescription(d.event)}</p>
          <Link to={`/story?event=${d.event.Event_ID}`} className="text-link">{t('open_timeline')}</Link>
        </div>
      ) : (
        <p className="now-card__hint muted">{route.voyage.Description}</p>
      )}
    </section>
  );
}

export function VoyagePanel({ data, route, store, onJumpToPoint, selectedLocation, locationEvents, onSelectEvent, onClearLocation, focusEvent }: Props) {
  const { t, lang, locName, eventTitle, eventDescription } = useLang();
  const s = usePlaybackState(store);

  return (
    <div className="voyage-panel">
      {focusEvent && (
        <section className="loc-card" aria-label={eventTitle(focusEvent)}>
          <p className="mono now-card__event-meta">{formatHistoricalDate(focusEvent.Date, focusEvent.Date_Precision, lang)}</p>
          <h3>{eventTitle(focusEvent)}</h3>
          <VerificationBadge status={focusEvent.Verification} demo={focusEvent.Is_Demo_Data} />
          <p className="now-card__event-desc">{eventDescription(focusEvent)}</p>
          {!focusEvent.Location_ID && <p className="muted now-card__event-desc">{t('no_place')}</p>}
          <Link to={`/story?event=${focusEvent.Event_ID}`} className="text-link">{t('open_timeline')}</Link>
        </section>
      )}
      {selectedLocation && (
        <section className="loc-card" aria-label={locName(selectedLocation)}>
          <div className="loc-card__head">
            <h3>{locName(selectedLocation)}</h3>
            <button type="button" className="text-link loc-card__close" onClick={onClearLocation}>{t('close')}</button>
          </div>
          <p className="mono muted">{formatPosition(selectedLocation.Latitude, selectedLocation.Longitude)}</p>
          {selectedLocation.Coordinate_Basis && <p className="loc-card__basis muted">{(lang === 'ms' && selectedLocation.Coordinate_Basis_MS) || selectedLocation.Coordinate_Basis}</p>}
          <VerificationBadge status={selectedLocation.Verification} demo={selectedLocation.Is_Demo_Data} />
          {/* The description carries position caveats, e.g. "Illustrative sea area — not a recorded position." */}
          {selectedLocation.Description && <p className="loc-card__desc">{selectedLocation.Description}</p>}
          {locationEvents.length > 0 ? (
            <ul className="loc-card__events">
              {locationEvents.map((e) => (
                <li key={e.Event_ID}>
                  <button type="button" onClick={() => onSelectEvent(e.Event_ID)}>
                    <span className="mono">{formatHistoricalDate(e.Date, e.Date_Precision, lang)}</span>
                    <span>{eventTitle(e)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {route && route.stops.length > 0 && (
        <section className="milestones">
          <h3 className="milestones__title">{t('milestone_list')}</h3>
          <ol>
            {route.stops.map((idx, n) => {
              const p = route.points[idx];
              const loc = p.Location_ID ? data.locationById.get(p.Location_ID) : undefined;
              const ev = p.Related_Event_ID ? data.eventById.get(p.Related_Event_ID) : undefined;
              const f = fractionAtPoint(route, idx);
              const reached = s.progress >= f - 0.0015;
              const nextF = n + 1 < route.stops.length ? fractionAtPoint(route, route.stops[n + 1]) : 2;
              const current = reached && s.progress < nextF - 0.0015;
              return (
                <li key={p.Route_Point_ID} className={`${reached ? 'is-reached' : ''}${current ? ' is-current' : ''}`}>
                  <button type="button" onClick={() => onJumpToPoint(idx)} aria-current={current ? 'step' : undefined}>
                    <span className="milestones__marker" aria-hidden="true" />
                    <span className="milestones__text">
                      <span className="milestones__date mono">{p.Date ? formatHistoricalDate(p.Date, p.Date_Precision, lang) : '—'}</span>
                      <span className="milestones__name">{loc ? locName(loc) : p.Route_Point_ID}</span>
                      {ev && <span className="milestones__event">{eventTitle(ev)}</span>}
                    </span>
                    <span className="milestones__status">
                      <VerificationBadge status={p.Route_Status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
