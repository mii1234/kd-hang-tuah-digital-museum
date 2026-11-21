import { Box, DoorOpen, Minus, Plus, RotateCcw, RotateCw, Scan, Tag } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import type { CameraView, ConfigId, Display, ExteriorConfiguration, ShipSpace, SpaceId, ViewMode } from './exteriorData';

const VIEWS: CameraView[] = ['three_quarter', 'front', 'rear', 'side', 'top'];
const DISPLAYS: Display[] = ['exterior', 'wireframe', 'structural', 'internal'];

interface Props {
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  config: ConfigId;
  configurations: ExteriorConfiguration[];
  onConfig: (c: ConfigId) => void;
  display: Display;
  onDisplay: (d: Display) => void;
  labels: boolean;
  onLabels: (l: boolean) => void;
  disabled: boolean;
  onView: (v: CameraView) => void;
  onZoom: (f: number) => void;
  onRotate: (deg: number) => void;
  onReset: () => void;
  /** Phase 3: spaces that can be inspected from the inside. */
  spaces: ShipSpace[];
  inspect: SpaceId | null;
  onInspect: (s: SpaceId | null) => void;
}

/** Realistic / Technical switch, configuration selector and camera buttons. */
export function ShipViewMode(p: Props) {
  const { t, lang } = useLang();
  const ms = lang === 'ms';
  return (
    <div className="s3d-toolbar">
      <div className="s3d-toolbar__group" role="group" aria-label={t('s3d_mode')}>
        <span className="field__label">{t('s3d_mode')}</span>
        <div className="s3d-seg">
          <button type="button" className="s3d-seg__btn" aria-pressed={p.mode === 'realistic'} onClick={() => p.onMode('realistic')}><Box size={15} aria-hidden="true" /> {t('s3d_mode_realistic')}</button>
          <button type="button" className="s3d-seg__btn" aria-pressed={p.mode === 'technical'} onClick={() => p.onMode('technical')}><Scan size={15} aria-hidden="true" /> {t('s3d_mode_technical')}</button>
        </div>
      </div>

      <fieldset className="s3d-toolbar__group s3d-config">
        <legend className="field__label">{t('s3d_config')}</legend>
        <div className="s3d-seg s3d-seg--wrap">
          {p.configurations.map((c) => (
            <label key={c.Config_ID} className="s3d-seg__btn s3d-seg__radio" data-checked={p.config === c.Config_ID}>
              <input type="radio" name="s3d-config" value={c.Config_ID} checked={p.config === c.Config_ID} onChange={() => p.onConfig(c.Config_ID)} />
              <span>{(ms && c.Label_MS) || c.Label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="s3d-toolbar__group" role="group" aria-label={t('s3d_camera')}>
        <span className="field__label">{t('s3d_camera')}</span>
        <div className="s3d-views">
          {VIEWS.map((v) => (
            <button key={v} type="button" className="btn btn--small btn--ghost s3d-btn" disabled={p.disabled} onClick={() => p.onView(v)}>{t(`s3d_view_${v}`)}</button>
          ))}
          <span className="s3d-views__sep" aria-hidden="true" />
          <button type="button" className="btn btn--small btn--ghost s3d-icon" disabled={p.disabled} onClick={() => p.onRotate(-20)} aria-label={t('s3d_rotate_left')} title={t('s3d_rotate_left')}><RotateCcw size={15} aria-hidden="true" /></button>
          <button type="button" className="btn btn--small btn--ghost s3d-icon" disabled={p.disabled} onClick={() => p.onRotate(20)} aria-label={t('s3d_rotate_right')} title={t('s3d_rotate_right')}><RotateCw size={15} aria-hidden="true" /></button>
          <button type="button" className="btn btn--small btn--ghost s3d-icon" disabled={p.disabled} onClick={() => p.onZoom(0.75)} aria-label={t('s3d_zoom_in')} title={t('s3d_zoom_in')}><Plus size={15} aria-hidden="true" /></button>
          <button type="button" className="btn btn--small btn--ghost s3d-icon" disabled={p.disabled} onClick={() => p.onZoom(1.33)} aria-label={t('s3d_zoom_out')} title={t('s3d_zoom_out')}><Minus size={15} aria-hidden="true" /></button>
          <button type="button" className="btn btn--small btn--ink s3d-btn" disabled={p.disabled} onClick={p.onReset}>{t('s3d_reset')}</button>
        </div>
      </div>

      <div className="s3d-toolbar__group s3d-toggles">
        <label className="s3d-check"><input type="checkbox" checked={p.labels} onChange={(e) => p.onLabels(e.target.checked)} /> <Tag size={14} aria-hidden="true" /> {t('s3d_labels')}</label>
      </div>

      {p.spaces.length > 0 && (
        <div className="s3d-toolbar__group" role="group" aria-label={t('s3d_inside')}>
          <span className="field__label">{t('s3d_inside')}</span>
          <div className="s3d-spaces">
            {p.spaces.map((sp) => (
              <button key={sp.Space_ID} type="button" className="btn btn--small btn--ghost s3d-btn" aria-pressed={p.inspect === sp.Space_ID} disabled={p.disabled} onClick={() => p.onInspect(sp.Space_ID)}>
                <DoorOpen size={14} aria-hidden="true" /> {(ms && sp.Name_MS) || sp.Name}
              </button>
            ))}
            {p.inspect && <button type="button" className="btn btn--small btn--ink s3d-btn" onClick={() => p.onInspect(null)}>{t('s3d_back_full')}</button>}
          </div>
        </div>
      )}

      {p.mode === 'technical' && !p.inspect && (
        <div className="s3d-toolbar__group" role="group" aria-label={t('s3d_display')}>
          <span className="field__label">{t('s3d_display')}</span>
          <div className="s3d-seg s3d-seg--wrap">
            {DISPLAYS.map((d) => (
              <button key={d} type="button" className="s3d-seg__btn" aria-pressed={p.display === d} onClick={() => p.onDisplay(d)}>{t(`s3d_display_${d}`)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
