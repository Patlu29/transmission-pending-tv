import { create } from 'zustand';
import type { PlayerPlacement, ScreenCorners, Viewport } from '../scene/environments/contract.ts';

/** Classes of "no signal" (ADR 0011 section 4, design-spec v2 1.9). */
export type PlayerErrorClass =
  | 'garbled' /* code 2: bad ID */
  | 'fault' /* code 5: player error */
  | 'off-air' /* code 100: removed or private */
  | 'not-for-set' /* codes 101 and 150: embedding disallowed, or region */
  | 'unverified' /* code 153: missing referrer or client identity */
  | 'blocked'; /* no onReady within 8 s */

export type PlayerPhase =
  | 'none' /* no player, nothing chosen */
  | 'card' /* a site-drawn still card (Calm) waits for Play */
  | 'loading' /* iframe created or video requested, not yet playing */
  | 'playing'
  | 'paused'
  | 'error';

/**
 * Player state and placement (architecture 12.2).
 *
 * The SCENE publishes where the screen anchor is, in ONE of two ways (both optional):
 *   - `reportCorners(corners)`: the projected anchor corners in CSS px. The UI runs classifyPlacement.
 *   - `setPlacement(placement)`: a placement the scene already classified.
 * The UI turns either into the layout; focus mode, 2D and phones always win. If the scene publishes
 * nothing, the UI falls back to the focus layout, so the player is never lost.
 */
interface PlayerState {
  phase: PlayerPhase;
  error: PlayerErrorClass | null;
  /** The video id the player was last asked to play. */
  videoId: string | null;
  /** Video muted state (starts muted; mirrors the player). */
  muted: boolean;
  corners: ScreenCorners | null;
  scenePlacement: PlayerPlacement | null;
  /** Viewport the corners were projected for. */
  cornersViewport: Viewport | null;
  /** ScreenAnchorSpec.inset of the room's anchor (fraction cut from each edge of the projected glass), default 0. */
  inset: number;
  setPhase(phase: PlayerPhase): void;
  setError(error: PlayerErrorClass | null): void;
  setVideoId(id: string | null): void;
  setMuted(muted: boolean): void;
  reportCorners(corners: ScreenCorners | null, viewport?: Viewport, inset?: number): void;
  setPlacement(placement: PlayerPlacement | null): void;
  reset(): void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  phase: 'none',
  error: null,
  videoId: null,
  muted: true,
  corners: null,
  scenePlacement: null,
  cornersViewport: null,
  inset: 0,
  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  setVideoId: (videoId) => set({ videoId }),
  setMuted: (muted) => set((s) => (s.muted === muted ? s : { muted })),
  reportCorners: (corners, viewport, inset) =>
    set((s) => ({ corners, cornersViewport: viewport ?? null, inset: inset ?? s.inset })),
  setPlacement: (scenePlacement) => set({ scenePlacement }),
  reset: () => set({ phase: 'none', error: null, videoId: null, muted: true }),
}));
