import { lazy, Suspense } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { useLang } from './i18n/LanguageContext';

// Inner pages load on demand so the home page (and the map library) do not block each other.
const StoryPage = lazy(() => import('./pages/StoryPage').then((m) => ({ default: m.StoryPage })));
const VoyagePage = lazy(() => import('./pages/VoyagePage').then((m) => ({ default: m.VoyagePage })));
const ShipPage = lazy(() => import('./pages/ShipPage').then((m) => ({ default: m.ShipPage })));
const OnboardPage = lazy(() => import('./pages/OnboardPage').then((m) => ({ default: m.OnboardPage })));
const LegacyPage = lazy(() => import('./pages/LegacyPage').then((m) => ({ default: m.LegacyPage })));
const SourcesPage = lazy(() => import('./pages/SourcesPage').then((m) => ({ default: m.SourcesPage })));

function PageLoading() {
  const { t } = useLang();
  return (
    <div className="status-screen" role="status">
      <div>
        <div className="loading-line" aria-hidden="true" />
        <p className="muted">{t('loading')}</p>
      </div>
    </div>
  );
}

function NotFound() {
  const { t } = useLang();
  return (
    <div className="status-screen">
      <div>
        <h1>404</h1>
        <p>{t('not_found')}</p>
        <Link to="/" className="btn btn--ink">{t('back_home')}</Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/story" element={<StoryPage />} />
        <Route path="/voyage" element={<VoyagePage />} />
        <Route path="/ship" element={<ShipPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/legacy" element={<LegacyPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}
