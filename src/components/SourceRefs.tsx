import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMuseum } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';
import './SourceRefs.css';

/** Lists the sources attached to a record. Broken or missing links never render as links. */
export function SourceRefs({ ids, extraUrl }: { ids?: string[]; extraUrl?: string }) {
  const { sourceById } = useMuseum();
  const { t } = useLang();
  const list = (ids ?? []).map((id) => ({ id, src: sourceById.get(id) }));
  if (!list.length && !extraUrl) return <p className="source-refs__none">{t('no_sources')}</p>;
  return (
    <ul className="source-refs">
      {list.map(({ id, src }) => (
        <li key={id}>
          {src ? (
            <>
              <Link to={`/sources#${id}`} className="source-refs__title">{src.Source_Title}</Link>
              <span className="source-refs__meta">
                <span className="mono">{id}</span>
                {src.Author_or_Organisation && <span>{src.Author_or_Organisation}</span>}
                {src.Is_Placeholder && <em>{t('placeholder_source')}</em>}
              </span>
              {src.Source_URL && (
                <a href={src.Source_URL} target="_blank" rel="noopener noreferrer" className="text-link">
                  {t('view_source')} <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </>
          ) : (
            <span className="source-refs__meta"><span className="mono">{id}</span> <em>not found in sources.json</em></span>
          )}
        </li>
      ))}
      {extraUrl && (
        <li>
          <a href={extraUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            {t('view_source')} <ExternalLink size={13} aria-hidden="true" />
          </a>
        </li>
      )}
    </ul>
  );
}
