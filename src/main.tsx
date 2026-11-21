import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
// Fonts are bundled with the site (no external font service), so typography works offline.
import '@fontsource/libre-caslon-display/latin-400.css';
import '@fontsource/libre-caslon-text/latin-400.css';
import '@fontsource/libre-caslon-text/latin-400-italic.css';
import '@fontsource/libre-caslon-text/latin-700.css';
import '@fontsource/public-sans/latin-400.css';
import '@fontsource/public-sans/latin-500.css';
import '@fontsource/public-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/print.css';
import { App } from './App';
import { DataProvider } from './data/DataContext';
import { LanguageProvider } from './i18n/LanguageContext';

// HashRouter keeps every page and deep link working on any static host
// (GitHub Pages, a USB stick served by a simple web server, etc.) without server rewrites.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>,
);
