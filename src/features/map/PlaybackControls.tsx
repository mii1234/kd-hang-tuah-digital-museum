import { Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react';
import type { VoyageRoute } from './route';
import { fractionAtPoint, positionAt, lastStopIndex, nextStopIndex } from './route';
import { usePlaybackState, type PlaybackStore } from './playback';
import { SPEEDS } from './mapConfig';
import { useLang } from '../../i18n/LanguageContext';
import { formatHistoricalDate } from '../../utils/dates';

interface Props {
  route: VoyageRoute;
  store: PlaybackStore;
  speed: number;
  onSpeed: (s: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onReplay: () => void;
  onReset: () => void;
  onSeek: (f: number) => void;
  onJumpToPoint: (index: number) => void;
  onFit: () => void;
  describe: (f: number) => string;
}

export function PlaybackControls(p: Props) {
  const { t, lang } = useLang();
  const s = usePlaybackState(p.store);
  const canAnimate = p.route.points.length >= 2;
  const pos = positionAt(p.route, s.progress);
  // "previous" goes to the start of the current stop if we are past it, otherwise the stop before
  const last = lastStopIndex(p.route, pos);
  const atLast = last !== null && pos.atPoint === last;
  const prevStop = atLast
    ? [...p.route.stops].reverse().find((i) => i < last!) ?? null
    : last;
  const nextStop = nextStopIndex(p.route, pos);

  let primary: { label: string; icon: typeof Play; action: () => void };
  if (s.status === 'playing') primary = { label: t('pause'), icon: Pause, action: p.onPause };
  else if (s.status === 'paused') primary = { label: t('resume'), icon: Play, action: p.onResume };
  else if (s.status === 'ended') primary = { label: t('replay'), icon: RotateCcw, action: p.onReplay };
  else primary = { label: t('play'), icon: Play, action: p.onPlay };
  const PrimaryIcon = primary.icon;

  const ticks = p.route.stops.map((i) => ({ i, f: fractionAtPoint(p.route, i) }));

  return (
    <div className="playback" role="group" aria-label={t('voyage')}>
      <div className="playback__scrub">
        <label htmlFor="voyage-scrubber" className="visually-hidden">{t('scrubber')}</label>
        <div className="playback__scrub-track">
          <input
            id="voyage-scrubber"
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(s.progress * 1000)}
            onChange={(e) => p.onSeek(Number(e.target.value) / 1000)}
            aria-valuetext={p.describe(s.progress)}
            disabled={!canAnimate}
            style={{ ['--fill' as string]: `${s.progress * 100}%` }}
          />
          <div className="playback__ticks" aria-hidden="true">
            {ticks.map(({ i, f }) => (
              <span key={i} style={{ left: `${f * 100}%` }} className={s.progress >= f - 0.001 ? 'is-passed' : ''} />
            ))}
          </div>
        </div>
        <div className="playback__ends mono" aria-hidden="true">
          <span>{formatHistoricalDate(p.route.voyage.Start_Date, null, lang)}</span>
          <span>{formatHistoricalDate(p.route.voyage.End_Date, null, lang)}</span>
        </div>
      </div>

      <div className="playback__buttons">
        <button type="button" className="icon-btn" onClick={() => prevStop !== null && p.onJumpToPoint(prevStop)} disabled={!canAnimate || prevStop === null} aria-label={t('previous_event')} title={t('previous_event')}>
          <SkipBack size={18} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn--primary playback__primary" onClick={primary.action} disabled={!canAnimate} aria-label={primary.label}>
          <PrimaryIcon size={18} aria-hidden="true" />
          <span>{primary.label}</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => nextStop !== null && p.onJumpToPoint(nextStop)} disabled={!canAnimate || nextStop === null} aria-label={t('next_event')} title={t('next_event')}>
          <SkipForward size={18} aria-hidden="true" />
        </button>
        <span className="playback__divider" aria-hidden="true" />
        <button type="button" className="btn btn--small btn--ghost" onClick={p.onReplay} disabled={!canAnimate || (s.progress === 0 && s.status !== 'ended')}>
          <RotateCcw size={15} aria-hidden="true" /> {t('replay')}
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={p.onReset} disabled={!canAnimate || (s.progress === 0 && s.status === 'idle')}>
          <Square size={13} aria-hidden="true" /> {t('reset')}
        </button>
        <div className="playback__speed">
          <label htmlFor="voyage-speed">{t('speed')}</label>
          <select id="voyage-speed" className="select" value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))}>
            {SPEEDS.map((sp) => <option key={sp} value={sp}>{sp}×</option>)}
          </select>
        </div>
        <button type="button" className="btn btn--small btn--ghost playback__fit" onClick={p.onFit}>
          <Maximize2 size={15} aria-hidden="true" /> {t('fit_route')}
        </button>
      </div>
      {!canAnimate && <p className="playback__note">{t('no_route')}</p>}
    </div>
  );
}
