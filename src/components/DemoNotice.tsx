import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataState } from '../data/DataContext';
import { useContent } from '../hooks/useContent';
import { useLang } from '../i18n/LanguageContext';

/** Thin strip under the header while demonstration data is in use. Turn off with Show_Demo_Notice in site_content.json. */
export function DemoNotice() {
  const { state } = useDataState();
  const c = useContent();
  const { t } = useLang();
  if (state.status !== 'ready' || !state.data.content.Show_Demo_Notice) return null;
  return (
    <div className="demo-notice" role="note">
      <div className="wrap demo-notice__inner">
        <Info size={15} aria-hidden="true" />
        <span>{c('demo_notice')}</span>
        <Link to="/sources">{t('methodology')}</Link>
      </div>
    </div>
  );
}
