import { useEffect, useState } from 'react';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { VerificationBadge } from '../components/VerificationBadge';
import { ImageFrame } from '../components/ImageFrame';
import { SourceRefs } from '../components/SourceRefs';
import { Lightbox, type LightboxItem } from '../components/Lightbox';
import { Reveal } from '../components/Reveal';
import { PageSources } from '../components/PageSources';
import { formatHistoricalDate } from '../utils/dates';
import { Ship3DSection } from '../features/ship3d/Ship3DSection';
import './ShipPage.css';

export function ShipPage() {
  const { ship, gallery } = useMuseum();
  const { t, lang } = useLang();
  const c = useContent();
  const [lightbox, setLightbox] = useState<number | null>(null);
  useEffect(() => { document.title = `${t('nav_ship')} — KD Hang Tuah`; }, [t]);

  const photos: LightboxItem[] = gallery.map((g) => ({
    src: g.Image_URL,
    alt: g.Caption,
    caption: g.Caption,
    credit: g.Credit,
    meta: g.Date ? formatHistoricalDate(g.Date, g.Date_Precision, lang) : undefined,
  }));

  return (
    <>
      <header className="page-head wrap">
        <span className="page-head__number">04</span>
        <h1>{ship.Ship_Name}</h1>
        <p className="lede">{c('ship_intro')}</p>
      </header>

      <Ship3DSection />

      <section className="wrap section ship-record" aria-labelledby="spec-title">
        <div className="record-card print-record">
          <div className="record-card__head">
            <h2 id="spec-title">{t('specs')}</h2>
            <p className="record-card__summary">{ship.Summary}</p>
            <PageSources textKey="ship_summary" />
          </div>
          <dl className="record-card__rows">
            {ship.Pennant_Number && (
              <div className="record-card__row">
                <dt>{lang === 'ms' ? 'Nombor penant' : 'Pennant number'}</dt>
                <dd>
                  {ship.Pennant_Number.Value ? <span className="record-card__value">{ship.Pennant_Number.Value}</span> : <span className="record-card__pending">{t('pending')}</span>}
                </dd>
                <dd className="record-card__status"><VerificationBadge status={ship.Pennant_Number.Verification} /></dd>
              </div>
            )}
            {ship.Specifications.map((s) => (
              <div className="record-card__row" key={s.Key}>
                <dt>{(lang === 'ms' && s.Label_MS) || s.Label}</dt>
                <dd>
                  {s.Value ? (
                    <span className="record-card__value">{s.Value}{s.Unit ? <span className="record-card__unit"> {s.Unit}</span> : null}</span>
                  ) : (
                    <span className="record-card__pending">{t('pending')}</span>
                  )}
                  {s.Source_IDs && s.Source_IDs.length > 0 && <span className="mono record-card__src">{s.Source_IDs.join(', ')}</span>}
                </dd>
                <dd className="record-card__status"><VerificationBadge status={s.Verification} /></dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="ship-names" aria-labelledby="names-title">
          <h2 id="names-title">{t('names')}</h2>
          {ship.Historical_Names.length ? (
            <ol>
              {ship.Historical_Names.map((n, i) => (
                <li key={i}>
                  <span className="mono ship-names__years">
                    {n.From
                      ? `${n.From} – ${n.To || (lang === 'ms' ? 'kini' : 'present')}`
                      : n.To ? `${lang === 'ms' ? 'Hingga' : 'Until'} ${n.To}` : '—'}
                  </span>
                  <span className="ship-names__name">{n.Name}</span>
                  {n.Navy && <span className="ship-names__navy">{n.Navy}</span>}
                  <VerificationBadge status={n.Verification} />
                  {n.Notes && <p className="ship-names__notes">{n.Notes}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">{t('pending')}</p>
          )}
        </aside>
      </section>

      <section className="on-offwhite section" aria-labelledby="sections-title">
        <div className="wrap">
          <h2 id="sections-title" className="ship-sections__title">{t('profile_sections')}</h2>
          <div className="ship-sections">
            {ship.Sections.map((s, i) => (
              <Reveal as="article" key={s.Section_ID} className={`ship-section${i % 2 ? ' ship-section--flip' : ''}${s.Image_URL ? '' : ' ship-section--text'}`}>
                {s.Image_URL && <ImageFrame src={s.Image_URL} alt={s.Image_Caption || s.Title} caption={s.Image_Caption} credit={s.Image_Credit} ratio="3 / 2" showCaption />}
                <div className="ship-section__text" id={s.Section_ID}>
                  <h3>{s.Title}</h3>
                  <VerificationBadge status={s.Verification} />
                  <p>{s.Body}</p>
                  <SourceRefs ids={s.Source_IDs} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {ship.Commanding_Officers && (() => {
        const co = ship.Commanding_Officers;
        const ms = lang === 'ms';
        return (
          <section className="wrap section ship-cos" aria-labelledby="cos-title" id="commanding-officers">
            <h2 id="cos-title">{(ms && co.Title_MS) || co.Title}</h2>
            <VerificationBadge status={co.Verification} />
            {co.Intro && <p className="ship-cos__intro">{(ms && co.Intro_MS) || co.Intro}</p>}
            <p className="ship-cos__note" role="note">{(ms && co.Note_MS) || co.Note}</p>
            <div className="ship-cos__scroll">
              <table className="ship-cos__table">
                <thead>
                  <tr>
                    <th scope="col">{ms ? 'Bil.' : 'No.'}</th>
                    <th scope="col">{ms ? 'Pangkat dan nama' : 'Rank and name'}</th>
                    <th scope="col">{ms ? 'Dari' : 'From'}</th>
                    <th scope="col">{ms ? 'Hingga' : 'To'}</th>
                  </tr>
                </thead>
                <tbody>
                  {co.Entries.map((e) => (
                    <tr key={e.No}>
                      <td className="mono">{e.No}</td>
                      <td>
                        {e.Rank} {e.Name}
                        {e.Later && <span className="ship-cos__later">{(ms && e.Later_MS) || e.Later}</span>}
                      </td>
                      <td className="mono">{formatHistoricalDate(e.From, 'day', lang)}</td>
                      <td className="mono">{formatHistoricalDate(e.To, 'day', lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SourceRefs ids={co.Source_IDs} />
          </section>
        );
      })()}

      <section className="wrap section" aria-labelledby="photos-title">
        <h2 id="photos-title">{t('photographs')}</h2>
        <ul className="photo-grid">
          {gallery.map((g, i) => (
            <li key={g.Image_ID}>
              <ImageFrame src={g.Image_URL} alt={g.Caption} caption={g.Caption} ratio="4 / 3" onOpen={() => setLightbox(i)} />
              <p className="photo-grid__caption">
                <span>{g.Caption}</span>
                <span className="muted">{g.Category}{g.Date ? ` — ${formatHistoricalDate(g.Date, g.Date_Precision, lang)}` : ''}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
      <Lightbox items={photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
    </>
  );
}
