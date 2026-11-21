import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { loadShipExterior, type ShipExterior } from './exteriorData';
import { Ship3DExplorer, hasWebGL } from './Ship3DExplorer';
import './ship3d.css';

/**
 * The 3D Ship Explorer section of The Ship page. Its data and the 3D model load only when the
 * section approaches the viewport, and rendering pauses while it is off screen, so the rest of
 * the page never waits for it.
 */
export function Ship3DSection() {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [data, setData] = useState<ShipExterior | null>(null);
  const [failed, setFailed] = useState(false);
  const webgl = useMemo(() => hasWebGL(), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); setOnScreen(true); return; }
    const pre = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { setNear(true); pre.disconnect(); } }, { rootMargin: '600px 0px' });
    const vis = new IntersectionObserver((e) => setOnScreen(e.some((x) => x.isIntersecting)), { rootMargin: '100px 0px' });
    pre.observe(el); vis.observe(el);
    return () => { pre.disconnect(); vis.disconnect(); };
  }, []);

  useEffect(() => {
    if (!near) return;
    const ctl = new AbortController();
    loadShipExterior(ctl.signal).then(setData, (e) => { if ((e as Error).name !== 'AbortError') setFailed(true); });
    return () => ctl.abort();
  }, [near]);

  return (
    <section ref={ref} className="section on-offwhite s3d-section" aria-labelledby="s3d-title" id="explorer-3d">
      <div className="wrap">
        <header className="s3d-head">
          <h2 id="s3d-title">{t('s3d_title')}</h2>
          <p className="lede">{t('s3d_intro')}</p>
        </header>
        {data ? (
          <Ship3DExplorer data={data} webgl={webgl} active={onScreen} />
        ) : (
          <div className="s3d-stage s3d-stage--placeholder">
            <div className={`s3d-overlay${failed ? ' s3d-overlay--error' : ''}`} role={failed ? 'alert' : 'status'}>
              {!failed && <span className="s3d-spinner" aria-hidden="true" />}
              {failed ? t('s3d_error') : t('s3d_loading')}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
