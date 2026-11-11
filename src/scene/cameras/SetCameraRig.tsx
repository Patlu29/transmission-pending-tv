import { PerspectiveCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { readHaunt, useDisplayStore, useHauntStore, useIntroStore } from '../integration/stores';
import { publishSceneTest } from '../integration/testHook';
import { HOLO_LAYOUT } from '../materials/holo';
import {
  DAMPING,
  easeCamera,
  FOV_DEG,
  IDLE,
  KEY_STEP_RAD,
  KEY_ZOOM,
  LIMITS,
  OFF_WATCH_ANGLE,
  OFF_WATCH_K,
  CREEP_MAX,
  CREEP_SET_FRAC,
  heightFraction,
  SET_BOX,
  SET_CENTRE,
  CREEP_RATE_UP,
  CREEP_RATE_DOWN,
  CREEP_SCREEN_FRAC,
  POWER_DOLLY_MS,
  RESET_MS,
  WATCH,
  watchDistance,
  type Pose,
} from './poses';

interface Tween {
  from: Pose;
  to: Pose;
  elapsed: number;
  duration: number;
}

const clampPose = (p: Pose) => {
  p.az = MathUtils.clamp(p.az, LIMITS.azMin, LIMITS.azMax);
  p.el = MathUtils.clamp(p.el, LIMITS.elMin, LIMITS.elMax);
  p.k = MathUtils.clamp(p.k, LIMITS.kMin, LIMITS.kMax);
};

const isPowered = () => {
  const s = useIntroStore.getState().status;
  return s === 'warming' || s === 'playing' || s === 'ended';
};

/**
 * Orbit-style rig for 3d-set (design-spec 4). Custom rather than OrbitControls
 * because Idle sits outside the orbit limits (1.45 x D against a 1.3 x D cap) and
 * the power dolly must override input. No pan. Everything is mutated through refs;
 * nothing re-renders. Frames are requested only while the camera is moving.
 */
export function SetCameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const D = useRef(watchDistance(size.width, size.height));
  const cur = useRef<Pose>({ ...IDLE });
  const goal = useRef<Pose>({ ...IDLE });
  const tween = useRef<Tween | null>(null);
  const offWatch = useRef(false);
  const creep = useRef(0); // rate-limited follower of hauntStore.creep
  const scene = useThree((s) => s.scene); // knob layer sets scene.userData.hoveringKnob

  useEffect(() => {
    publishSceneTest({
      cameraPose: () => ({
        position: camera.position.toArray(),
        target: [...SET_CENTRE],
        D: D.current,
        distance: camera.position.distanceTo(new Vector3(...SET_CENTRE)),
        distanceOverD: camera.position.distanceTo(new Vector3(...SET_CENTRE)) / D.current,
        userK: cur.current.k,
        creep: creep.current,
        azimuthDeg: (cur.current.az * 180) / Math.PI,
        elevationDeg: (cur.current.el * 180) / Math.PI,
      }),
    });
  }, [camera]);

  // Recompute D on resize, debounced 150 ms, only while no tween runs.
  useEffect(() => {
    const id = setTimeout(() => {
      D.current = watchDistance(size.width, size.height);
      invalidate();
    }, 150);
    return () => clearTimeout(id);
  }, [size.width, size.height, invalidate]);

  useEffect(() => {
    const snapTo = (p: Pose) => {
      tween.current = null;
      cur.current = { ...p };
      goal.current = { ...p };
      invalidate();
    };
    const tweenTo = (p: Pose, duration: number) => {
      if (useDisplayStore.getState().motion === 'reduced') return snapTo(p);
      tween.current = { from: { ...cur.current }, to: { ...p }, elapsed: 0, duration };
      goal.current = { ...p };
      invalidate();
    };

    let powered = isPowered();
    snapTo(powered ? WATCH : IDLE);
    let lastReset = useDisplayStore.getState().cameraResetNonce;

    const unIntro = useIntroStore.subscribe(() => {
      const now = isPowered();
      if (now === powered) return;
      powered = now;
      // Power on: dolly Idle -> Watch. Power off: ease back to Idle (assumed; spec is silent).
      tweenTo(powered ? WATCH : IDLE, POWER_DOLLY_MS);
    });
    const unDisplay = useDisplayStore.subscribe((s) => {
      if (s.motion === 'reduced') {
        // Fixed camera: Calm or prefers-reduced-motion cuts to the nearest static pose.
        const p = powered ? WATCH : IDLE;
        const c = cur.current;
        if (tween.current || c.az !== p.az || c.el !== p.el || c.k !== p.k) snapTo(p);
      }
      const nonce = s.cameraResetNonce;
      if (nonce !== lastReset) {
        lastReset = nonce;
        if (powered) tweenTo(WATCH, RESET_MS);
      }
    });

    // Input. Orbit only when powered, motion is full, and no tween is running.
    const dom = gl.domElement;
    const canOrbit = () =>
      isPowered() && useDisplayStore.getState().motion === 'full' && !tween.current;
    let dragging = false;
    let lx = 0;
    let ly = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !canOrbit() || scene.userData.hoveringKnob) return;
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      if (!canOrbit()) return;
      goal.current.az -= (e.clientX - lx) * 0.0055;
      goal.current.el += (e.clientY - ly) * 0.0055;
      lx = e.clientX;
      ly = e.clientY;
      clampPose(goal.current);
      invalidate();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      dom.style.cursor = canOrbit() ? 'grab' : '';
    };
    const onHover = () => {
      if (!dragging && !scene.userData.hoveringKnob) dom.style.cursor = canOrbit() ? 'grab' : '';
    };
    const onWheel = (e: WheelEvent) => {
      if (!canOrbit() || scene.userData.hoveringKnob) return;
      e.preventDefault();
      goal.current.k *= Math.exp(e.deltaY * 0.001);
      clampPose(goal.current);
      invalidate();
    };
    const onDouble = () => {
      if (isPowered() && !scene.userData.hoveringKnob) tweenTo(WATCH, RESET_MS);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t !== document.body && !dom.parentElement?.contains(t)) return; // not in the stage
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // The diary stage uses arrows (and Home) for paging while status is 'ended'.
      if (
        useIntroStore.getState().status === 'ended' &&
        (e.key.startsWith('Arrow') || e.key === 'Home')
      )
        return;
      if (e.key === 'Home') {
        if (isPowered()) tweenTo(WATCH, RESET_MS);
        return;
      }
      if (!canOrbit()) return;
      const g = goal.current;
      switch (e.key) {
        case 'ArrowLeft':
          g.az -= KEY_STEP_RAD;
          break;
        case 'ArrowRight':
          g.az += KEY_STEP_RAD;
          break;
        case 'ArrowUp':
          g.el += KEY_STEP_RAD;
          break;
        case 'ArrowDown':
          g.el -= KEY_STEP_RAD;
          break;
        case '+':
        case '=':
          g.k *= 1 - KEY_ZOOM;
          break;
        case '-':
        case '_':
          g.k *= 1 + KEY_ZOOM;
          break;
        default:
          return;
      }
      e.preventDefault();
      clampPose(g);
      invalidate();
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointermove', onHover);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointercancel', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('dblclick', onDouble);
    window.addEventListener('keydown', onKey);
    const unHaunt = useHauntStore.subscribe(() => invalidate());
    return () => {
      unHaunt();
      unIntro();
      unDisplay();
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointermove', onHover);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointercancel', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('dblclick', onDouble);
      window.removeEventListener('keydown', onKey);
      dom.style.cursor = '';
    };
  }, [gl, scene, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const c = cur.current;
    let moving = false;
    const tw = tween.current;
    if (tw) {
      tw.elapsed += dt * 1000;
      const t = Math.min(1, tw.elapsed / tw.duration);
      const e = easeCamera(t);
      c.az = MathUtils.lerp(tw.from.az, tw.to.az, e);
      c.el = MathUtils.lerp(tw.from.el, tw.to.el, e);
      c.k = MathUtils.lerp(tw.from.k, tw.to.k, e);
      moving = true;
      if (t >= 1) tween.current = null;
    } else {
      const g = goal.current;
      const f = 1 - Math.pow(1 - DAMPING, dt * 60);
      c.az += (g.az - c.az) * f;
      c.el += (g.el - c.el) * f;
      c.k += (g.k - c.k) * f;
      if (Math.abs(g.az - c.az) + Math.abs(g.el - c.el) + Math.abs(g.k - c.k) < 1e-4) {
        c.az = g.az;
        c.el = g.el;
        c.k = g.k;
      } else {
        moving = true;
      }
    }

    // Camera creep (spec 16.6.4): multiplies the visitor's distance by 1 - creep x creepMax.
    const watchD = D.current;
    // Bounds: glass at most 0.86 vh (spec 16.6.4), and the whole set stays in the viewport.
    const hScreenFrac = heightFraction(HOLO_LAYOUT.screen.height, watchD);
    const hSetFrac = heightFraction(SET_BOX.height, watchD);
    const wSetFrac = (heightFraction(SET_BOX.width, watchD) * size.height) / size.width;
    const creepMax = Math.max(
      0,
      Math.min(
        CREEP_MAX,
        1 - hScreenFrac / CREEP_SCREEN_FRAC,
        1 - hSetFrac / CREEP_SET_FRAC,
        1 - wSetFrac / CREEP_SET_FRAC,
      ),
    );
    const wanted = readHaunt().creep;
    if (useDisplayStore.getState().reducedMotion) creep.current = 0; // Calm: gone within one frame
    const diff = wanted - creep.current;
    const step = diff > 0 ? CREEP_RATE_UP * dt : CREEP_RATE_DOWN * dt;
    creep.current += Math.max(-step, Math.min(step, diff));
    if (Math.abs(wanted - creep.current) > 1e-4) moving = true;
    const r = Math.max(LIMITS.kMin * watchD, c.k * watchD * (1 - creep.current * creepMax));
    const ce = Math.cos(c.el);
    camera.position.set(
      SET_CENTRE[0] + r * Math.sin(c.az) * ce,
      SET_CENTRE[1] + r * Math.sin(c.el),
      SET_CENTRE[2] + r * Math.cos(c.az) * ce,
    );
    camera.lookAt(SET_CENTRE[0], SET_CENTRE[1], SET_CENTRE[2]);

    const off =
      Math.abs(c.az) >= OFF_WATCH_ANGLE ||
      Math.abs(c.el) >= OFF_WATCH_ANGLE ||
      Math.abs(c.k - 1) >= OFF_WATCH_K;
    if (off !== offWatch.current) {
      offWatch.current = off;
      useDisplayStore.getState().setCameraOffWatch(off);
    }
    if (moving) invalidate();
  });

  return <PerspectiveCamera makeDefault fov={FOV_DEG} near={0.05} far={50} position={[0, 0, 3]} />;
}
