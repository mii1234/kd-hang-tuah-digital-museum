import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useEventFilters } from '../features/timeline/useEventFilters';
import { TimelineList } from '../features/timeline/TimelineList';
import { EventDetail } from '../features/timeline/EventDetail';
import { LifeStrip } from '../features/timeline/LifeStrip';
import { Lightbox } from '../components/Lightbox';
import { VERIFICATION_VALUES, type Verification } from '../data/types';
import './StoryPage.css';

export function StoryPage() {
  const data = useMuseum();
  const { t, cat, vLabel, eventTitle } = useLang();
  const c = useContent();
  const [params, setParams] = useSearchParams();
  const isWide = useMediaQuery('(min-width: 960px)');
  const f = useEventFilters(data);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const requestedId = params.get('event');
  const requested = requestedId ? data.eventById.get(requestedId) ?? null : null;
  const fallback = isWide ? f.filtered[0] ?? null : null;
  const selected = requested ?? fallback;

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('event', id); else next.delete('event');
    setParams(next, { replace: false });
  };

  // previous/next follow the filtered list when the selection is in it, otherwise the full chronology
  const nav = useMemo(() => {
    if (!selected) return { prev: null, next: null };
    const list = f.filtered.some((e) => e.Event_ID === selected.Event_ID) ? f.filtered : data.events;
    const i = list.findIndex((e) => e.Event_ID === selected.Event_ID);
    return { prev: list[i - 1]?.Event_ID ?? null, next: list[i + 1]?.Event_ID ?? null };
  }, [selected, f.filtered, data.events]);

  const filteredIds = useMemo(() => new Set(f.filtered.map((e) => e.Event_ID)), [f.filtered]);
  const dimmed = useMemo(() => new Set(data.events.filter((e) => !filteredIds.has(e.Event_ID)).map((e) => e.Event_ID)), [data.events, filteredIds]);

  useEffect(() => {
    if (selected) document.title = `${eventTitle(selected)} — KD Hang Tuah`;
    else document.title = `${t('nav_story')} — KD Hang Tuah`;
  }, [selected, eventTitle, t]);

  // mobile record sheet: Escape closes it and the page behind does not scroll
  const sheetOpen = !isWide && Boolean(selected);
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lightboxOpen) select(null); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  });

  // keyboard: [ and ] step through events when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === ']' && nav.next) select(nav.next);
      if (e.key === '[' && nav.prev) select(nav.prev);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const detail = selected ? (
    <EventDetail
      key={selected.Event_ID}
      event={selected}
      onSelect={select}
      prevId={nav.prev}
      nextId={nav.next}
      onClose={isWide ? undefined : () => select(null)}
      onOpenImage={() => setLightboxOpen(true)}
    />
  ) : null;

  return (
    <>
      <header className="page-head wrap">
        <span className="page-head__number">02</span>
        <h1>{t('nav_story')}</h1>
        <p className="lede">{c('story_intro')}</p>
      </header>

      <section className="wrap" aria-label={t('milestones')}>
        <LifeStrip events={data.events} selectedId={selected?.Event_ID} dimmedIds={f.active ? dimmed : undefined} onSelect={select} label={t('milestones')} />
      </section>

      <section className="story-filters wrap" aria-label="Filters">
        <div className="story-filters__row">
          <div className="field story-filters__search">
            <label htmlFor="tl-search">{t('filter_search')}</label>
            <div className="input-icon">
              <Search size={16} aria-hidden="true" />
              <input id="tl-search" type="search" className="input" value={f.filters.query} onChange={(e) => f.setQuery(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="tl-period">{t('period')}</label>
            <select id="tl-period" className="select" value={f.filters.decade ?? ''} onChange={(e) => f.setDecade(e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{t('all')}</option>
              {f.decades.map((d) => <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tl-status">{t('status')}</label>
            <select id="tl-status" className="select" value={f.filters.status ?? ''} onChange={(e) => f.setStatus((e.target.value || null) as Verification | null)}>
              <option value="">{t('all')}</option>
              {VERIFICATION_VALUES.map((v) => <option key={v} value={v}>{vLabel(v)}</option>)}
            </select>
          </div>
        </div>
        <div className="story-filters__cats">
          <span className="field__label" id="tl-cat-label">{t('category')}</span>
          <div className="chips" role="group" aria-labelledby="tl-cat-label">
            {f.categories.map((category) => (
              <button key={category} type="button" className="chip" aria-pressed={f.filters.categories.includes(category)} onClick={() => f.toggleCategory(category)}>
                {cat(category)}
              </button>
            ))}
          </div>
        </div>
        <div className="story-filters__summary">
          <span aria-live="polite">{t('results_count', { n: f.filtered.length, total: data.events.length })}</span>
          {f.active && <button type="button" className="text-link story-filters__clear" onClick={f.clear}>{t('clear_filters')}</button>}
        </div>
      </section>

      {requestedId && !requested && (
        <div className="wrap"><p className="empty-note" role="alert">{t('record_not_found', { id: requestedId })}</p></div>
      )}

      <section className="story-body wrap">
        <div className="story-body__list">
          {f.filtered.length ? (
            <TimelineList events={f.filtered} selectedId={selected?.Event_ID ?? null} onSelect={select} />
          ) : (
            <div className="empty-note">
              <p>{t('no_events')}</p>
              <button type="button" className="btn btn--small btn--ink" onClick={f.clear}>{t('clear_filters')}</button>
            </div>
          )}
        </div>
        {isWide && <aside className="story-body__detail" aria-label="Event record">{detail}</aside>}
      </section>

      {!isWide && selected && createPortal(
        <div className="story-sheet" role="dialog" aria-modal="true" aria-label={eventTitle(selected)}>
          <div className="story-sheet__backdrop" onClick={() => select(null)} aria-hidden="true" />
          <div className="story-sheet__panel">{detail}</div>
        </div>,
        document.body,
      )}

      {selected && (
        <Lightbox
          items={[{ src: selected.Image_URL, alt: selected.Image_Caption || eventTitle(selected), caption: selected.Image_Caption, credit: selected.Image_Credit }]}
          index={lightboxOpen ? 0 : null}
          onChange={() => undefined}
          onClose={() => setLightboxOpen(false)}
          title={eventTitle(selected)}
        />
      )}
    </>
  );
}
