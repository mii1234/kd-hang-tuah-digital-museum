import { useEffect, useState } from 'react';
import { assetUrl } from '../utils/assets';
import { useLang } from '../i18n/LanguageContext';
import './ImageFrame.css';

interface Props {
  src?: string | null;
  alt: string;
  caption?: string;
  credit?: string;
  ratio?: string; // CSS aspect-ratio, e.g. "4 / 3"
  eager?: boolean;
  tone?: 'paper' | 'dark';
  className?: string;
  showCaption?: boolean;
  onOpen?: () => void;
  sizes?: string;
}

/**
 * Every photograph goes through this component. If the file is missing or fails to load,
 * a labelled placeholder appears in the same space (no broken-image icon, no layout jump),
 * and it tells the editor which file path to supply.
 */
export function ImageFrame({ src, alt, caption, credit, ratio = '4 / 3', eager, tone = 'paper', className = '', showCaption = false, onOpen, sizes }: Props) {
  const { t } = useLang();
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  const body = failed ? (
    <div className={`imgframe__placeholder imgframe__placeholder--${tone}`} role="img" aria-label={`${alt}. ${t('photo_pending')}.`}>
      <svg className="imgframe__mark" viewBox="0 0 120 40" aria-hidden="true">
        <path d="M4 26 L112 26 L104 34 L14 34 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M30 26 L30 19 L52 19 L52 13 L66 13 L66 19 L82 19 L82 26" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M59 13 L59 4 M54 7 L64 7" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M0 38 Q10 35 20 38 T40 38 T60 38 T80 38 T100 38 T120 38" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      </svg>
      <span className="imgframe__ph-title">{caption || t('photo_pending')}</span>
      {src && (
        <span className="imgframe__ph-path">
          {t('photo_pending_path')} <code>public{src.startsWith('/') ? src : `/${src}`}</code>
        </span>
      )}
    </div>
  ) : (
    <img
      src={assetUrl(src)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={loaded ? 'is-loaded' : ''}
    />
  );

  const media = onOpen && !failed ? (
    <button type="button" className="imgframe__media imgframe__button" style={{ aspectRatio: ratio }} onClick={onOpen} aria-label={`${alt} — open larger view`}>
      {body}
    </button>
  ) : (
    <div className="imgframe__media" style={{ aspectRatio: ratio }}>{body}</div>
  );

  return (
    <figure className={`imgframe ${className}`}>
      {media}
      {showCaption && (caption || credit) && !failed && (
        <figcaption className="imgframe__caption">
          {caption && <span>{caption}</span>}
          <span className="imgframe__credit">{credit ? `${t('credit')}: ${credit}` : t('no_credit')}</span>
        </figcaption>
      )}
    </figure>
  );
}
