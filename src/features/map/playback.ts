import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { DWELL_MS, MAX_DURATION_S, MIN_DURATION_S, NM_PER_SECOND } from './mapConfig';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface PlaybackState {
  progress: number; // 0..1 by distance along the route
  status: PlaybackStatus;
  dwelling: boolean;
}

/**
 * A tiny external store. The animation loop writes to it every frame; the ship layer and
 * the information panel subscribe. Keeping it outside React state means the map layers do
 * not re-render on each frame.
 */
class PlaybackStore {
  private state: PlaybackState = { progress: 0, status: 'idle', dwelling: false };
  private listeners = new Set<() => void>();
  get = () => this.state;
  set = (patch: Partial<PlaybackState>) => {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  };
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  };
}

export type { PlaybackStore };

interface Options {
  totalNm: number;
  stopFractions: number[]; // where to dwell (named ports), 0..1
  speed: number;
  reducedMotion: boolean;
}

export function usePlayback({ totalNm, stopFractions, speed, reducedMotion }: Options) {
  const store = useMemo(() => new PlaybackStore(), []);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);
  const dwellLeft = useRef(0);
  const opts = useRef({ totalNm, stopFractions, speed, reducedMotion });
  opts.current = { totalNm, stopFractions, speed, reducedMotion };

  const durationMs = useCallback(() => {
    const s = Math.min(MAX_DURATION_S, Math.max(MIN_DURATION_S, opts.current.totalNm / NM_PER_SECOND));
    return s * 1000;
  }, []);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    last.current = null;
  }, []);

  const tick = useCallback((now: number) => {
    const { speed: sp, stopFractions: stops, reducedMotion: reduced } = opts.current;
    const prevTime = last.current ?? now;
    const dt = Math.min(now - prevTime, 100); // avoid jumps after a hidden tab
    last.current = now;
    const s = store.get();
    if (s.status !== 'playing') { stop(); return; }

    if (dwellLeft.current > 0) {
      dwellLeft.current -= dt * sp;
      if (dwellLeft.current <= 0) store.set({ dwelling: false });
      raf.current = requestAnimationFrame(tick);
      return;
    }

    let next: number;
    if (reduced) {
      // Reduced motion: step from port to port instead of gliding.
      const upcoming = stops.find((f) => f > s.progress + 1e-6);
      next = upcoming ?? 1;
      dwellLeft.current = DWELL_MS * 1.8;
    } else {
      next = s.progress + (dt * sp) / durationMs();
      const crossed = stops.find((f) => f > s.progress + 1e-6 && f <= next);
      if (crossed !== undefined && crossed < 1) {
        next = crossed;
        dwellLeft.current = DWELL_MS;
      }
    }
    if (next >= 1) {
      store.set({ progress: 1, status: 'ended', dwelling: false });
      stop();
      return;
    }
    store.set({ progress: next, dwelling: dwellLeft.current > 0 });
    raf.current = requestAnimationFrame(tick);
  }, [durationMs, stop, store]);

  const start = useCallback(() => {
    stop();
    store.set({ status: 'playing' });
    raf.current = requestAnimationFrame(tick);
  }, [stop, store, tick]);

  const api = useMemo(() => ({
    play: () => {
      if (store.get().status === 'ended') store.set({ progress: 0 });
      dwellLeft.current = 0;
      start();
    },
    pause: () => {
      stop();
      store.set({ status: 'paused', dwelling: false });
    },
    resume: () => start(),
    replay: () => {
      dwellLeft.current = 0;
      store.set({ progress: 0, dwelling: false });
      start();
    },
    reset: () => {
      stop();
      dwellLeft.current = 0;
      store.set({ progress: 0, status: 'idle', dwelling: false });
    },
    /** Jump to a fraction. Playback pauses so the viewer can read the record. */
    seek: (f: number, keepPlaying = false) => {
      const wasPlaying = store.get().status === 'playing';
      stop();
      dwellLeft.current = 0;
      const progress = Math.min(Math.max(f, 0), 1);
      const status: PlaybackStatus = progress >= 1 ? 'ended' : keepPlaying && wasPlaying ? 'playing' : progress === 0 && store.get().status === 'idle' ? 'idle' : 'paused';
      store.set({ progress, status, dwelling: false });
      if (status === 'playing') start();
    },
  }), [start, stop, store]);

  // Stop the loop when the component unmounts.
  useEffect(() => stop, [stop]);

  return useMemo(() => ({ store, ...api }), [store, api]);
}

export function usePlaybackState(store: PlaybackStore): PlaybackState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
