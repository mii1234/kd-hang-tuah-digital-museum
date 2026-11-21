import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { ComponentCard } from '../features/gallery/ComponentCard';
import { Lightbox, type LightboxItem } from '../components/Lightbox';
import './OnboardPage.css';

const CATEGORY_ORDER = ['Exterior', 'Bridge and Navigation', 'Deck', 'Armament', 'Engine and Machinery', 'Living Quarters', 'Training Facilities', 'Communication Equipment', 'Safety Equipment', 'Other Components'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function OnboardPage() {
  const { components } = useMuseum();
  const { t, cat, componentName } = useLang();
  const c = useContent();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => { document.title = `${t('nav_onboard')} — KD Hang Tuah`; }, [t]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(components.map((x) => x.Category)));
    return present.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [components]);

  const filtered = useMemo(() => {
    const terms = norm(query.trim()).split(/\s+/).filter(Boolean);
    return components.filter((x) => {
      if (category && x.Category !== category) return false;
      if (!terms.length) return true;
      const hay = norm([x.Component_Name, x.Component_Name_MS, x.Category, x.Description, x.Ship_Section].filter(Boolean).join(' '));
      return terms.every((term) => hay.includes(term));
    });
  }, [components, query, category]);

  const openId = params.get('component');
  const open = openId ? components.find((x) => x.Component_ID === openId) ?? null : null;

  const openComponent = (id: string) => {
    setImageIndex(0);
    setParams({ component: id }, { replace: false });
  };
  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('component');
    setParams(next, { replace: true });
  };

  const items: LightboxItem[] = open
    ? (open.Image_URLs.length ? open.Image_URLs : ['']).map((src, i) => ({
      src: src || undefined,
      alt: `${componentName(open)} — ${i + 1}`,
      caption: open.Image_Captions?.[i] || open.Description,
      credit: open.Photo_Credit,
      meta: [cat(open.Category), open.Ship_Section].filter(Boolean).join(', '),
    }))
    : [];

  return (
    <>
      <header className="page-head wrap">
        <span className="page-head__number">05</span>
        <h1>{t('nav_onboard')}</h1>
        <p className="lede">{c('onboard_intro')}</p>
      </header>

      <section className="wrap onboard-filters" aria-label="Filters">
        <div className="field onboard-filters__search">
          <label htmlFor="cmp-search">{t('search')}</label>
          <div className="input-icon">
            <Search size={16} aria-hidden="true" />
            <input id="cmp-search" type="search" className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="chips" role="group" aria-label={t('category')}>
          <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>{t('all')}</button>
          {categories.map((x) => (
            <button key={x} type="button" className="chip" aria-pressed={category === x} onClick={() => setCategory(category === x ? null : x)}>{cat(x)}</button>
          ))}
        </div>
      </section>

      <section className="wrap section--tight" aria-live="polite">
        {filtered.length ? (
          <ul className="comp-grid">
            {filtered.map((x) => (
              <li key={x.Component_ID}><ComponentCard component={x} onOpen={() => openComponent(x.Component_ID)} /></li>
            ))}
          </ul>
        ) : (
          <div className="empty-note">
            <p>{t('no_components')}</p>
            <button type="button" className="btn btn--small btn--ink" onClick={() => { setQuery(''); setCategory(null); }}>{t('clear_filters')}</button>
          </div>
        )}
      </section>

      <Lightbox
        items={items}
        index={open ? Math.min(imageIndex, items.length - 1) : null}
        onChange={setImageIndex}
        onClose={close}
        title={open ? componentName(open) : undefined}
      />
    </>
  );
}
