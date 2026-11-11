/**
 * v2 environment contract. Owner: architect. See docs/decisions/0011-environment-player.md §1 and §2.
 *
 * Every environment is a lazy chunk (`./<id>/index.tsx`, default export `EnvironmentModule`)
 * registered in `./registry.ts`. Each environment Scene renders exactly one screen anchor: an
 * Object3D whose local XY plane is the screen face, centred on the origin, with +Z towards the
 * viewer and size `screen.widthM` by `screen.widthM / screen.aspect` in scene units (metres).
 *
 * The YouTube player is a DOM iframe ABOVE the canvas, positioned from the anchor's projected
 * corners, and only in a static, face-on watch pose. Nothing WebGL may ever be drawn over it.
 */
import type { ComponentType } from 'react';

export const ENVIRONMENT_IDS = [
  'tv-room',
  'cinema',
  'drive-in',
  'open-air',
  'bedroom',
  'chai-stall',
  'train',
  'space-deck',
  'mountain-sky',
] as const;

export type EnvironmentId = (typeof ENVIRONMENT_IDS)[number];

export function isEnvironmentId(value: unknown): value is EnvironmentId {
  return typeof value === 'string' && (ENVIRONMENT_IDS as readonly string[]).includes(value);
}

/** browse: camera free, player hidden and paused. watch: camera static and face-on, player shown. */
export type CameraPose = 'browse' | 'watch';

export interface EnvironmentSceneProps {
  /** displayStore.reducedMotion: freeze every environment animation and camera move. */
  calm: boolean;
  pose: CameraPose;
  /**
   * The visitor's Colour/B&W choice, for information only (for example to skip colour-only
   * effects). The greyscale itself is a CSS filter on the canvas element; never filter in a shader.
   */
  colour: 'bw' | 'colour';
  /** Current channel. 0 = the Occupant (only tv-room renders it; others never receive 0). */
  channel: number;
}

export interface ScreenAnchorSpec {
  /** Player rectangle aspect, width / height. 16 / 9 everywhere except tv-room (4 / 3), design spec v2 §2.2. */
  aspect: number;
  /** Physical screen width in scene units (metres). */
  widthM: number;
  /**
   * Watch-pose target: player rect width as a fraction of the viewport width (design spec v2 §5,
   * 0.55 to 0.72 per room), then limited by the height rule in design spec v2 §2.2. Never above
   * WATCH_MAX_FILL.
   */
  fill: number;
  /** Horizontal placement of the rect in the watch pose (design spec v2 §5; tv-room and car differ). */
  align: 'centre' | 'left' | 'right';
  /** Vertical placement in the watch pose. Default 'centre'; 'upper' sits the rect high (mountain-sky). */
  vAlign?: 'centre' | 'upper';
}

/** Declared budget, checked by CI against the built chunk and the environment's asset folders. */
export interface EnvironmentBudget {
  /** This chunk's JS, gzip, excluding the shared three / R3F / drei core. Default 60. */
  jsGzipKb: number;
  /** Assets fetched on first entry, compressed transfer, on mobile. Default 1536. */
  assetKbMobile: number;
  /** Same, on desktop. Default 2048. */
  assetKbDesktop: number;
}

export interface EnvironmentModule {
  id: EnvironmentId;
  /** The scene. Must render exactly one <ScreenAnchor/> (scene-developer's component). */
  Scene: ComponentType<EnvironmentSceneProps>;
  screen: ScreenAnchorSpec;
  /** True only for tv-room, which keeps v1's teletext/CRT pipeline for channel 0. */
  hostsChannel0?: true;
}

/** Static, chunk-free metadata, so pickers can list environments without loading them. */
export interface EnvironmentEntry {
  id: EnvironmentId;
  /** Working label. Final copy comes from the design spec (ux-ui-designer). */
  label: string;
  budget: EnvironmentBudget;
  load: () => Promise<{ default: EnvironmentModule }>;
}

export const DEFAULT_BUDGET: EnvironmentBudget = {
  jsGzipKb: 60,
  assetKbMobile: 1536,
  assetKbDesktop: 2048,
};

/* ---------------- Watch-pose projection (ADR 0011 §1) ---------------- */

/** YouTube's hard minimum player size, CSS px. */
export const PLAYER_HARD_MIN = { width: 200, height: 200 } as const;
/** Minimum size for showing the player in the scene; below this, use focus mode. */
export const PLAYER_INLINE_MIN = { width: 480, height: 270 } as const;
/** The projected quad must be axis-aligned within this many CSS px to count as face-on. */
export const FACE_ON_TOLERANCE_PX = 1;
/** Largest fraction of the viewport (each axis) the watch pose may fill with the screen. */
export const WATCH_MAX_FILL = 0.85;

export interface Vec2 {
  x: number;
  y: number;
}

/** CSS px, relative to the stage's top-left corner. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Projected anchor corners in CSS px, in the order top-left, top-right, bottom-right, bottom-left. */
export type ScreenCorners = readonly [Vec2, Vec2, Vec2, Vec2];

export type PlayerPlacement =
  /** Show the iframe at `rect`, above the canvas. */
  | { kind: 'inline'; rect: Rect }
  /** Use the focus layout (player in DOM flow, environment as backdrop). */
  | { kind: 'focus'; reason: 'too-small' | 'phone' | 'user' | '2d' }
  /** Do not show the player (pose not settled, not face-on, or off screen). Keep it paused. */
  | { kind: 'hidden'; reason: 'not-face-on' | 'off-screen' | 'browse' };

/**
 * Implemented by the scene-developer (`ScreenProjector.ts`).
 * - `watchPose` returns the camera position and target that face the anchor head-on (camera
 *   translated parallel to the screen plane, no rotation), sized by `screen.fill` and `align`
 *   and the height rule of design spec v2 §2.2, never above WATCH_MAX_FILL on either axis.
 *   It must be a pure function of its inputs.
 * - `project` maps the anchor's four corners to CSS px with the current camera.
 * - The result of `project` goes through `classifyPlacement` (below), and the placement is
 *   written to the frontend's player store. Recompute on resize and when a pose tween ends,
 *   never every frame while watching (the watch pose is static).
 */
export interface WatchPoseSolver {
  watchPose(
    anchorWorld: { position: [number, number, number]; normal: [number, number, number] },
    screen: ScreenAnchorSpec,
    viewport: Viewport,
    fovDeg: number,
  ): { position: [number, number, number]; target: [number, number, number] };
}

export interface ScreenProjectorApi {
  project(): ScreenCorners | null;
}

/**
 * Decides where the player goes, from the projected corners. Pure; the single source of the
 * rules in ADR 0011 §1, shared by the scene and the frontend, and unit tested.
 */
export function classifyPlacement(
  corners: ScreenCorners | null,
  viewport: Viewport,
  options: { pose: CameraPose; phone: boolean; userFocus: boolean; mode2d: boolean },
): PlayerPlacement {
  if (options.mode2d) return { kind: 'focus', reason: '2d' };
  if (options.userFocus) return { kind: 'focus', reason: 'user' };
  if (options.phone) return { kind: 'focus', reason: 'phone' };
  if (options.pose === 'browse') return { kind: 'hidden', reason: 'browse' };
  if (!corners) return { kind: 'hidden', reason: 'not-face-on' };

  const [tl, tr, br, bl] = corners;
  const t = FACE_ON_TOLERANCE_PX;
  const aligned =
    Math.abs(tl.y - tr.y) <= t &&
    Math.abs(bl.y - br.y) <= t &&
    Math.abs(tl.x - bl.x) <= t &&
    Math.abs(tr.x - br.x) <= t &&
    tr.x > tl.x &&
    bl.y > tl.y;
  if (!aligned) return { kind: 'hidden', reason: 'not-face-on' };

  const x = Math.min(tl.x, bl.x);
  const y = Math.min(tl.y, tr.y);
  const rect: Rect = {
    x,
    y,
    width: Math.max(tr.x, br.x) - x,
    height: Math.max(bl.y, br.y) - y,
  };
  const inside =
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= viewport.width &&
    rect.y + rect.height <= viewport.height;
  if (!inside) return { kind: 'hidden', reason: 'off-screen' };

  if (rect.width < PLAYER_INLINE_MIN.width || rect.height < PLAYER_INLINE_MIN.height) {
    return { kind: 'focus', reason: 'too-small' };
  }
  return { kind: 'inline', rect };
}
