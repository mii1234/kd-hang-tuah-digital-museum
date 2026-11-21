import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import type { ExteriorComponent } from './exteriorData';

interface Props {
  components: ExteriorComponent[];
  hiddenCount: number;
  numbers: Map<string, number>;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
}

export const componentName = (c: ExteriorComponent, ms: boolean) => (ms && c.Name_MS) || c.Name;

/** Searchable, grouped list of parts: the keyboard and screen-reader route to every hotspot. */
export function ShipComponentList({ components, hiddenCount, numbers, selectedId, hoverId, onSelect }: Props) {
  const { t, lang } = useLang();
  const ms = lang === 'ms';
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (c: ExteriorComponent) => !needle || [c.Name, c.Name_MS, c.Component_ID, c.Description].some((s) => s && s.toLowerCase().includes(needle));
    const out = new Map<string, ExteriorComponent[]>();
    for (const c of components) if (hit(c)) out.set(c.Group, [...(out.get(c.Group) ?? []), c]);
    return out;
  }, [components, q]);

  return (
    <div className="s3d-list">
      <h3 className="s3d-list__title">{t('s3d_components')}</h3>
      <div className="field">
        <label htmlFor="s3d-search" className="visually-hidden">{t('s3d_search')}</label>
        <div className="input-icon">
          <Search size={15} aria-hidden="true" />
          <input id="s3d-search" type="search" className="input" placeholder={t('s3d_search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {groups.size === 0 && <p className="muted s3d-list__empty">{t('s3d_no_match', { q })}</p>}
      {[...groups].map(([group, items]) => (
        <div key={group} className="s3d-list__group">
          <p className="s3d-list__group-title">{group}</p>
          <ul>
            {items.map((c) => (
              <li key={c.Component_ID}>
                <button
                  type="button"
                  className={`s3d-list__item${hoverId === c.Component_ID ? ' is-hover' : ''}`}
                  aria-pressed={selectedId === c.Component_ID}
                  onClick={() => onSelect(c.Component_ID)}
                >
                  <span className="s3d-marker s3d-marker--static" aria-hidden="true">{numbers.get(c.Component_ID)}</span>
                  <span className="s3d-list__name">{componentName(c, ms)}</span>
                  {c.Config !== 'shared' && <span className="s3d-list__cfg">{t('s3d_config_only')}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {hiddenCount > 0 && <p className="muted s3d-list__note">{t('s3d_other_config', { n: hiddenCount })}</p>}
    </div>
  );
}
