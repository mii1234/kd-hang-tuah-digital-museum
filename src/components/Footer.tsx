import { Link } from 'react-router-dom';
import { useDataState } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import { NAV_ITEMS } from './nav';
import { formatPosition } from '../utils/geo';
import './Footer.css';

export function Footer() {
  const { t } = useLang();
  const { state } = useDataState();
  const content = state.status === 'ready' ? state.data.content : null;
  const coords = content?.Home_Coordinates;
  return (
    <footer className="site-footer on-dark">
      <div className="wrap site-footer__grid">
        <div className="site-footer__about">
          <p className="site-footer__name">{content?.Institution_Name ?? 'KD Hang Tuah Digital Maritime Museum'}</p>
          {content?.Institution_Note && <p className="muted">{content.Institution_Note}</p>}
          {coords && (
            <p className="mono site-footer__coords">
              {coords.Label} — {formatPosition(coords.Latitude, coords.Longitude)}
            </p>
          )}
        </div>
        <nav aria-label={t('footer_nav')}>
          <h2 className="site-footer__heading">{t('footer_nav')}</h2>
          <ul>
            {NAV_ITEMS.map((n) => (
              <li key={n.to}><Link to={n.to}>{t(n.key)}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="site-footer__heading">{t('footer_data')}</h2>
          <ul>
            <li><Link to="/sources">{t('methodology')}</Link></li>
            <li><Link to="/sources#register">{t('source_list')}</Link></li>
            <li><Link to="/sources#data-checks">{t('data_health')}</Link></li>
          </ul>
          <p className="muted site-footer__small">{t('footer_built')}</p>
        </div>
      </div>
    </footer>
  );
}
