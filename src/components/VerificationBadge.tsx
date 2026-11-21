import { CircleCheck, CircleHelp, Shapes, Split } from 'lucide-react';
import type { Verification } from '../data/types';
import { useLang } from '../i18n/LanguageContext';
import './VerificationBadge.css';

const ICONS = {
  Verified: CircleCheck,
  'Needs Verification': CircleHelp,
  Illustrative: Shapes,
  Disputed: Split,
} as const;

const SLUG = {
  Verified: 'verified',
  'Needs Verification': 'needs',
  Illustrative: 'illustrative',
  Disputed: 'disputed',
} as const;

interface Props {
  status: Verification;
  demo?: boolean;
  size?: 'sm' | 'md';
  showHelp?: boolean;
}

/** Status is always shown as icon + words, never colour alone. */
export function VerificationBadge({ status, demo, size = 'sm', showHelp = false }: Props) {
  const { vLabel, vHelp, t } = useLang();
  const Icon = ICONS[status] ?? CircleHelp;
  return (
    <span className={`vbadge-group vbadge-group--${size}`}>
      <span className={`vbadge vbadge--${SLUG[status] ?? 'needs'}`} title={vHelp(status)}>
        <Icon aria-hidden="true" size={size === 'sm' ? 13 : 15} strokeWidth={2} />
        <span>{vLabel(status)}</span>
      </span>
      {demo && <DemoTag />}
      {showHelp && <span className="vbadge__help">{vHelp(status)}{demo ? ` ${t('demo_title')}.` : ''}</span>}
    </span>
  );
}

export function DemoTag() {
  const { t } = useLang();
  return (
    <span className="demo-tag" title={t('demo_title')}>
      <span aria-hidden="true">{t('demo')}</span>
      <span className="visually-hidden">{t('demo_title')}</span>
    </span>
  );
}
