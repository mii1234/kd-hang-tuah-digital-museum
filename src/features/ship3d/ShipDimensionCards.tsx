import { Ruler, RulerDimensionLine } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { VerificationBadge } from '../../components/VerificationBadge';
import { SourceRefs } from '../../components/SourceRefs';
import type { ExteriorDimension } from './exteriorData';

/** Recorded dimensions with their sources; says which ones have a line on the model and why. */
export function ShipDimensionCards({ dims }: { dims: ExteriorDimension[] }) {
  const { t, lang } = useLang();
  const ms = lang === 'ms';
  return (
    <section className="s3d-dims" aria-labelledby="s3d-dims-title">
      <h3 id="s3d-dims-title">{t('s3d_dimensions')}</h3>
      <ul className="s3d-dims__list">
        {dims.map((d) => (
          <li key={d.Key} className="s3d-dims__card" data-key={d.Key}>
            <p className="s3d-dims__label">{(ms && d.Label_MS) || d.Label}</p>
            <p className="s3d-dims__value">{d.Display}</p>
            <p className="s3d-dims__line">
              {d.Line ? <RulerDimensionLine size={14} aria-hidden="true" /> : <Ruler size={14} aria-hidden="true" />}
              {d.Line ? t('s3d_line_shown') : t('s3d_no_line')}
            </p>
            <VerificationBadge status={d.Verification} />
            <p className="s3d-dims__note">{(ms && d.Mapping_Note_MS) || d.Mapping_Note}</p>
            <SourceRefs ids={d.Source_IDs} />
          </li>
        ))}
      </ul>
    </section>
  );
}
