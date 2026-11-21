import { Link } from 'react-router-dom';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import './SourceRefs.css';

/** Compact source line for page text that makes historical statements (site_content.json → Page_Text_Sources). */
export function PageSources({ textKey }: { textKey: string }) {
  const { content, sourceById } = useMuseum();
  const { t } = useLang();
  const ids = content.Page_Text_Sources?.[textKey] ?? [];
  if (!ids.length) return null;
  return (
    <p className="page-sources" data-text-key={textKey}>
      <span className="page-sources__label">{t('page_sources')}:</span>{' '}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          {sourceById.has(id) ? <Link to={`/sources#${id}`} className="mono page-sources__id" title={sourceById.get(id)?.Source_Title}>{id}</Link> : <span className="mono">{id}</span>}
        </span>
      ))}
    </p>
  );
}
