import { Link } from 'react-router-dom';
import { DoorOpen, X } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { VerificationBadge } from '../../components/VerificationBadge';
import { SourceRefs } from '../../components/SourceRefs';
import type { ExteriorComponent, ExteriorConfiguration, ModelStatus } from './exteriorData';

const STATUS_KEY = {
  Supported: 's3d_status_Supported',
  'Approximate reconstruction': 's3d_status_Approximate_reconstruction',
  Conceptual: 's3d_status_Conceptual',
  'Pending verification': 's3d_status_Pending_verification',
} as const satisfies Record<ModelStatus, string>;
import { componentName } from './ShipComponentList';

interface Props {
  component: ExteriorComponent | null;
  configuration: ExteriorConfiguration | undefined;
  number?: number;
  onClear: () => void;
  /** Present when the part's inside can be inspected. */
  onInspect?: () => void;
}

/**
 * Information about the selected part. The layout leaves room for approved photographs,
 * archival documents and timeline links (the Imagery list is empty until photos are approved).
 */
export function ShipComponentPanel({ component: c, configuration, number, onClear, onInspect }: Props) {
  const { t, lang } = useLang();
  const ms = lang === 'ms';
  if (!c) {
    return (
      <div className="s3d-panel s3d-panel--empty" aria-live="polite">
        <p className="muted">{t('s3d_select_hint')}</p>
      </div>
    );
  }
  return (
    <article className="s3d-panel" aria-live="polite" aria-labelledby="s3d-panel-title">
      <header className="s3d-panel__head">
        <span className="s3d-marker s3d-marker--static s3d-marker--selected" aria-hidden="true">{number}</span>
        <div>
          <p className="s3d-panel__group mono">{c.Group} · {c.Component_ID}</p>
          <h3 id="s3d-panel-title">{componentName(c, ms)}</h3>
          {ms && c.Name_MS && c.Name_MS !== c.Name && <p className="s3d-panel__alt">{c.Name}</p>}
        </div>
        <button type="button" className="s3d-panel__close" onClick={onClear} aria-label={t('s3d_clear')} title={t('s3d_clear')}><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="s3d-panel__badges">
        <VerificationBadge status={c.Verification} />
        {c.Config !== 'shared' && configuration && <span className="s3d-panel__cfg">{(ms && configuration.Label_MS) || configuration.Label}</span>}
        {c.Model_Status && <span className="s3d-panel__status" title={t('s3d_model_status')}>{t('s3d_model_status')}: {t(STATUS_KEY[c.Model_Status])}</span>}
      </div>
      {onInspect && <button type="button" className="btn btn--small btn--ink s3d-panel__inspect" onClick={onInspect}><DoorOpen size={15} aria-hidden="true" /> {t('s3d_look_inside')}</button>}
      <p className="s3d-panel__desc">{c.Description}</p>
      <dl className="s3d-panel__facts">
        {c.Function && (<div><dt>{t('s3d_function')}</dt><dd>{c.Function}</dd></div>)}
        {c.History && (<div><dt>{t('s3d_history')}</dt><dd>{c.History}</dd></div>)}
        <div><dt>{t('s3d_in_model')}</dt><dd>{c.Model_Accuracy}</dd></div>
        {c.Related_Space_ID && (
          <div><dt>{t('s3d_related_space')}</dt><dd><Link className="text-link" to={`/onboard?component=${c.Related_Space_ID}`}>{t('s3d_open_space')} ({c.Related_Space_ID})</Link></dd></div>
        )}
        <div><dt>{t('s3d_imagery')}</dt><dd className="muted">{c.Imagery.filter((i) => i.Approved).length ? c.Imagery.filter((i) => i.Approved).map((i) => i.Caption).join('; ') : t('s3d_no_imagery')}</dd></div>
      </dl>
      <div className="s3d-panel__sources">
        <span className="field__label">{t('sources')}</span>
        <SourceRefs ids={c.Source_IDs} />
      </div>
    </article>
  );
}
