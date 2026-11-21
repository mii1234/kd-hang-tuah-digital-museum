import { Images } from 'lucide-react';
import type { ShipComponent } from '../../data/types';
import { useLang } from '../../i18n/LanguageContext';
import { ImageFrame } from '../../components/ImageFrame';
import { VerificationBadge } from '../../components/VerificationBadge';

export function ComponentCard({ component, onOpen }: { component: ShipComponent; onOpen: () => void }) {
  const { t, cat, componentName } = useLang();
  const n = component.Image_URLs.length;
  return (
    <button type="button" className="comp-card" onClick={onOpen} aria-haspopup="dialog">
      <ImageFrame src={component.Image_URLs[0]} alt={componentName(component)} caption={componentName(component)} ratio="4 / 3" />
      <span className="comp-card__body">
        <span className="comp-card__cat">{cat(component.Category)}</span>
        <span className="comp-card__name">{componentName(component)}</span>
        {component.Ship_Section && <span className="comp-card__section">{t('component_section')}: {component.Ship_Section}</span>}
        <span className="comp-card__foot">
          <span className="comp-card__count"><Images size={14} aria-hidden="true" /> {n === 1 ? t('photo_count_one') : t('photos_count', { n })}</span>
          <VerificationBadge status={component.Verification} demo={component.Is_Demo_Data} />
        </span>
      </span>
    </button>
  );
}
