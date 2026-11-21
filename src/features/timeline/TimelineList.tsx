import { useEffect, useRef } from 'react';
import type { HistoricalEvent } from '../../data/types';
import { useLang } from '../../i18n/LanguageContext';
import { useMuseum } from '../../data/DataContext';
import { formatRange, parseHistoricalDate } from '../../utils/dates';
import { VerificationBadge } from '../../components/VerificationBadge';
import { ImageFrame } from '../../components/ImageFrame';
import './TimelineList.css';

interface Props {
  events: HistoricalEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Vertical timeline grouped by year. Each entry is a button that opens the record. */
export function TimelineList({ events, selectedId, onSelect }: Props) {
  const { lang, eventTitle, cat, locName } = useLang();
  const { locationById } = useMuseum();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-event="${selectedId}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 80 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  let lastYear: number | null | undefined;
  return (
    <ol className="tl" ref={listRef}>
      {events.map((e) => {
        const year = parseHistoricalDate(e.Date)?.year ?? null;
        const showYear = year !== lastYear;
        lastYear = year;
        const loc = e.Location_ID ? locationById.get(e.Location_ID) : undefined;
        const selected = e.Event_ID === selectedId;
        return (
          <li key={e.Event_ID} className={`tl__item${showYear ? ' tl__item--year' : ''}`} data-event={e.Event_ID}>
            <div className="tl__year" aria-hidden={!showYear}>{showYear ? (year ?? '—') : ''}</div>
            <div className="tl__node" aria-hidden="true"><span className={e.Verification === 'Illustrative' ? 'is-hollow' : ''} /></div>
            <button type="button" className={`tl__card${selected ? ' is-selected' : ''}`} onClick={() => onSelect(e.Event_ID)} aria-current={selected ? 'true' : undefined}>
              <div className="tl__text">
                <time className="tl__date" dateTime={e.Date}>{formatRange(e.Date, e.End_Date, e.Date_Precision, lang)}</time>
                <span className="tl__title">{eventTitle(e)}</span>
                <span className="tl__meta">
                  {cat(e.Event_Category)}
                  {loc && <> — {locName(loc)}</>}
                </span>
                <VerificationBadge status={e.Verification} demo={e.Is_Demo_Data} />
              </div>
              {e.Image_URL && (
                <div className="tl__thumb">
                  <ImageFrame src={e.Image_URL} alt="" caption=" " ratio="1 / 1" />
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
