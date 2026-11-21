import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Link2, MapPin, Printer, X } from 'lucide-react';
import type { HistoricalEvent } from '../../data/types';
import { useMuseum } from '../../data/DataContext';
import { useLang } from '../../i18n/LanguageContext';
import { formatHistoricalDate, formatRange, precisionLabel } from '../../utils/dates';
import { formatPosition } from '../../utils/geo';
import { VerificationBadge } from '../../components/VerificationBadge';
import { ImageFrame } from '../../components/ImageFrame';
import { SourceRefs } from '../../components/SourceRefs';
import './EventDetail.css';

interface Props {
  event: HistoricalEvent;
  onSelect: (id: string) => void;
  prevId?: string | null;
  nextId?: string | null;
  onClose?: () => void;
  onOpenImage?: () => void;
  headingLevel?: 'h2' | 'h3';
}

export function EventDetail({ event, onSelect, prevId, nextId, onClose, onOpenImage, headingLevel = 'h2' }: Props) {
  const { locationById, eventById, sourceById } = useMuseum();
  const { t, lang, eventTitle, eventDescription, cat, locName } = useLang();
  const [copied, setCopied] = useState(false);
  const loc = event.Location_ID ? locationById.get(event.Location_ID) : undefined;
  const H = headingLevel;
  const precision = precisionLabel(event.Date_Precision, lang);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/story?event=${event.Event_ID}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(t('copy_link'), url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="event-detail print-record" aria-labelledby={`ed-title-${event.Event_ID}`}>
      <header className="event-detail__head">
        <div className="event-detail__date">
          <time className="event-detail__date-main" dateTime={event.Date}>{formatRange(event.Date, event.End_Date, event.Date_Precision, lang)}</time>
          {precision && <span className="event-detail__precision">({precision})</span>}
        </div>
        {onClose && (
          <button type="button" className="icon-btn event-detail__close no-print" onClick={onClose} aria-label={t('close')}>
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </header>

      <H id={`ed-title-${event.Event_ID}`} className="event-detail__title">{eventTitle(event)}</H>
      <div className="event-detail__badges">
        <span className="event-detail__cat">{cat(event.Event_Category)}</span>
        <VerificationBadge status={event.Verification} demo={event.Is_Demo_Data} showHelp />
      </div>

      {event.Image_URL ? (
        <ImageFrame
          src={event.Image_URL}
          alt={event.Image_Caption || eventTitle(event)}
          caption={event.Image_Caption}
          credit={event.Image_Credit}
          ratio="16 / 10"
          showCaption
          onOpen={onOpenImage}
          className="event-detail__image"
        />
      ) : null}

      <p className="event-detail__desc">{eventDescription(event)}</p>

      <dl className="event-detail__facts">
        <div>
          <dt>{t('place')}</dt>
          <dd>
            {loc ? (
              <>
                {locName(loc)}
                <span className="mono event-detail__coords">{formatPosition(loc.Latitude, loc.Longitude)}</span>
                {loc.Coordinate_Basis && <span className="event-detail__basis">{(lang === 'ms' && loc.Coordinate_Basis_MS) || loc.Coordinate_Basis}</span>}
              </>
            ) : (
              <span className="muted">{t('no_place')}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('event_record', { id: '' }).trim()}</dt>
          <dd className="mono">{event.Event_ID}</dd>
        </div>
      </dl>

      {event.Alternative_Dates && event.Alternative_Dates.length > 0 && (
        <section className="event-detail__block event-detail__alts">
          <h4>{t('alternative_dates')}</h4>
          <ul>
            <li>
              <strong>{formatHistoricalDate(event.Date, event.Date_Precision, lang)}</strong>
              <span className="muted"> — {(event.Source_IDs ?? []).join(', ') || '—'}</span>
            </li>
            {event.Alternative_Dates.map((a, i) => (
              <li key={i}>
                <strong>{formatHistoricalDate(a.Date, a.Date_Precision, lang)}</strong>
                <span className="muted"> — {a.Source_ID ? (sourceById.get(a.Source_ID)?.Source_Title ?? a.Source_ID) : '—'}</span>
                {a.Note && <span className="event-detail__alt-note">{a.Note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {event.Historical_Notes && (
        <section className="event-detail__block">
          <h4>{t('notes')}</h4>
          <p>{event.Historical_Notes}</p>
        </section>
      )}

      <section className="event-detail__block">
        <h4>{t('sources')}</h4>
        <SourceRefs ids={event.Source_IDs} extraUrl={event.Source_URL} />
      </section>

      {event.Related_Event_IDs && event.Related_Event_IDs.length > 0 && (
        <section className="event-detail__block no-print">
          <h4>{t('related')}</h4>
          <ul className="event-detail__related">
            {event.Related_Event_IDs.map((id) => {
              const rel = eventById.get(id);
              if (!rel) return null;
              return (
                <li key={id}>
                  <button type="button" onClick={() => onSelect(id)}>
                    <span className="mono">{formatHistoricalDate(rel.Date, rel.Date_Precision, lang)}</span>
                    <span>{eventTitle(rel)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="event-detail__actions no-print">
        {loc && (
          <Link to={`/voyage?event=${event.Event_ID}`} className="btn btn--small btn--ink">
            <MapPin size={15} aria-hidden="true" /> {t('show_on_map')}
          </Link>
        )}
        <button type="button" className="btn btn--small btn--ghost" onClick={copyLink}>
          <Link2 size={15} aria-hidden="true" /> {copied ? t('link_copied') : t('copy_link')}
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> {t('print')}
        </button>
      </div>

      <nav className="event-detail__pager no-print" aria-label={`${t('previous_event')} / ${t('next_event')}`}>
        <button type="button" className="btn btn--small btn--ghost" disabled={!prevId} onClick={() => prevId && onSelect(prevId)}>
          <ChevronLeft size={16} aria-hidden="true" /> {t('previous_event')}
        </button>
        <button type="button" className="btn btn--small btn--ghost" disabled={!nextId} onClick={() => nextId && onSelect(nextId)}>
          {t('next_event')} <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </article>
  );
}
