import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { useContent } from '../hooks/useContent';
import { VerificationBadge, DemoTag } from '../components/VerificationBadge';
import { VERIFICATION_VALUES, type Source } from '../data/types';
import './SourcesPage.css';

export function SourcesPage() {
  const data = useMuseum();
  const { t, lang, eventTitle, locName, vHelp } = useLang();
  const c = useContent();
  useEffect(() => { document.title = `${t('nav_sources')} — KD Hang Tuah`; }, [t]);

  const counts = useMemo(() => {
    const all = [...data.events, ...data.locations, ...data.components];
    const byStatus = Object.fromEntries(VERIFICATION_VALUES.map((v) => [v, all.filter((r) => r.Verification === v).length]));
    const demo = all.filter((r) => r.Is_Demo_Data).length + data.routePoints.filter((p) => p.Is_Demo_Data).length;
    return { byStatus, demo, total: all.length + data.routePoints.length };
  }, [data]);

  const ms = lang === 'ms';
  const errors = data.issues.filter((i) => i.level === 'error');
  const warnings = data.issues.filter((i) => i.level === 'warning');

  const relied = data.sources.filter((s) => s.Relied_On !== false);
  const further = data.sources.filter((s) => s.Relied_On === false);
  const renderSource = (s: Source) => (
    <li key={s.Source_ID} id={s.Source_ID} className="register__item print-record">
      <div className="register__head">
        <span className="mono register__id">{s.Source_ID}</span>
        <h3>{s.Source_Title}</h3>
        {s.Is_Placeholder && <span className="register__placeholder"><Info size={14} aria-hidden="true" /> {t('placeholder_source')}</span>}
      </div>
      <dl className="register__fields">
        <div><dt>{ms ? 'Pengarang / organisasi' : 'Author or organisation'}</dt><dd>{s.Author_or_Organisation || '—'}</dd></div>
        <div><dt>{ms ? 'Jenis' : 'Type'}</dt><dd>{s.Source_Type || '—'}</dd></div>
        <div><dt>{t('publication_date')}</dt><dd>{s.Publication_Date || '—'}</dd></div>
        <div><dt>{t('document_reference')}</dt><dd>{s.Document_Reference || '—'}</dd></div>
        <div>
          <dt>URL</dt>
          <dd>{s.Source_URL ? <a href={s.Source_URL} target="_blank" rel="noopener noreferrer" className="text-link register__url">{s.Source_URL} <ExternalLink size={13} aria-hidden="true" /></a> : '—'}</dd>
        </div>
        <div><dt>{t('rights')}</dt><dd>{[s.Rights_Status, s.Image_Credit].filter(Boolean).join(' — ') || '—'}</dd></div>
      </dl>
      {s.Verification_Notes && <p className="register__notes"><strong>{t('notes')}:</strong> {s.Verification_Notes}</p>}
      <div className="register__links">
        {(s.Related_Event_IDs ?? []).length > 0 && (
          <div>
            <span className="field__label">{t('related_events')}</span>
            <ul>
              {s.Related_Event_IDs!.map((id) => {
                const e = data.eventById.get(id);
                return <li key={id}>{e ? <Link to={`/story?event=${id}`}>{eventTitle(e)}</Link> : <span className="mono">{id}</span>}</li>;
              })}
            </ul>
          </div>
        )}
        {(s.Related_Location_IDs ?? []).length > 0 && (
          <div>
            <span className="field__label">{t('related_locations')}</span>
            <ul>
              {s.Related_Location_IDs!.map((id) => {
                const l = data.locationById.get(id);
                return <li key={id}>{l ? <Link to={`/voyage?location=${id}`}>{locName(l)}</Link> : <span className="mono">{id}</span>}</li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </li>
  );

  return (
    <>
      <header className="page-head wrap">
        <span className="page-head__number">07</span>
        <h1>{t('nav_sources')}</h1>
        <p className="lede">{c('sources_intro')}</p>
      </header>

      <section className="wrap section" aria-labelledby="method-title">
        <h2 id="method-title">{t('methodology')}</h2>
        <div className="method">
          <div className="method__text">
            <p>
              {data.content.Verified_First
                ? (ms
                  ? 'Setiap rekod yang dipaparkan dalam pameran ini telah disemak berdasarkan sumber yang dirujuk bersamanya. Rekod hanya dipaparkan apabila sumbernya menyokong setiap butirannya; butiran yang tidak disokong ditinggalkan, bukan digantikan.'
                  : 'Every record shown in this exhibition has been checked against the sources cited with it. A record is shown only when its sources support each of its details; details that are not supported are left out, not replaced.')
                : (ms
                  ? 'Setiap rekod dalam pameran ini membawa status pengesahan. Status hanya boleh ditukar kepada "Disahkan" apabila sekurang-kurangnya satu sumber dalam daftar di bawah menyokongnya. Rekod contoh yang digunakan semasa pembangunan ditanda Demo dan tidak boleh dianggap sebagai bukti sejarah.'
                  : 'Every record in this exhibition carries a verification status. A record may only be marked Verified when at least one source in the register below supports it. Example records used while the site is being built are marked Demo and must not be treated as historical evidence.')}
            </p>
            <p>
              {data.content.Verified_First
                ? (ms
                  ? 'Peristiwa dan butiran yang sumbernya bercanggah, atau yang belum disahkan, disimpan dalam daftar penyelidikan projek dan tidak dipaparkan di sini. Tarikh yang hanya diketahui tahun atau bulannya dipaparkan begitu sahaja, tidak ditukar kepada hari tertentu.'
                  : 'Events and details whose sources disagree, or that are not yet confirmed, are kept in the project\'s research register and are not shown here. Dates known only to the year or month are shown that way and are never turned into an exact day.')
                : (ms
                  ? 'Jika sumber memberikan tarikh yang berbeza, semua tarikh disenaraikan dan rekod ditanda Dipertikaikan. Tarikh yang hanya diketahui tahun atau bulannya dipaparkan begitu sahaja, tidak ditukar kepada hari tertentu.'
                  : 'Where sources give different dates, every date is listed and the record is marked Disputed. Dates known only to the year or month are shown that way and are never turned into an exact day.')}
            </p>
            <p>
              {ms
                ? 'Laluan pelayaran di peta adalah skematik: ia menghubungkan pelabuhan mengikut urutan dan tidak mendakwa menunjukkan laluan sebenar kapal.'
                : 'Voyage routes on the chart are schematic: they connect ports in order and do not claim to show the ship\'s actual track.'}
              {' '}
              {ms ? 'Pin bertanda Ilustrasi menunjukkan kawasan, bukan kedudukan yang direkodkan.' : 'A pin marked Illustrative shows an area, not a recorded position.'}
            </p>
          </div>
          <dl className="method__statuses">
            {VERIFICATION_VALUES.map((v) => (
              <div key={v}>
                <dt><VerificationBadge status={v} size="md" /></dt>
                <dd>{vHelp(v)} <span className="mono method__count">{counts.byStatus[v]}</span></dd>
              </div>
            ))}
            <div>
              <dt><DemoTag /></dt>
              <dd>{t('demo_title')}. <span className="mono method__count">{counts.demo} / {counts.total}</span></dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="wrap section on-offwhite-block" id="register" aria-labelledby="reg-title">
        <h2 id="reg-title">{further.length ? t('sources_relied') : t('source_list')}</h2>
        {relied.length ? (
          <ol className="register">
            {relied.map(renderSource)}
          </ol>
        ) : <p className="empty-note">sources.json is empty. Add sources to cite them from events.</p>}
      </section>

      {further.length > 0 && (
        <section className="wrap section" id="further-references" aria-labelledby="further-title">
          <h2 id="further-title">{t('further_refs')}</h2>
          <p className="muted">{t('further_refs_intro')}</p>
          <ol className="register register--further">
            {further.map(renderSource)}
          </ol>
        </section>
      )}

      <section className="wrap section no-print" id="data-checks" aria-labelledby="dc-title">
        <h2 id="dc-title">{t('data_health')}</h2>
        {data.issues.length === 0 ? (
          <p className="health health--ok"><CheckCircle2 size={18} aria-hidden="true" /> {t('data_health_ok')}</p>
        ) : (
          <>
            <p className="muted">{t('data_health_intro')}</p>
            <p className="mono health__summary">{errors.length} error(s), {warnings.length} warning(s)</p>
            <ul className="health">
              {[...errors, ...warnings].map((i, n) => (
                <li key={n} className={`health__item health__item--${i.level}`}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span className="health__level">{i.level === 'error' ? 'Error' : 'Warning'}</span>
                  <span className="mono">{i.file}{i.id ? ` · ${i.id}` : ''}</span>
                  <span className="health__msg">{i.message}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
