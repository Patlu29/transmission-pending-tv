import {
  PLAYER_HARD_MIN,
  classifyPlacement,
  type CameraPose,
  type PlayerPlacement,
  type Rect,
  type ScreenCorners,
  type Viewport,
} from '../../scene/environments/contract.ts';

/**
 * Player layout (design-spec v2 2.2 to 2.4). Pure. The player rectangle is plain CSS pixels
 * relative to the stage; it never carries a transform. Panels, HUD, dock and info row are laid
 * out outside it.
 */
export const DOCK_PX = 64;
/** Desktop dock: bottom-centre, 24 px up, up to two rows of 44 px keys. */
export const DESKTOP_DOCK_PX = 128;
export const INFO_ROW_PX = 40;
export const FOCUS_HEADER_PX = 48;
export const PHONE_MIN_PLAYER_H = 240;
export const GAP_PX = 8;
export const PANEL_W_PX = 560;

export type ResolvedLayout =
  | { kind: 'inline'; rect: Rect; info: Rect }
  | { kind: 'focus'; rect: Rect; info: Rect; reason: string; landscape: boolean }
  | { kind: 'hidden'; reason: string };

export interface LayoutInput {
  viewport: Viewport;
  corners: ScreenCorners | null;
  scenePlacement: PlayerPlacement | null;
  pose: CameraPose;
  /** 3d-screen class viewport or `2d` mode: always the focus layout. */
  phone: boolean;
  mode2d: boolean;
  userFocus: boolean;
  /** `screen.inset ?? 0` of the room's anchor (see ScreenAnchorSpec). */
  inset?: number;
  /** Aspect of the room's screen (16/9; 4/3 for the TV room). The focus layout is always 16:9. */
  aspect?: number;
}

/** Landscape phone: a short, wide viewport where the dock becomes a right-hand strip. */
export function isLandscapeShort(v: Viewport): boolean {
  return v.height < 500 && v.width > v.height;
}

/**
 * Focus layout. Portrait: header, then the player full width (at least 240 px tall), then the info
 * row, the room dimmed behind. Landscape short: height fills the viewport, 16:9 width, dock on the
 * right. Desktop manual focus: the largest 16:9 rectangle that leaves the header, info row and dock.
 */
export function focusRect(v: Viewport): { rect: Rect; info: Rect; landscape: boolean } {
  if (isLandscapeShort(v)) {
    const height = Math.max(PLAYER_HARD_MIN.height, v.height - INFO_ROW_PX - GAP_PX * 2);
    const maxW = v.width - DOCK_PX - GAP_PX;
    const width = Math.min(maxW, height * (16 / 9));
    const x = Math.max(0, (v.width - DOCK_PX - width) / 2);
    const rect = { x, y: GAP_PX, width, height: Math.min(height, width * (9 / 16)) };
    return {
      rect,
      info: { x, y: rect.y + rect.height + GAP_PX, width, height: INFO_ROW_PX },
      landscape: true,
    };
  }
  const dock = v.width >= 1024 ? DESKTOP_DOCK_PX : DOCK_PX;
  const availH = v.height - FOCUS_HEADER_PX - 2 * INFO_ROW_PX - dock - GAP_PX * 3;
  let width = v.width;
  let height = width * (9 / 16);
  if (height > availH && availH >= PHONE_MIN_PLAYER_H) {
    height = availH;
    width = height * (16 / 9);
  }
  height = Math.max(height, PHONE_MIN_PLAYER_H);
  const x = Math.max(0, (v.width - width) / 2);
  const rect = { x, y: FOCUS_HEADER_PX, width, height };
  return {
    rect,
    info: { x: 0, y: rect.y + height + GAP_PX, width: v.width, height: 2 * INFO_ROW_PX },
    landscape: false,
  };
}

export function resolveLayout(input: LayoutInput): ResolvedLayout {
  const { viewport } = input;
  const forced = input.mode2d || input.phone || input.userFocus;
  let placement: PlayerPlacement;
  if (input.corners) {
    placement = classifyPlacement(input.corners, viewport, {
      pose: input.pose,
      phone: input.phone,
      userFocus: input.userFocus,
      mode2d: input.mode2d,
      inset: input.inset ?? 0,
    });
  } else if (input.scenePlacement && !forced) {
    placement = input.scenePlacement;
  } else if (forced) {
    placement = {
      kind: 'focus',
      reason: input.mode2d ? '2d' : input.phone ? 'phone' : 'user',
    };
  } else if (input.pose === 'browse') {
    placement = { kind: 'hidden', reason: 'browse' };
  } else {
    // The scene has published nothing yet: use the focus layout so the player is never lost.
    placement = { kind: 'focus', reason: 'too-small' };
  }

  if (placement.kind === 'hidden') return { kind: 'hidden', reason: placement.reason };
  if (placement.kind === 'inline') {
    const rect = placement.rect;
    return {
      kind: 'inline',
      rect,
      info: { x: rect.x, y: rect.y + rect.height + GAP_PX, width: rect.width, height: INFO_ROW_PX },
    };
  }
  const f = focusRect(viewport);
  return {
    kind: 'focus',
    rect: f.rect,
    info: f.info,
    reason: placement.reason,
    landscape: f.landscape,
  };
}

/** True when an open panel would cover the player: it is then paused and hidden (design-spec v2 2.3). */
export function panelCoversPlayer(
  panel: string | null,
  layout: ResolvedLayout,
  viewport: Viewport,
): boolean {
  if (!panel || layout.kind === 'hidden') return false;
  if (panel === 'notice' || panel === 'credits' || panel === 'keys') return true;
  if (layout.kind === 'focus') return true;
  // Guide and picker open at the left edge, at most 560 px wide, above the dock.
  const panelW = Math.min(PANEL_W_PX, viewport.width);
  return layout.rect.x < panelW;
}
