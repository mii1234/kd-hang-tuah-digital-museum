import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { useLang } from '../i18n/LanguageContext';
import { SearchDialog } from './SearchDialog';
import './Header.css';

export function Header() {
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
  }, [menuOpen]);

  const toggleLang = () => setLang(lang === 'en' ? 'ms' : 'en');

  return (
    <header className="site-header on-dark">
      <div className="site-header__inner wrap">
        <Link to="/" className="brand" aria-label="KD Hang Tuah — home">
          <span className="brand__name">KD Hang Tuah</span>
          <span className="brand__sub">{lang === 'ms' ? 'Muzium Maritim Digital' : 'Digital Maritime Museum'}</span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <ul>
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__tools">
          <button type="button" className="icon-btn" onClick={() => setSearchOpen(true)} aria-label={`${t('search')} (Ctrl+K)`}>
            <Search size={19} aria-hidden="true" />
          </button>
          <button type="button" className="lang-toggle" onClick={toggleLang} aria-label={t('language')} title={t('language')}>
            <span aria-hidden="true">{t('language_short')}</span>
          </button>
          <button
            type="button"
            className="icon-btn site-header__menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t('menu_close') : t('menu_open')}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav id="mobile-nav" className={`mobile-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main (mobile)" hidden={!menuOpen}>
        <ol className="wrap">
          {NAV_ITEMS.map((item, i) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-nav__link${isActive ? ' is-active' : ''}`}>
                <span className="mono mobile-nav__num">{String(i + 1).padStart(2, '0')}</span>
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ol>
      </nav>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
