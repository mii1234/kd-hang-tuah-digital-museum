import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, ScrollText } from 'lucide-react';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { ImageFrame } from '../components/ImageFrame';
import { VerificationBadge } from '../components/VerificationBadge';
import { Lightbox } from '../components/Lightbox';
import { Reveal } from '../components/Reveal';
import { LifeStrip } from '../features/timeline/LifeStrip';
import { RouteSketch } from '../features/map/RouteSketch';
import { formatHistoricalDate } from '../utils/dates';
import { formatPosition } from '../utils/geo';
import { PageSources } from '../components/PageSources';
import './HomePage.css';

const KEY_CATEGORIES = ['Construction and Origins', 'Commissioning', 'Naval Service', 'Training', 'Decommissioning', 'Museum and Preservation'];

export function HomePage() {
  const data = useMuseum();
  const { t, lang, eventTitle, cat, componentName } = useLang();
  const c = useContent();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => { document.title = 'KD Hang Tuah — Digital Maritime Museum'; }, []);

  // One milestone per key theme, the first in time, so the strip spans the ship's whole life.
  const milestones = useMemo(() => {
    const out = KEY_CATEGORIES
      .map((category) => data.events.find((e) => e.Event_Category === category))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
    return out.length ? out : data.events.slice(0, 5);
  }, [data.events]);

  const preview = data.events.slice(0, 6);
  const featured = data.gallery.find((g) => g.Category === 'Archive') ?? data.gallery[0];
  const legacyImage = data.gallery.find((g) => g.Category === 'Museum');
  const components = data.components.slice(0, 4);
  const coords = data.content.Home_Coordinates;

  return (
    <>
      {/* Hero: the ship's name set on a waterline scale, above the main photograph */}
      <section className="hero on-dark" aria-labelledby="hero-title">
        <div className="wrap hero__inner">
          <p className="hero__kicker">{c('hero_kicker')}</p>
          <h1 id="hero-title" className="hero__name">{data.ship.Ship_Name}</h1>
          <div className="hero__waterline" aria-hidden="true">
            <span className="hero__waterline-scale" />
          </div>
          <div className="hero__body">
            <p className="hero__intro">{c('hero_intro')}</p>
            <PageSources textKey="hero_intro" />
            <div className="hero__ctas">
              <Link to="/story" className="btn btn--primary">
                <ScrollText size={17} aria-hidden="true" /> {t('explore_history')}
              </Link>
              <Link to="/voyage" className="btn btn--ghost hero__secondary">
                <Compass size={17} aria-hidden="true" /> {t('trace_voyages')}
              </Link>
            </div>
          </div>
        </div>
        <div className="hero__photo">
          <ImageFrame
            src={data.ship.Hero_Image_URL}
            alt={data.ship.Hero_Image_Caption || data.ship.Ship_Name}
            caption={data.ship.Hero_Image_Caption}
            ratio="21 / 8"
            eager
            tone="dark"
          />
          {coords && (
            <p className="hero__coords mono wrap">
              <span>{formatPosition(coords.Latitude, coords.Longitude)}</span>
              <span>{coords.Label}</span>
              {data.ship.Hero_Image_Credit && <span>{t('credit')}: {data.ship.Hero_Image_Credit}</span>}
            </p>
          )}
        </div>
      </section>

      {/* Milestone strip */}
      <section className="section--tight wrap home-milestones" aria-labelledby="ms-title">
        <h2 id="ms-title" className="home-kicker-title">{t('milestones')}</h2>
        <LifeStrip events={data.events} onSelect={(id) => navigate(`/story?event=${id}`)} label={t('milestones')} />
        <ol className="home-milestones__list">
          {milestones.map((e) => (
            <li key={e.Event_ID}>
              <Link to={`/story?event=${e.Event_ID}`}>
                <span className="mono home-milestones__date">{formatHistoricalDate(e.Date, e.Date_Precision, lang)}</span>
                <span className="home-milestones__title">{eventTitle(e)}</span>
                <span className="home-milestones__cat">{cat(e.Event_Category)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Timeline preview */}
      <section className="section on-offwhite" aria-labelledby="story-title">
        <Reveal className="wrap home-split">
          <div className="home-split__text">
            <span className="page-head__number">02</span>
            <h2 id="story-title">{c('home_story_title')}</h2>
            <p className="lede">{c('home_story_body')}</p>
            <Link to="/story" className="text-link">{t('open_timeline')} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <ol className="ledger">
            {preview.map((e) => (
              <li key={e.Event_ID}>
                <Link to={`/story?event=${e.Event_ID}`} className="ledger__row">
                  <span className="ledger__date mono">{formatHistoricalDate(e.Date, e.Date_Precision, lang)}</span>
                  <span className="ledger__title">{eventTitle(e)}</span>
                  <VerificationBadge status={e.Verification} demo={e.Is_Demo_Data} />
                </Link>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* Voyage preview */}
      <section className="section on-navy" aria-labelledby="voyage-title">
        <Reveal className="wrap">
          <div className="home-voyage__head">
            <div>
              <span className="page-head__number page-head__number--dark">03</span>
              <h2 id="voyage-title">{c('home_voyage_title')}</h2>
            </div>
            <p className="home-voyage__body">{c('home_voyage_body')}</p>
          </div>
          <Link to="/voyage" className="home-voyage__chart" aria-label={t('open_map')}>
            <RouteSketch data={data} title={t('open_map')} />
          </Link>
          <Link to="/voyage" className="btn btn--primary">
            <Compass size={17} aria-hidden="true" /> {t('trace_voyages')}
          </Link>
        </Reveal>
      </section>

      {/* Featured archive photograph */}
      {featured && (
        <section className="section wrap home-featured" aria-labelledby="featured-title">
          <Reveal>
            <h2 id="featured-title" className="home-kicker-title">{c('featured_caption')}</h2>
            <ImageFrame
              src={featured.Image_URL}
              alt={featured.Caption}
              caption={featured.Caption}
              credit={featured.Credit}
              ratio="21 / 9"
              onOpen={() => setLightbox(0)}
            />
            <p className="home-featured__caption">
              <span className="home-featured__title">{featured.Caption}</span>
              {featured.Date && <span className="mono">{formatHistoricalDate(featured.Date, featured.Date_Precision, lang)}</span>}
              <span className="muted home-featured__credit">{featured.Credit ? `${t('credit')}: ${featured.Credit}` : t('no_credit')}</span>
            </p>
          </Reveal>
        </section>
      )}

      {/* Life onboard */}
      <section className="section on-offwhite" aria-labelledby="onboard-title">
        <Reveal className="wrap">
          <div className="home-split home-split--head">
            <div>
              <span className="page-head__number">05</span>
              <h2 id="onboard-title">{c('home_onboard_title')}</h2>
            </div>
            <p className="lede">{c('home_onboard_body')}</p>
          </div>
          <ul className="home-components">
            {components.map((comp) => (
              <li key={comp.Component_ID}>
                <Link to={`/onboard?component=${comp.Component_ID}`}>
                  <ImageFrame src={comp.Image_URLs[0]} alt={componentName(comp)} caption={componentName(comp)} ratio="4 / 5" />
                  <span className="home-components__name">{componentName(comp)}</span>
                  <span className="home-components__cat">{cat(comp.Category)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/onboard" className="text-link">{t('open_onboard')} <ArrowRight size={15} aria-hidden="true" /></Link>
        </Reveal>
      </section>

      {/* Legacy */}
      <section className="section wrap" aria-labelledby="legacy-title">
        <Reveal className="home-legacy">
          <ImageFrame src={legacyImage?.Image_URL} alt={legacyImage?.Caption ?? ''} caption={legacyImage?.Caption} ratio="4 / 3" />
          <div>
            <span className="page-head__number">06</span>
            <h2 id="legacy-title">{c('home_legacy_title')}</h2>
            <p className="lede">{c('home_legacy_body')}</p>
            <PageSources textKey="home_legacy_body" />
            <div className="home-legacy__links">
              <Link to="/legacy" className="btn btn--ink">{t('open_legacy')}</Link>
              <Link to="/ship" className="text-link">{t('open_ship')} <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </Reveal>
      </section>

      {featured && (
        <Lightbox
          items={[{ src: featured.Image_URL, alt: featured.Caption, caption: featured.Caption, credit: featured.Credit }]}
          index={lightbox}
          onChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
