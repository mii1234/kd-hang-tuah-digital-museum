import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { ImageFrame } from '../components/ImageFrame';
import { VerificationBadge } from '../components/VerificationBadge';
import { SourceRefs } from '../components/SourceRefs';
import { Lightbox } from '../components/Lightbox';
import { Reveal } from '../components/Reveal';
import { TILE_ATTRIBUTION, TILE_URL } from '../features/map/mapConfig';
import { formatRange } from '../utils/dates';
import { formatPosition } from '../utils/geo';
import { isUsableUrl } from '../utils/assets';
import '../features/map/VoyageMap.css';
import { PageSources } from '../components/PageSources';
import './LegacyPage.css';

const LEGACY_CATEGORIES = ['Decommissioning', 'Museum and Preservation'];
const VISITOR_FIELDS = [
  ['Opening_Hours', 'opening_hours'],
  ['Admission', 'admission'],
  ['Address', 'address'],
  ['Contact', 'contact'],
] as const;

const museumIcon = L.divIcon({
  className: 'loc-pin-wrap',
  html: '<span class="loc-pin loc-pin--needs is-selected"><span class="loc-pin__dot"></span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export function LegacyPage() {
  const { events, gallery, locations, content } = useMuseum();
  const { t, lang, eventTitle, eventDescription, cat, locName } = useLang();
  const c = useContent();
  const [lightbox, setLightbox] = useState<number | null>(null);
  useEffect(() => { document.title = `${t('nav_legacy')} — KD Hang Tuah`; }, [t]);

  const milestones = events.filter((e) => LEGACY_CATEGORIES.includes(e.Event_Category));
  const museumPhotos = gallery.filter((g) => g.Category === 'Museum');
  const lead = museumPhotos[0];
  const museumLoc = locations.find((l) => l.Location_Type === 'Museum') ?? null;
  const visitor = content.Visitor_Info;
  const website = isUsableUrl(visitor.Official_Website) ? visitor.Official_Website : '';
  // An announced plan, kept apart from the historical milestones above (never on the timeline).
  const planned = content.Planned_Opening;

  return (
    <>
      <header className="page-head wrap">
        <span className="page-head__number">06</span>
        <h1>{t('nav_legacy')}</h1>
        <p className="lede">{c('legacy_intro')}</p>
      </header>

      <section className="section wrap legacy-lead">
        <ImageFrame src={lead?.Image_URL} alt={lead?.Caption ?? ''} caption={lead?.Caption} credit={lead?.Credit} ratio="16 / 10" showCaption onOpen={lead ? () => setLightbox(0) : undefined} />
        <div className="legacy-lead__text">
          <p className="legacy-lead__body">{c('legacy_body')}</p>
          {content.Page_Text_Sources?.legacy_body?.length ? (
            <div className="legacy-lead__sources">
              <span className="field__label">{t('page_sources')}</span>
              <SourceRefs ids={content.Page_Text_Sources.legacy_body} />
            </div>
          ) : (
            <VerificationBadge status="Illustrative" demo />
          )}
        </div>
      </section>

      <section className="section on-dark" aria-labelledby="pm-title">
        <div className="wrap">
          <h2 id="pm-title" className="legacy-ms__title">{t('preservation_milestones')}</h2>
          {milestones.length ? (
            <ol className="legacy-ms">
              {milestones.map((e) => (
                <Reveal as="li" key={e.Event_ID} className="legacy-ms__item">
                  <span className="legacy-ms__date mono">{formatRange(e.Date, e.End_Date, e.Date_Precision, lang)}</span>
                  <div>
                    <h3><Link to={`/story?event=${e.Event_ID}`}>{eventTitle(e)}</Link></h3>
                    <p className="legacy-ms__cat">{cat(e.Event_Category)}</p>
                    <p>{eventDescription(e)}</p>
                    <VerificationBadge status={e.Verification} demo={e.Is_Demo_Data} />
                  </div>
                  <ImageFrame src={e.Image_URL} alt={e.Image_Caption || eventTitle(e)} caption={e.Image_Caption} ratio="4 / 3" tone="dark" />
                </Reveal>
              ))}
            </ol>
          ) : <p className="muted">{t('no_events')}</p>}
        </div>
      </section>

      {planned && (
        <section className="section wrap legacy-planned" aria-labelledby="planned-title">
          <h2 id="planned-title">{t('planned_title')}</h2>
          <article className="legacy-planned__card">
            <p className="legacy-planned__badge">{t('planned_badge')}</p>
            <p className="legacy-planned__date mono">{planned.Date}</p>
            <h3>{(lang === 'ms' && planned.Title_MS) || planned.Title}</h3>
            <p>{(lang === 'ms' && planned.Text_MS) || planned.Text}</p>
            <SourceRefs ids={planned.Source_IDs} />
          </article>
        </section>
      )}

      {museumPhotos.length > 1 && (
        <section className="section wrap" aria-label={t('photographs')}>
          <ul className="legacy-photos">
            {museumPhotos.map((g, i) => (
              <li key={g.Image_ID}>
                <ImageFrame src={g.Image_URL} alt={g.Caption} caption={g.Caption} credit={g.Credit} ratio="4 / 3" showCaption onOpen={() => setLightbox(i)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section on-offwhite" aria-labelledby="visit-title">
        <div className="wrap legacy-visit">
          <div>
            <h2>{t('location_lumut')}</h2>
            {museumLoc ? (
              <>
                <p className="legacy-visit__place">{locName(museumLoc)}</p>
                <p className="mono muted">{formatPosition(museumLoc.Latitude, museumLoc.Longitude)}</p>
                <VerificationBadge status={museumLoc.Verification} demo={museumLoc.Is_Demo_Data} showHelp />
                <div className="legacy-visit__map">
                  <MapContainer center={[museumLoc.Latitude, museumLoc.Longitude]} zoom={12} scrollWheelZoom={false} className="legacy-visit__canvas">
                    <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                    <Marker position={[museumLoc.Latitude, museumLoc.Longitude]} icon={museumIcon} title={locName(museumLoc)} />
                  </MapContainer>
                </div>
                <Link to={`/voyage?location=${museumLoc.Location_ID}`} className="text-link">{t('show_on_map')}</Link>
              </>
            ) : <p className="muted">{t('visit_pending')}</p>}
          </div>
          <div>
            <h2 id="visit-title">{c('visit_title')}</h2>
            <p>{c('visit_body')}</p>
            <PageSources textKey="visit_body" />
            <dl className="legacy-visit__facts">
              {VISITOR_FIELDS.map(([field, label]) => (
                <div key={field}>
                  <dt>{t(label)}</dt>
                  <dd>{visitor[field] ? visitor[field] : <span className="record-card__pending">{t('visit_pending')}</span>}</dd>
                </div>
              ))}
            </dl>
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="btn btn--ink">
                {t('visit_cta')} <ExternalLink size={15} aria-hidden="true" />
              </a>
            ) : (
              <p className="legacy-visit__note">{t('official_website')}: <span className="record-card__pending">{t('visit_pending')}</span></p>
            )}
            {visitor.Last_Checked && <p className="muted legacy-visit__checked">Last checked: {visitor.Last_Checked}</p>}
          </div>
        </div>
      </section>

      <Lightbox
        items={museumPhotos.map((g) => ({ src: g.Image_URL, alt: g.Caption, caption: g.Caption, credit: g.Credit }))}
        index={lightbox}
        onChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
