import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { easeCamera } from '../cameras/poses';
import { useDisplayStore } from '../integration/stores';
import { publishSceneTest } from '../integration/testHook';
import { getAnchor, subscribeAnchor } from './anchorRegistry.ts';
import {
  classifyPlacement,
  insetRect,
  type EnvironmentId,
  type PlayerPlacement,
  type Rect,
  type ScreenCorners,
} from './contract.ts';
import {
  enforceClearHalo,
  planeBasis,
  projectCorners,
  solveWatch,
  type WatchSolution,
} from './ScreenProjector.ts';
import { applyKeepOut, clearKeepOut, getActiveUniforms } from './shared/roomUniforms.ts';
import { useChannelStore, useEnvironmentStore } from './seam.ts';
import { usePlayerStore } from './seam.ts';
import { setWatchFrame } from './watchFrame.ts';

const deg = (d: number) => (d * Math.PI) / 180;

interface Params {
  az: number;
  el: number;
  k: number;
  /** 0 = look at the anchor centre; 1 = look at the watch point T (the camera slid in the plane). */
  shift: number;
}

const WATCH: Params = { az: 0, el: 0, k: 1, shift: 1 };
const BROWSE: Params = { az: deg(10), el: deg(3), k: 1.1, shift: 0 };
const WATCH_TWEEN_MS = 700;
const DAMPING = 0.08;

/** Room-specific entrance, from lower and further away (mountain-sky rises over 1.6 s). */
const ENTER: Partial<Record<EnvironmentId, { el: number; ms: number }>> = {
  'mountain-sky': { el: deg(-26), ms: 1600 },
};

interface Frame {
  A: Vector3;
  n: Vector3;
  right: Vector3;
  up: Vector3;
  sol: WatchSolution;
  shiftVec: Vector3;
}

interface Tween {
  fromPos: Vector3;
  fromTarget: Vector3;
  elapsed: number;
  ms: number;
}

/**
 * Camera controller for every v2 room except tv-room channel 0 (which keeps v1's rig).
 * - watch: the solved face-on pose, static. No input, no motion.
 * - browse: orbit about the anchor within the design-spec-v2 1.12 limits (full motion only).
 * - Calm and reduced motion: the camera is always at the watch pose, never moves.
 * On settle (tween end) and on resize it projects the anchor, runs classifyPlacement, writes the
 * placement, sets the shared keep-out box and runs the clear-halo check. Never per frame while watching.
 */
export function EnvironmentCamera({
  envId,
  extent,
}: {
  envId: EnvironmentId;
  /** Lateral extent of the room object in anchor-local metres (tv-room's set). */
  extent?: { minX: number; maxX: number; minY?: number; maxY?: number };
}) {
  const getThree = useThree((s) => s.get);
  /** Always the CURRENT default camera: a previous rig's camera is swapped out when it unmounts. */
  const cam = () => getThree().camera as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const frame = useRef<Frame | null>(null);
  const cur = useRef<Params>({ ...BROWSE });
  const goal = useRef<Params>({ ...BROWSE });
  const tween = useRef<Tween | null>(null);
  const goalPose = useRef<Params>({ ...WATCH });
  const first = useRef(true);
  const lastPlacement = useRef('');
  const localPlacement = useRef<PlayerPlacement>({ kind: 'hidden', reason: 'browse' });
  const lastRect = useRef<Rect | null>(null);
  const haloHidden = useRef<string[]>([]);
  const settledPose = useRef<'watch' | 'browse' | 'moving'>('moving');
  /** True when the camera sits at the solved watch pose (watch, Calm or phone). */
  const atWatchCam = useRef(true);
  const sizeRef = useRef({ w: size.width, h: size.height });
  useEffect(() => {
    sizeRef.current = { w: size.width, h: size.height };
  }, [size.width, size.height]);

  const phone = () => useDisplayStore.getState().renderMode === '3d-screen';
  const calm = () => useDisplayStore.getState().reducedMotion;

  const paramsToCamera = (p: Params, out: { pos: Vector3; target: Vector3 }) => {
    const f = frame.current;
    if (!f) return false;
    const r = p.k * f.sol.distance;
    const ce = Math.cos(p.el);
    out.target.copy(f.A).addScaledVector(f.shiftVec, p.shift);
    out.pos
      .copy(out.target)
      .addScaledVector(f.right, r * Math.sin(p.az) * ce)
      .addScaledVector(f.up, r * Math.sin(p.el))
      .addScaledVector(f.n, r * Math.cos(p.az) * ce);
    return true;
  };

  const scratch = useRef({ pos: new Vector3(), target: new Vector3() });
  const lookTarget = useRef(new Vector3());
  const hasLook = useRef(false);

  /** The frontend runs classifyPlacement from the corners (focus, phone and 2D always win). */
  const reportCorners = (corners: ScreenCorners | null) => {
    usePlayerStore
      .getState()
      .reportCorners(corners, { width: sizeRef.current.w, height: sizeRef.current.h });
  };

  /** Local copy of the classification, for the test hook only. */
  const publish = (p: PlayerPlacement) => {
    lastPlacement.current = JSON.stringify(p);
    localPlacement.current = p;
  };

  /** Re-solve the frame from the anchor, viewport and fov. Returns false until an anchor exists. */
  const solve = () => {
    const a = getAnchor();
    if (!a) return false;
    // Rooms are built for a 32 degree vertical fov (the technical-artist's horizon angles assume it), with
    // near and far scaled to the screen: near about 0.01 x widthM, far at least 60 x widthM.
    cam().fov = 32;
    cam().near = 0.01 * a.spec.widthM;
    cam().far = Math.max(60 * a.spec.widthM, 200);
    cam().updateProjectionMatrix();
    a.object.updateWorldMatrix(true, false);
    const A = new Vector3().setFromMatrixPosition(a.object.matrixWorld);
    const n = new Vector3(0, 0, 1).transformDirection(a.object.matrixWorld).normalize();
    const { right, up } = planeBasis(n);
    const sol = solveWatch(
      { position: A.toArray(), normal: n.toArray() },
      a.spec,
      { width: sizeRef.current.w, height: sizeRef.current.h },
      cam().fov,
      { phone: phone(), extent },
    );
    frame.current = { A, n, right, up, sol, shiftVec: new Vector3(...sol.shift) };
    setWatchFrame({
      position: new Vector3(...sol.position),
      right,
      up,
      normal: n,
      fovDeg: cam().fov,
      aspect: sizeRef.current.w / sizeRef.current.h,
      width: sizeRef.current.w,
      height: sizeRef.current.h,
      rect: sol.rect,
      phone: phone(),
      distance: sol.distance,
      version: (Date.now() % 1e9) | 0,
    });
    return true;
  };

  const applyCamera = (pos: Vector3, target: Vector3) => {
    hasLook.current = true;
    cam().position.copy(pos);
    cam().lookAt(target);
    cam().updateMatrixWorld(true);
  };

  /** Pose is static and face-on: project, classify, publish, set keep-out, run the halo check. */
  const settle = () => {
    const f = frame.current;
    const a = getAnchor();
    if (!f || !a) return;
    const viewport = { width: sizeRef.current.w, height: sizeRef.current.h };
    const env = useEnvironmentStore.getState();
    const corners = atWatchCam.current ? projectCorners(a.object, a.spec, cam(), viewport) : null;
    const placement = classifyPlacement(corners, viewport, {
      pose: env.pose,
      phone: phone(),
      userFocus: env.userFocus,
      mode2d: false,
      inset: a.spec.inset,
    });
    publish(placement);
    // Report only a settled watch pose; browse and tweens report null (the player stays hidden).
    reportCorners(env.pose === 'watch' ? corners : null);
    if (placement.kind === 'inline') {
      lastRect.current = placement.rect;
    } else if (corners) {
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      // The player rect is the projected glass inset on every edge (spec.inset), also for the keep-out box.
      lastRect.current = insetRect(
        {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
        a.spec.inset ?? 0,
      );
    } else lastRect.current = null;

    const r = lastRect.current;
    if (atWatchCam.current && r) {
      applyKeepOut(r);
      const rep = enforceClearHalo(scene, cam(), a.object, r, viewport);
      haloHidden.current = rep.hidden;
    } else {
      clearKeepOut();
      scene.traverse((o) => {
        if (o.userData.haloHidden) {
          o.visible = true;
          o.userData.haloHidden = false;
        }
      });
      haloHidden.current = [];
    }
    invalidate();
  };

  /** Target params for the current pose and Calm state. */
  const desired = (): Params => {
    const pose = useEnvironmentStore.getState().pose;
    if (calm() || phone() || pose === 'watch') return { ...WATCH };
    return { ...BROWSE };
  };

  /** Go to the desired pose: tween (or snap in Calm), then settle. */
  const goTo = (animate: boolean, enter?: { el: number; ms: number }) => {
    if (!solve()) return;
    const out = scratch.current;
    const want = desired();
    goalPose.current = want;
    goal.current = { ...want };
    const instant = !animate || calm() || phone();
    paramsToCamera(want, out);
    settledPose.current = 'moving';
    atWatchCam.current = want.shift === 1;
    if (instant) {
      tween.current = null;
      cur.current = { ...want };
      applyCamera(out.pos, out.target);
      lookTarget.current.copy(out.target);
      settledPose.current = atWatchCam.current ? 'watch' : 'browse';
      publish({ kind: 'hidden', reason: 'not-face-on' });
      reportCorners(null);
      settle();
      return;
    }
    let fromPos: Vector3;
    let fromTarget: Vector3;
    if (enter) {
      const startP: Params = { ...WATCH, el: enter.el };
      const s = { pos: new Vector3(), target: new Vector3() };
      paramsToCamera(startP, s);
      fromPos = s.pos;
      fromTarget = s.target;
    } else {
      fromPos = cam().position.clone();
      if (!hasLook.current) {
        // Coming from another rig (v1's): continue from where its camera is looking.
        lookTarget.current
          .copy(cam().position)
          .addScaledVector(cam().getWorldDirection(new Vector3()), 3);
        hasLook.current = true;
      }
      fromTarget = lookTarget.current.clone();
    }
    tween.current = { fromPos, fromTarget, elapsed: 0, ms: enter ? enter.ms : WATCH_TWEEN_MS };
    publish({ kind: 'hidden', reason: 'not-face-on' }); // the player waits for the pose to settle
    reportCorners(null);
    clearKeepOut();
    invalidate();
  };

  // First solve, and re-solve when the anchor appears or changes (room switch).
  useEffect(() => {
    const start = () => {
      if (!getAnchor()) return;
      const enter = first.current ? ENTER[envId] : undefined;
      first.current = false;
      goTo(true, enter);
    };
    start();
    return subscribeAnchor(start);
    // goTo reads refs and stores only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envId]);

  // Pose, focus, channel and Calm changes.
  useEffect(() => {
    const unsub = [
      useEnvironmentStore.subscribe((s, prev) => {
        if (s.pose !== prev.pose) goTo(true);
        else if (s.userFocus !== prev.userFocus) settle();
      }),
      useDisplayStore.subscribe((s, prev) => {
        if (s.reducedMotion !== prev.reducedMotion || s.renderMode !== prev.renderMode) goTo(false);
      }),
      useChannelStore.subscribe((s, prev) => {
        if (s.current !== prev.current) invalidate();
      }),
    ];
    return () => unsub.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize: debounced 150 ms, never while a tween runs (it re-solves at its end).
  useEffect(() => {
    const id = setTimeout(() => {
      if (tween.current) return;
      if (!frame.current) return;
      const keep = { ...cur.current };
      goTo(false);
      if (settledPose.current === 'browse') cur.current = keep;
    }, 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  // Browse input: orbit about the anchor. Off in watch, in Calm and on phones.
  useEffect(() => {
    const dom = gl.domElement;
    const canOrbit = () =>
      useEnvironmentStore.getState().pose === 'browse' &&
      !calm() &&
      !phone() &&
      !tween.current &&
      frame.current;
    const mountain = envId === 'mountain-sky';
    const elMin = deg(mountain ? -8 : -5);
    const elMax = deg(mountain ? 15 : 12);
    const clamp = () => {
      const g = goal.current;
      g.az = MathUtils.clamp(g.az, deg(-35), deg(35));
      g.el = MathUtils.clamp(g.el, elMin, elMax);
      g.k = MathUtils.clamp(g.k, 0.85, 1.15);
      invalidate();
    };
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !canOrbit()) return;
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!dragging || !canOrbit()) return;
      goal.current.az -= (e.clientX - lx) * 0.0055;
      goal.current.el += (e.clientY - ly) * 0.0055;
      lx = e.clientX;
      ly = e.clientY;
      clamp();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      dom.style.cursor = canOrbit() ? 'grab' : '';
    };
    const wheel = (e: WheelEvent) => {
      if (!canOrbit()) return;
      e.preventDefault();
      goal.current.k *= Math.exp(e.deltaY * 0.001);
      clamp();
    };
    const key = (e: KeyboardEvent) => {
      if (!canOrbit() || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t !== document.body && !dom.parentElement?.contains(t)) return;
      const g = goal.current;
      const step = deg(4);
      if (e.key === 'ArrowLeft') g.az -= step;
      else if (e.key === 'ArrowRight') g.az += step;
      else if (e.key === 'ArrowUp') g.el += step;
      else if (e.key === 'ArrowDown') g.el -= step;
      else if (e.key === '+' || e.key === '=') g.k *= 0.95;
      else if (e.key === '-' || e.key === '_') g.k *= 1.05;
      else return;
      e.preventDefault();
      clamp();
    };
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('pointercancel', up);
      dom.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
      dom.style.cursor = '';
    };
  }, [gl, envId, invalidate]);

  // Test hook and cleanup.
  useEffect(() => {
    publishSceneTest({
      environment: () => ({
        id: envId,
        pose: useEnvironmentStore.getState().pose,
        settled: settledPose.current,
        placement: localPlacement.current,
        rect: lastRect.current,
        placementKind: localPlacement.current.kind,
        reported: usePlayerStore.getState().corners,
        keepOut: getActiveUniforms()?.uKeepOut.value.toArray() ?? null,
        haloHidden: [...haloHidden.current],
        distance: frame.current?.sol.distance ?? null,
        camera: {
          position: cam().position.toArray(),
          target: lookTarget.current.toArray(),
        },
        params: { ...cur.current },
        viewport: { width: sizeRef.current.w, height: sizeRef.current.h },
      }),
      renderInfo: () => ({ ...gl.info.render, ...gl.info.memory }),
    });
    return () => {
      setWatchFrame(null);
      clearKeepOut();
      usePlayerStore.getState().reportCorners(null);
    };
    // cam reads the current camera from R3F; it never changes identity meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envId, gl]);

  useFrame((_, delta) => {
    const f = frame.current;
    if (!f) return;
    const dt = Math.min(delta, 0.1);
    const out = scratch.current;
    const tw = tween.current;
    if (tw) {
      tw.elapsed += dt * 1000;
      const t = Math.min(1, tw.elapsed / tw.ms);
      const e = easeCamera(t);
      paramsToCamera(goalPose.current, out);
      const pos = tw.fromPos.clone().lerp(out.pos, e);
      const target = tw.fromTarget.clone().lerp(out.target, e);
      applyCamera(pos, target);
      lookTarget.current.copy(target);
      if (t >= 1) {
        tween.current = null;
        cur.current = { ...goalPose.current };
        settledPose.current = atWatchCam.current ? 'watch' : 'browse';
        settle();
      }
      invalidate();
      return;
    }
    if (settledPose.current === 'browse' && !calm()) {
      const c = cur.current;
      const g = goal.current;
      const k = 1 - Math.pow(1 - DAMPING, dt * 60);
      const d = Math.abs(g.az - c.az) + Math.abs(g.el - c.el) + Math.abs(g.k - c.k);
      if (d > 1e-4) {
        c.az += (g.az - c.az) * k;
        c.el += (g.el - c.el) * k;
        c.k += (g.k - c.k) * k;
        paramsToCamera(c, out);
        applyCamera(out.pos, out.target);
        lookTarget.current.copy(out.target);
        invalidate();
      }
    }
  });

  return null;
}
