/**
 * Watch-pose solver, corner projection and the clear-halo check (ADR 0011 section 1).
 * Pure functions plus three.js maths; no React. Owner: scene-developer.
 *
 * The watch pose looks along the anchor's -normal, with the camera on the normal axis through a point T
 * that is shifted IN the anchor plane (so the camera is only ever translated parallel to the screen
 * and never rotated). The projected quad is then exactly axis-aligned.
 */
import { Box3, Matrix4, Object3D, PerspectiveCamera, Vector3 } from 'three';
import {
  WATCH_MAX_FILL,
  type Rect,
  type ScreenAnchorSpec,
  type ScreenCorners,
  type Viewport,
  type WatchPoseSolver,
} from './contract.ts';

export const INFO_ROW_PX = 56;
export const DOCK_PX = 64;
export const SPACE_6_PX = 24;
export const HALO_PX = 24;
const MAX_HEIGHT_FRAC = 0.78;

export interface SolveOptions {
  /** Phone-class framing (idle on a phone, and the focus backdrop): fill 0.92, centre low or at 34 per cent. */
  phone?: boolean;
  /**
   * Lateral extent of the whole room object (the TV set) in anchor-local metres. With align 'left' or
   * 'right' the solver centres this extent in the viewport, and shrinks the screen until the extent
   * fits within 95 per cent of the viewport width.
   */
  extent?: { minX: number; maxX: number };
}

export interface WatchSolution {
  position: [number, number, number];
  target: [number, number, number];
  /** Distance from the camera to the anchor plane, metres. */
  distance: number;
  /** Where the anchor's rectangle lands, CSS px from the stage's top-left. */
  rect: Rect;
  /** Pixels per metre on the anchor plane. */
  pixelsPerMetre: number;
  /** Vector from the anchor centre to the look-at point T (in the anchor plane). */
  shift: [number, number, number];
}

const UP = new Vector3(0, 1, 0);

/** Right and up unit vectors of a screen whose normal is n (screens are never rolled). */
export function planeBasis(n: Vector3): { right: Vector3; up: Vector3 } {
  const right = new Vector3().crossVectors(UP, n);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0); // looking straight down or up: pick world x
  right.normalize();
  const up = new Vector3().crossVectors(n, right).normalize();
  return { right, up };
}

export function solveWatch(
  anchorWorld: { position: [number, number, number]; normal: [number, number, number] },
  screen: ScreenAnchorSpec,
  viewport: Viewport,
  fovDeg: number,
  options: SolveOptions = {},
): WatchSolution {
  const { width: vw, height: vh } = viewport;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const n = new Vector3(...anchorWorld.normal).normalize();
  const { right, up } = planeBasis(n);
  const A = new Vector3(...anchorWorld.position);

  // 1. Size of the rect, in px (design-spec-v2 2.2, never above WATCH_MAX_FILL on either axis).
  const fill = options.phone ? 0.92 : screen.fill;
  let wr = Math.min(fill, WATCH_MAX_FILL) * vw;
  const maxH = options.phone
    ? WATCH_MAX_FILL * vh
    : Math.min(
        MAX_HEIGHT_FRAC * vh,
        vh - INFO_ROW_PX - DOCK_PX - 2 * SPACE_6_PX,
        WATCH_MAX_FILL * vh,
      );
  wr = Math.min(wr, Math.max(1, maxH) * screen.aspect);
  const ext = options.extent;
  if (ext && !options.phone) {
    const setWidthPx = (wr / screen.widthM) * (ext.maxX - ext.minX);
    const limit = 0.95 * vw;
    if (setWidthPx > limit) wr *= limit / setWidthPx;
  }
  const hr = wr / screen.aspect;

  // 2. Distance: wr = widthM * vh / (2 d tanHalf).
  const d = (screen.widthM * vh) / (2 * tanHalf * wr);
  const ppm = vh / (2 * d * tanHalf);

  // 3. Where the rect centre lands.
  let cx = vw / 2;
  if (!options.phone) {
    if (ext && screen.align !== 'centre') {
      const centreX = (ext.minX + ext.maxX) / 2;
      cx = vw / 2 - centreX * ppm; // anchor-local +x is to the right on screen
    } else if (screen.align === 'left') {
      cx = 0.08 * vw + wr / 2;
    } else if (screen.align === 'right') {
      cx = 0.92 * vw - wr / 2;
    }
  }
  let cy: number;
  if (options.phone) cy = (screen.vAlign === 'upper' ? 0.34 : 0.68) * vh;
  else cy = (screen.vAlign === 'upper' ? 0.41 : 0.5) * vh;

  // 4. Camera on the normal axis through T, T shifted in the plane so A lands at (cx, cy).
  const a = (cx - vw / 2) / ppm;
  const b = (vh / 2 - cy) / ppm;
  const shift = right.clone().multiplyScalar(-a).addScaledVector(up, -b);
  const T = A.clone().add(shift);
  const P = T.clone().addScaledVector(n, d);

  return {
    position: P.toArray(),
    target: T.toArray(),
    distance: d,
    rect: { x: cx - wr / 2, y: cy - hr / 2, width: wr, height: hr },
    pixelsPerMetre: ppm,
    shift: shift.toArray(),
  };
}

/** The contract's WatchPoseSolver (position and target only). */
export const watchPoseSolver: WatchPoseSolver = {
  watchPose(anchorWorld, screen, viewport, fovDeg) {
    const s = solveWatch(anchorWorld, screen, viewport, fovDeg);
    return { position: s.position, target: s.target };
  },
};

const tmp = new Vector3();

/** Projects the anchor's four corners (TL, TR, BR, BL) to CSS px relative to the stage. */
export function projectCorners(
  anchor: Object3D,
  spec: ScreenAnchorSpec,
  camera: PerspectiveCamera,
  viewport: Viewport,
): ScreenCorners | null {
  anchor.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const hw = spec.widthM / 2;
  const hh = spec.widthM / spec.aspect / 2;
  const pts: Array<[number, number]> = [
    [-hw, hh],
    [hw, hh],
    [hw, -hh],
    [-hw, -hh],
  ];
  const out: Array<{ x: number; y: number }> = [];
  for (const [x, y] of pts) {
    tmp.set(x, y, 0).applyMatrix4(anchor.matrixWorld).project(camera);
    if (!Number.isFinite(tmp.x) || tmp.z > 1 || tmp.z < -1) return null; // behind the camera or clipped
    out.push({ x: ((tmp.x + 1) / 2) * viewport.width, y: ((1 - tmp.y) / 2) * viewport.height });
  }
  return out as unknown as ScreenCorners;
}

/* ---------------- Clear halo ---------------- */

export interface HaloReport {
  checked: number;
  hidden: string[];
}

const box = new Box3();
const mat = new Matrix4();
const corner = new Vector3();

/**
 * Guarantees nothing is drawn between the camera and the screen rect plus `HALO_PX`.
 * Props opt in with `object.userData.halo = true`; `userData.sweep` (metres) widens the box for
 * animated props. Screen-owned dressing (portal frame and the like) sets `userData.screenOwned` and is skipped.
 * Only props nearer to the camera than the anchor plane are tested: anything behind the plane is
 * covered by the player anyway. Violators are hidden (production behaviour, the spec's "hide the prop";
 * in development the violation is also logged with console.error). Call on settle and resize, never per frame.
 */
export function enforceClearHalo(
  root: Object3D,
  camera: PerspectiveCamera,
  anchor: Object3D,
  rect: Rect,
  viewport: Viewport,
): HaloReport {
  const report: HaloReport = { checked: 0, hidden: [] };
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  mat.copy(camera.matrixWorldInverse);
  const planeN = new Vector3(0, 0, 1).transformDirection(anchor.matrixWorld);
  const planeP = new Vector3().setFromMatrixPosition(anchor.matrixWorld);
  const camToPlane = planeN.dot(camera.position.clone().sub(planeP)); // distance along the normal
  const x0 = rect.x - HALO_PX;
  const y0 = rect.y - HALO_PX;
  const x1 = rect.x + rect.width + HALO_PX;
  const y1 = rect.y + rect.height + HALO_PX;

  root.traverse((o) => {
    if (!o.userData.halo || o.userData.screenOwned) return;
    if (o.userData.haloHidden) {
      o.visible = true;
      o.userData.haloHidden = false;
    }
    report.checked++;
    box.setFromObject(o);
    if (box.isEmpty()) return;
    const sweep = typeof o.userData.sweep === 'number' ? o.userData.sweep : 0;
    box.expandByScalar(sweep);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let nearest = Infinity;
    let behindCamera = false;
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      );
      nearest = Math.min(nearest, planeN.dot(camera.position.clone().sub(corner)));
      const v = corner.clone().applyMatrix4(mat);
      if (v.z >= 0) {
        behindCamera = true; // part of it is behind the camera: treat as covering the view
        continue;
      }
      corner.project(camera);
      const px = ((corner.x + 1) / 2) * viewport.width;
      const py = ((1 - corner.y) / 2) * viewport.height;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    // `nearest` is the smallest camera-above-corner distance along the normal; the plane's is camToPlane.
    const inFront = nearest < camToPlane - 1e-3;
    if (!inFront) return;
    const overlaps = behindCamera || (minX < x1 && maxX > x0 && minY < y1 && maxY > y0);
    if (!overlaps) return;
    o.visible = false;
    o.userData.haloHidden = true;
    report.hidden.push(o.name || o.uuid);
    if (import.meta.env.DEV)
      console.error(
        `[clearHalo] "${o.name || o.uuid}" is inside the screen rect plus ${HALO_PX} px; hidden`,
      );
  });
  return report;
}
