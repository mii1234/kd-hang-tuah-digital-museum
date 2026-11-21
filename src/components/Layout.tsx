import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { DemoNotice } from './DemoNotice';
import { DataGate } from './DataGate';
import { useLang } from '../i18n/LanguageContext';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // wait for the page to render, then scroll to the anchor
      const id = decodeURIComponent(hash.slice(1));
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 80);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useLang();
  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>{t('skip_link')}</a>
      <ScrollManager />
      <Header />
      <DemoNotice />
      <main id="main" tabIndex={-1}>
        <DataGate>
          {/* keyed by pathname so each page fades in on navigation; query changes do not re-trigger */}
          <div key={pathname} className="page-enter">{children}</div>
        </DataGate>
      </main>
      <Footer />
    </>
  );
}
