import { create } from 'zustand';
import {
  ENVIRONMENT_IDS,
  isEnvironmentId,
  type CameraPose,
  type EnvironmentId,
} from '../scene/environments/contract.ts';
import { readPref, writePref } from './sessionPrefs.ts';

/**
 * The room (environment) and how it is viewed (ADR 0011, architecture 12).
 *
 * Written by the UI: `id` (picker, `?env=`), `pose` (Look around / Watch), `userFocus`.
 * Written by the scene: `loading` and `ready` while a room chunk loads (`setLoading`, `setReady`).
 * The scene keeps showing the previous room until it reports the new one ready.
 * The player rectangle is published through `playerStore` (`reportCorners`).
 */
interface EnvironmentState {
  id: EnvironmentId;
  /** browse: camera free, player hidden and paused. watch: static face-on camera, player shown. */
  pose: CameraPose;
  /** The viewer chose focus mode (player large, room dimmed behind). Automatic focus is separate. */
  userFocus: boolean;
  /** Set while the chosen room's chunk loads. `progress` is 0..1, real values only. */
  loading: { id: EnvironmentId; progress: number } | null;
  /** The scene reports true when `id` is built and visible. */
  ready: boolean;
  setEnvironment(id: EnvironmentId): void;
  setPose(pose: CameraPose): void;
  togglePose(): void;
  setFocus(value: boolean): void;
  toggleFocus(): void;
  setLoading(progress: number | null): void;
  setReady(value?: boolean): void;
}

export const DEFAULT_ENVIRONMENT: EnvironmentId = 'tv-room';

function initialId(): EnvironmentId {
  if (typeof window === 'undefined') return DEFAULT_ENVIRONMENT;
  // `?env=` wins (it is the share link), then the room remembered for this visit.
  const fromUrl = new URLSearchParams(window.location.search).get('env');
  if (isEnvironmentId(fromUrl)) return fromUrl;
  const stored = readPref('room');
  return isEnvironmentId(stored) ? stored : DEFAULT_ENVIRONMENT;
}

export const useEnvironmentStore = create<EnvironmentState>()((set, get) => ({
  id: initialId(),
  pose: 'watch',
  userFocus: typeof window === 'undefined' ? false : readPref('focus') === '1',
  loading: null,
  ready: false,
  setEnvironment(id) {
    if (!ENVIRONMENT_IDS.includes(id) || id === get().id) return;
    writePref('room', id === DEFAULT_ENVIRONMENT ? null : id);
    // Leaving a room always returns to the watch pose; the scene keeps the old room until `ready`.
    set({ id, pose: 'watch', ready: false, loading: { id, progress: 0 } });
  },
  setPose: (pose) => set({ pose }),
  togglePose: () => set((s) => ({ pose: s.pose === 'watch' ? 'browse' : 'watch' })),
  setFocus(value) {
    writePref('focus', value ? '1' : null);
    set({ userFocus: value });
  },
  toggleFocus: () => get().setFocus(!get().userFocus),
  setLoading: (progress) =>
    set((s) =>
      progress === null
        ? { loading: null }
        : { loading: { id: s.loading?.id ?? s.id, progress: Math.min(1, Math.max(0, progress)) } },
    ),
  setReady: (value = true) => set(value ? { ready: true, loading: null } : { ready: false }),
}));
