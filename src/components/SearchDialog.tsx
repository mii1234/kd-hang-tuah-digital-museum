import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useDataState } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { formatHistoricalDate } from '../utils/dates';
import type { MuseumData } from '../data/types';
import type { StringKey } from '../i18n/strings';
import './SearchDialog.css';

interface Result {
  id: string;
  title: string;
  meta: string;
  to: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function useSearch(data: MuseumData | null, query: string) {
  const { lang, eventTitle, locName, componentName, cat } = useLang();
  return useMemo(() => {
    const q = norm(query.trim());
    if (!data || q.length < 2) return null;
    const terms = q.split(/\s+/);
    const hit = (...fields: (string | undefined | null)[]) => {
      const hay = norm(fields.filter(Boolean).join(' '));
      return terms.every((t) => hay.includes(t));
    };
    const groups: { key: StringKey; items: Result[] }[] = [
      {
        key: 'search_group_events',
        items: data.events
          .filter((e) => hit(e.Event_Title, e.Event_Title_MS, e.Description, e.Event_Category, e.Date, e.Event_ID, e.Location_ID ? data.locationById.get(e.Location_ID)?.Location_Name : ''))
          .map((e) => ({ id: e.Event_ID, title: eventTitle(e), meta: `${formatHistoricalDate(e.Date, e.Date_Precision, lang)} — ${cat(e.Event_Category)}`, to: `/story?event=${e.Event_ID}` })),
      },
      {
        key: 'search_group_locations',
        items: data.locations
          .filter((l) => hit(l.Location_Name, l.Location_Name_MS, l.Country, l.Description, l.Location_ID))
          .map((l) => ({ id: l.Location_ID, title: locName(l), meta: l.Country ?? '', to: `/voyage?location=${l.Location_ID}` })),
      },
      {
        key: 'search_group_components',
        items: data.components
          .filter((c) => hit(c.Component_Name, c.Component_Name_MS, c.Category, c.Description, c.Ship_Section))
          .map((c) => ({ id: c.Component_ID, title: componentName(c), meta: cat(c.Category), to: `/onboard?component=${c.Component_ID}` })),
      },
      {
        key: 'search_group_sources',
        items: data.sources
          .filter((s) => hit(s.Source_Title, s.Author_or_Organisation, s.Verification_Notes, s.Source_ID))
          .map((s) => ({ id: s.Source_ID, title: s.Source_Title, meta: s.Author_or_Organisation ?? '', to: `/sources#${s.Source_ID}` })),
      },
    ];
    return groups.filter((g) => g.items.length);
  }, [data, query, lang, eventTitle, locName, componentName, cat]);
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { state } = useDataState();
  const data = state.status === 'ready' ? state.data : null;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const groups = useSearch(data, query);
  const flat = groups?.flatMap((g) => g.items) ?? [];

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => inputRef.current?.focus(), 0);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (r: Result) => {
    onClose();
    setQuery('');
    navigate(r.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]); }
  };

  let idx = -1;
  return createPortal(
    <div className="search-dialog" role="dialog" aria-modal="true" aria-label={t('search')} onKeyDown={onKeyDown}>
      <div className="search-dialog__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="search-dialog__panel">
        <div className="search-dialog__bar">
          <Search size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="search-dialog__input"
            placeholder={t('search_placeholder')}
            aria-label={t('search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="search-results"
            aria-activedescendant={flat[active] ? `sr-${flat[active].id}` : undefined}
          />
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('search_close')}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="search-dialog__results" id="search-results" role="listbox" aria-label={t('search')}>
          {!groups && <p className="search-dialog__hint">{t('search_empty')}</p>}
          {groups && groups.length === 0 && <p className="search-dialog__hint">{t('search_none')}</p>}
          {groups?.map((g) => (
            <div key={g.key} className="search-dialog__group" role="group" aria-label={t(g.key)}>
              <h2 className="search-dialog__group-title">{t(g.key)}</h2>
              <ul>
                {g.items.map((r) => {
                  idx++;
                  const i = idx;
                  return (
                    <li key={r.id} id={`sr-${r.id}`} role="option" aria-selected={i === active}>
                      <button type="button" className={`search-dialog__item${i === active ? ' is-active' : ''}`} onClick={() => go(r)} onMouseEnter={() => setActive(i)} tabIndex={-1}>
                        <span className="search-dialog__item-title">{r.title}</span>
                        <span className="search-dialog__item-meta">{r.meta}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
