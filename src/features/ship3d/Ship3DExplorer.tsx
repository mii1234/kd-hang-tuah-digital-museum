import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useMuseum } from '../../data/DataContext';
import { useLang } from '../../i18n/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { assetUrl } from '../../utils/assets';
import { SPACE_VIEWS, checkShipExterior, componentsFor, dimensionAnchors, selectionAfterConfigChange, type CameraView, type ConfigId, type Display, type ScreenAnchor, type ShipExterior, type SpaceId, type ViewMode } from './exteriorData';
import type { CameraApi } from './ShipCameraControls';
import type { ModelAnchor } from './ShipModel';
import { ShipViewMode } from './ShipViewMode';
import { ShipComponentList, componentName } from './ShipComponentList';
import { ShipComponentPanel } from './ShipComponentPanel';
import { ShipDimensionCards } from './ShipDimensionCards';

// three.js and React Three Fiber load only when the explorer is shown on a device that supports WebGL.
const ShipCanvas = lazy(() => import('./ShipCanvas'));

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

interface Props { data: ShipExterior; webgl: boolean; active: boolean }

export function Ship3DExplorer({ data: raw, webgl, active }: Props) {
  const { t, lang } = useLang();
  const { sources } = useMuseum();
  const ms = lang === 'ms';
  const reducedMotion = useReducedMotion();

  // Components that fail the Verified-First rules are not shown.
  const data = useMemo<ShipExterior>(() => {
    const bad = new Set(checkShipExterior(raw, sources).map((i) => i.id));
    return { ...raw, Components: raw.Components.filter((c) => !bad.has(c.Component_ID)), Dimensions: raw.Dimensions.filter((d) => !bad.has(d.Key)) };
  }, [raw, sources]);

  const [mode, setMode] = useState<ViewMode>('realistic');
  const [config, setConfig] = useState<ConfigId>(data.Model.Default_Configuration ?? 'later');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Technical view display; the Realistic view always shows the exterior.
  const [displayPref, setDisplayPref] = useState<Display>('exterior');
  const display: Display = mode === 'technical' ? displayPref : 'exterior';
  // Phase 3: a space inspected from the inside (null: the full ship).
  const [inspect, setInspect] = useState<SpaceId | null>(null);
  const [switchedConfig, setSwitchedConfig] = useState(false);
  const spaces = useMemo(() => (data.Spaces ?? []).filter((sp) => data.Components.some((c) => c.Component_ID === sp.Component_ID)), [data]);
  const space = spaces.find((sp) => sp.Space_ID === inspect) ?? null;
  // Markers are off by default in Realistic view (an unobstructed ship) and on in Technical view.
  const [labelPref, setLabelPref] = useState<Record<ViewMode, boolean>>({ realistic: false, technical: true });
  const labels = labelPref[mode];
  const setLabels = (v: boolean) => setLabelPref((p) => ({ ...p, [mode]: v }));
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(webgl ? 'loading' : 'error');
  const [anchors, setAnchors] = useState<Map<string, ModelAnchor>>(new Map());
  const cameraRef = useRef<CameraApi>(null);
  const labelEls = useRef<Map<string, HTMLElement>>(new Map());

  const visible = useMemo(() => componentsFor(data, config, display, inspect), [data, config, display, inspect]);
  const otherConfig = useMemo(() => (inspect ? 0 : componentsFor(data, config === 'later' ? 'as_built' : 'later', display).filter((c) => c.Config !== 'shared').length), [data, config, display, inspect]);
  const numbers = useMemo(() => new Map(data.Components.map((c, i) => [c.Component_ID, i + 1])), [data]);
  const meshToComponent = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of data.Components) for (const mesh of c.Meshes) m.set(mesh, c.Component_ID);
    return m;
  }, [data]);
  const anchorMeshes = useMemo(() => new Map(data.Components.filter((c) => c.Anchor_Meshes?.length).map((c) => [c.Component_ID, c.Anchor_Meshes!])), [data]);
  const selected = visible.find((c) => c.Component_ID === selectedId) ?? null;
  const configuration = data.Configurations.find((c) => c.Config_ID === config);

  const onReady = useCallback((a: Map<string, ModelAnchor>) => { setAnchors(a); setStatus('ready'); }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    const a = id ? anchors.get(id) : undefined;
    if (!a) return;
    if (inspect) cameraRef.current?.frame(a.center, new THREE.Vector3(...SPACE_VIEWS[inspect].dir), Math.max(3.2, a.size * 2.4));
    else cameraRef.current?.focus(a.center as THREE.Vector3, a.size);
  }, [anchors, inspect]);

  // Inspect a space from the inside, or return to the full ship.
  const changeInspect = useCallback((sp: SpaceId | null) => {
    setSelectedId(null);
    setInspect(sp);
    if (!sp) { setSwitchedConfig(false); cameraRef.current?.reset(); return; }
    // Interiors are reconstructed from 2026 photographs: they belong to the later configuration.
    if (config !== 'later') { setConfig('later'); setSwitchedConfig(true); }
    setLabelPref((p) => ({ ...p, [mode]: true }));
    const v = SPACE_VIEWS[sp];
    cameraRef.current?.frame(new THREE.Vector3(...v.center), new THREE.Vector3(...v.dir), v.distance);
  }, [config, mode]);

  const changeDisplay = (d: Display) => {
    if (inspect) changeInspect(null);
    setDisplayPref(d);
    // A conceptual internal part cannot stay selected once the internal view is closed.
    setSelectedId((cur) => (cur && !componentsFor(data, config, d).some((c) => c.Component_ID === cur) ? null : cur));
  };
  const changeMode = (m: ViewMode) => {
    setMode(m);
    if (m === 'realistic') setSelectedId((cur) => (cur && !componentsFor(data, config, 'exterior').some((c) => c.Component_ID === cur) ? null : cur));
  };

  const changeConfig = (c: ConfigId) => {
    // The interiors are not part of the 1977 configuration: choosing it returns to the full ship.
    if (inspect && c !== 'later') { setInspect(null); setSwitchedConfig(false); cameraRef.current?.reset(); }
    setConfig(c);
    setSelectedId((cur) => selectionAfterConfigChange(data, cur, c));
  };

  // Markers: the internal displays mark only their conceptual parts; minor parts (railings, ladders, fittings)
  // have no marker, to keep the view uncluttered.
  const markerParts = useMemo(() => {
    const layer = inspect ? ['interior'] : display === 'internal' ? ['structural', 'internal'] : display === 'structural' ? ['structural'] : ['exterior'];
    return visible.filter((c) => c.Marker !== false && layer.includes(c.Layer ?? 'exterior'));
  }, [visible, display, inspect]);

  // Hotspot markers sit just above each visible component; dimension labels sit on their lines.
  const labelAnchors = useMemo(() => {
    const out: ScreenAnchor[] = [];
    const lift = inspect ? 0.35 : 1.2; // interior parts are small and close to the camera
    if (labels) for (const c of markerParts) { const a = anchors.get(c.Component_ID); if (a) out.push({ key: `c:${c.Component_ID}`, position: [a.top.x, a.top.y + lift, a.top.z] }); }
    if (mode === 'technical' && display === 'exterior' && !inspect) out.push(...dimensionAnchors(data.Dimensions));
    return out;
  }, [labels, markerParts, anchors, mode, display, inspect, data.Dimensions]);

  const setEl = (key: string) => (el: HTMLElement | null) => { if (el) labelEls.current.set(key, el); else labelEls.current.delete(key); };

  const onKey = (e: React.KeyboardEvent) => {
    const cam = cameraRef.current;
    if (!cam) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => cam.rotate(-15), ArrowRight: () => cam.rotate(15), ArrowUp: () => cam.rotate(0, -8), ArrowDown: () => cam.rotate(0, 8),
      '+': () => cam.zoom(0.8), '=': () => cam.zoom(0.8), '-': () => cam.zoom(1.25), r: () => cam.reset(), R: () => cam.reset(),
      Escape: () => { if (inspect) changeInspect(null); },
    };
    const fn = keys[e.key];
    if (fn) { e.preventDefault(); fn(); }
  };

  useEffect(() => { document.body.style.cursor = hoverId ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hoverId]);

  const disabled = status !== 'ready';
  const fallbackText = webgl ? t('s3d_error') : t('s3d_no_webgl');

  return (
    <div className={`s3d s3d--${mode} s3d--display-${display}${inspect ? ' s3d--inspecting' : ''}`}>
      <ShipViewMode
        mode={mode} onMode={changeMode} config={config} configurations={data.Configurations} onConfig={changeConfig}
        display={displayPref} onDisplay={changeDisplay} labels={labels} onLabels={setLabels} disabled={disabled}
        onView={(v: CameraView) => cameraRef.current?.view(v)} onZoom={(f) => cameraRef.current?.zoom(f)}
        onRotate={(d) => cameraRef.current?.rotate(d)} onReset={() => (inspect ? changeInspect(inspect) : cameraRef.current?.reset())}
        spaces={spaces} inspect={inspect} onInspect={changeInspect}
      />
      <p className="s3d-config__desc">{(ms && configuration?.Description_MS) || configuration?.Description}</p>

      <div className="s3d-stage-wrap">
        <div
          className="s3d-stage"
          tabIndex={webgl ? 0 : -1}
          role="application"
          aria-label={t('s3d_canvas_label')}
          aria-describedby="s3d-help"
          onKeyDown={onKey}
        >
          {webgl && status !== 'error' && (
            <CanvasBoundary onError={() => setStatus('error')} fallback={null}>
              <Suspense fallback={null}>
                <ShipCanvas
                  ref={cameraRef}
                  modelUrl={assetUrl(data.Model.File)}
                  config={config} mode={mode} display={display} inspect={inspect} selectedId={selectedId}
                  meshToComponent={meshToComponent} anchorMeshes={anchorMeshes} dimensions={data.Dimensions}
                  labelAnchors={labelAnchors} labelElements={labelEls}
                  reducedMotion={reducedMotion} active={active}
                  onSelect={(id) => select(id)} onHover={setHoverId} onReady={onReady}
                />
              </Suspense>
            </CanvasBoundary>
          )}

          {/* Screen-space labels, positioned by ShipHotspots */}
          <div className="s3d-labels" aria-hidden="true">
            {labels && markerParts.map((c) => anchors.has(c.Component_ID) && (
              <button
                key={c.Component_ID} ref={setEl(`c:${c.Component_ID}`)} type="button" tabIndex={-1}
                className={`s3d-marker${selectedId === c.Component_ID ? ' s3d-marker--selected' : ''}${hoverId === c.Component_ID ? ' s3d-marker--hover' : ''}`}
                title={componentName(c, ms)} onClick={() => select(c.Component_ID)}
              >
                {numbers.get(c.Component_ID)}
                {(selectedId === c.Component_ID || hoverId === c.Component_ID) && <span className="s3d-marker__text">{componentName(c, ms)}</span>}
              </button>
            ))}
            {mode === 'technical' && display === 'exterior' && !inspect && data.Dimensions.filter((d) => d.Line).map((d) => (
              <span key={d.Key} ref={setEl(`d:${d.Key}`)} className="s3d-dimlabel">{((ms && d.Label_MS) || d.Label).replace(/ \(.*\)$/, '')}: {d.Display}</span>
            ))}
          </div>

          {status === 'loading' && webgl && <div className="s3d-overlay" role="status"><span className="s3d-spinner" aria-hidden="true" />{t('s3d_loading')}</div>}
          {status === 'error' && <div className="s3d-overlay s3d-overlay--error" role="alert">{fallbackText}</div>}
          <p className="s3d-stage__badge">{t('s3d_approx')}</p>
          {space && (
            <div className="s3d-internal-note s3d-inspect-note" role="note">
              <span className="s3d-inspect-note__text">
                <span className="s3d-inspect-note__title">{t('s3d_inspecting', { name: (ms && space.Name_MS) || space.Name })}</span>
                <span>{(ms && space.Note_MS) || space.Note}</span>
              </span>
              <button type="button" className="btn btn--small btn--ink" onClick={() => changeInspect(null)}>{t('s3d_back_full')}</button>
            </div>
          )}
          {!space && (display === 'structural' || display === 'internal') && (
            <div className="s3d-internal-note" role="note">
              <span>{t(display === 'internal' ? 's3d_internal_note' : 's3d_structural_note')}</span>
              <button type="button" className="btn btn--small btn--ink" onClick={() => changeDisplay('exterior')}>{t('s3d_close_internal')}</button>
            </div>
          )}
        </div>
        <p id="s3d-help" className="s3d-help muted">{t('s3d_controls_help')}</p>
        {space && <p className="s3d-note s3d-note--inspect">{(ms && data.Interior_Note_MS) || data.Interior_Note}{switchedConfig ? ` ${t('s3d_inspect_switched')}` : ''}</p>}
        <p className="s3d-note">{(ms && data.Model.Note_MS) || data.Model.Note} {(ms && data.Comparison_Note_MS) || data.Comparison_Note}</p>
      </div>

      <div className="s3d-side">
        <ShipComponentPanel component={selected} configuration={configuration} number={selected ? numbers.get(selected.Component_ID) : undefined} onClear={() => select(null)}
          onInspect={!inspect && selected?.Inspect_Space && spaces.some((sp) => sp.Space_ID === selected.Inspect_Space) ? () => changeInspect(selected.Inspect_Space!) : undefined} />
        <ShipComponentList
          components={visible} hiddenCount={otherConfig} numbers={numbers}
          selectedId={selectedId} hoverId={hoverId} onSelect={(id) => select(id)}
        />
      </div>

      <ShipDimensionCards dims={data.Dimensions} />
      <p className="visually-hidden" aria-live="polite">{selected ? t('s3d_selected', { name: componentName(selected, ms) }) : ''}</p>
    </div>
  );
}
