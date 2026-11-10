// Camera poses and limits from design-spec 4. Distances are multiples (k) of the
// watch distance D, so they stay correct on every window size.
const deg = (d: number) => (d * Math.PI) / 180;

export interface Pose {
  az: number; // radians, positive = camera towards the visitor's right
  el: number; // radians
  k: number; // distance / D
}

export const FOV_DEG = 32;
export const IDLE: Pose = { az: deg(14), el: deg(5), k: 1.45 };
export const WATCH: Pose = { az: 0, el: 0, k: 1 };

export const LIMITS = {
  azMin: deg(-25),
  azMax: deg(25),
  elMin: deg(-8),
  elMax: deg(15),
  kMin: 0.8,
  kMax: 1.3,
};

export const POWER_DOLLY_MS = 1200; // --duration-camera
export const RESET_MS = 700; // --duration-camera-reset
export const DAMPING = 0.08; // per frame at 60 fps
export const KEY_STEP_RAD = deg(4);
export const KEY_ZOOM = 0.05;
export const OFF_WATCH_ANGLE = deg(2);
export const OFF_WATCH_K = 0.05;

/** D: camera distance at which the screen is min(0.56 vw, 0.82 vh) wide on screen. */
export function watchDistance(vw: number, vh: number, screenWidthWorld: number): number {
  const wScreenPx = Math.min(0.56 * vw, 0.82 * vh);
  return (screenWidthWorld * vh) / (2 * Math.tan(deg(FOV_DEG) / 2) * wScreenPx);
}

/** cubic-bezier(0.45, 0, 0.2, 1), the --ease-camera token. */
export function easeCamera(t: number): number {
  const x1 = 0.45,
    y1 = 0,
    x2 = 0.2,
    y2 = 1;
  const bez = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  let u = t;
  for (let i = 0; i < 6; i++) {
    const x = bez(x1, x2, u) - t;
    const dx = 3 * x1 * (1 - u) * (1 - u) + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
    if (Math.abs(dx) < 1e-6) break;
    u -= x / dx;
  }
  u = Math.min(1, Math.max(0, u));
  return bez(y1, y2, u);
}

// Camera creep (design-spec 16.6.4)
export const CREEP_MAX = 0.22; // --haunt-creep-max
export const CREEP_SCREEN_FRAC = 0.86; // screen at most 0.86 of the viewport height
export const CREEP_RATE_UP = 0.04; // per second at most
export const CREEP_RATE_DOWN = 1.2; // easing back to zero (700 ms replay, 1.2 s skip)
