import type { ReactNode } from 'react';
import { useDataState } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';

export function DataGate({ children }: { children: ReactNode }) {
  const { state, reload } = useDataState();
  const { t } = useLang();
  if (state.status === 'loading') {
    return (
      <div className="status-screen" role="status" aria-live="polite">
        <div>
          <div className="loading-line" aria-hidden="true" />
          <p className="muted">{t('loading')}</p>
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="status-screen" role="alert">
        <div>
          <h1>{t('load_error_title')}</h1>
          <p>{state.message}</p>
          <button type="button" className="btn btn--ink" onClick={reload}>{t('retry')}</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
