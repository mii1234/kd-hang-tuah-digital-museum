import { useMemo } from 'react';
import type { HistoricalEvent } from '../../data/types';
import { dateToYearFraction, parseHistoricalDate, formatHistoricalDate } from '../../utils/dates';
import { useLang } from '../../i18n/LanguageContext';
import './LifeStrip.css';

interface Props {
  events: HistoricalEvent[];
  selectedId?: string | null;
  dimmedIds?: Set<string>;
  onSelect: (id: string) => void;
  tone?: 'paper' | 'dark';
  label: string;
}

/** A compact horizontal overview of the whole life of the ship. Each mark is one event. */
export function LifeStrip({ events, selectedId, dimmedIds, onSelect, tone = 'paper', label }: Props) {
  const { lang, eventTitle } = useLang();
  const placed = useMemo(() => events
    .map((e) => ({ e, y: dateToYearFraction(parseHistoricalDate(e.Date, e.Date_Precision)) }))
    .filter((x): x is { e: HistoricalEvent; y: number } => x.y !== null), [events]);
  if (placed.length === 0) return null;
  const min = Math.floor(Math.min(...placed.map((p) => p.y)) / 10) * 10;
  const max = Math.ceil((Math.max(...placed.map((p) => p.y)) + 0.01) / 10) * 10;
  const span = Math.max(max - min, 1);
  const decades: number[] = [];
  for (let d = min; d <= max; d += 10) decades.push(d);

  // spread marks that land on the same spot so each stays clickable
  const lanes: number[] = [];
  const lastX: number[] = [];
  placed.forEach((p, i) => {
    const x = ((p.y - min) / span) * 100;
    let lane = 0;
    while (lastX[lane] !== undefined && x - lastX[lane] < 1.6) lane++;
    lastX[lane] = x;
    lanes[i] = lane;
  });

  return (
    <div className={`lifestrip lifestrip--${tone}`} role="group" aria-label={label}>
      <div className="lifestrip__track">
        {decades.map((d) => (
          <span key={d} className="lifestrip__tick" style={{ left: `${((d - min) / span) * 100}%` }}>
            <span className="mono">{d}</span>
          </span>
        ))}
        {placed.map(({ e, y }, i) => {
          const selected = e.Event_ID === selectedId;
          return (
            <button
              key={e.Event_ID}
              type="button"
              className={`lifestrip__mark${selected ? ' is-selected' : ''}${dimmedIds?.has(e.Event_ID) ? ' is-dimmed' : ''}${e.Verification === 'Illustrative' ? ' is-illustrative' : ''}`}
              style={{ left: `${((y - min) / span) * 100}%`, bottom: `${10 + lanes[i] * 9}px` }}
              onClick={() => onSelect(e.Event_ID)}
              aria-label={`${formatHistoricalDate(e.Date, e.Date_Precision, lang)}: ${eventTitle(e)}`}
              aria-pressed={selected}
              title={`${formatHistoricalDate(e.Date, e.Date_Precision, lang)} — ${eventTitle(e)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
