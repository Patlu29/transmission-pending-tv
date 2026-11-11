/**
 * Train window seat at dusk: a partition panel with the screen, a window on the left with three parallax strips
 * (far hills, mid trees, near poles), half-drawn curtain, luggage rack, steel tumbler and tray, headrest.
 * Only the scenery outside the window moves. Anchor space, units of `widthM` (0.45 m).
 */
import { useEffect, useMemo } from 'react';
import { Color } from 'three';
import {
  rng,
  roomMaterial,
  useRoomClock,
  useRoomUniforms,
  type BoxSpec,
  type RoomProps,
} from '../roomKit.ts';
import {
  Boxes,
  DimOverlay,
  Glow,
  GradQuad,
  PuffLayer,
  SpillLight,
  type PuffSpec,
} from '../roomParts.tsx';
import { TRAIN_SCREEN, TRAIN_PALETTE } from '../specs.ts';

const P = TRAIN_PALETTE;
const WIN = { x: -0.69, y: 0.08, w: 0.22, h: 0.7 };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
// Three seamless parallax layers in one window plane. Speeds in window heights per second: far 0.008, mid 0.025, near 0.09.
const SCENE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uSkyH; uniform vec3 uSkyT; uniform vec3 uHills; uniform vec3 uPole; uniform float uAspect;
float ridge(float x, float seed, float freq) {
  float v = 0.0; float a = 0.5; float p = x * freq;
  for (int i = 0; i < 4; i++) { v += a * vnoise(vec2(p + seed, seed * 3.1)); p *= 2.1; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv;
  float x = uv.x * uAspect;                       // in window heights
  vec3 col = mix(uSkyH, uSkyT, smoothstep(0.18, 1.0, uv.y));
  col += vec3(0.25, 0.1, 0.0) * exp(-pow((uv.y - 0.22) / 0.12, 2.0)) * 0.5;
  float t = uTime;
  // far hills (scroll with period 3 so it wraps: use a periodic noise via cos)
  float far = 0.27 + 0.10 * ridge(x + t * 0.008, 3.0, 2.2);
  col = mix(col, mix(uHills, uSkyH, 0.45), step(uv.y, far));
  float mid = 0.20 + 0.07 * ridge(x * 1.4 + t * 0.025, 9.0, 3.0) + 0.045 * step(0.55, vnoise(vec2((x + t * 0.025) * 9.0, 1.0))) * vnoise(vec2((x + t * 0.025) * 30.0, 4.0));
  col = mix(col, uHills * 0.6, step(uv.y, mid));
  // near poles: thin dark uprights passing at most 0.8 Hz, each under 1.5 per cent of the window width
  float px = fract((x + t * 0.09) / 1.1);
  float pole = step(abs(px - 0.5), 0.006 / uAspect * 1.0) * step(uv.y, 0.95);
  float wire = step(abs(uv.y - (0.82 - 0.05 * sin(px * 3.14159))), 0.004);
  col = mix(col, uPole, max(pole, wire * 0.8));
  float ground = 0.07 + 0.02 * vnoise(vec2((x + t * 0.09) * 6.0, 2.0));
  col = mix(col, uPole * 0.8, step(uv.y, ground));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function TrainRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = TRAIN_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 31);
  const w = S;
  const h = S / TRAIN_SCREEN.aspect;
  const scene = useMemo(
    () =>
      roomMaterial(u, {
        vertex: VERT,
        fragment: SCENE_FRAG,
        transparent: false,
        depthWrite: true,
        uniforms: {
          uSkyH: { value: new Color(P.skyHorizon) },
          uSkyT: { value: new Color(P.skyTop) },
          uHills: { value: new Color(P.hills) },
          uPole: { value: new Color(P.poles) },
          uAspect: { value: WIN.w / WIN.h },
        },
      }),
    [u],
  );
  useEffect(() => () => scene.dispose(), [scene]);

  const props3d = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const m = 0.035 * S;
    // partition panel with a dark surround for the screen
    L.push({ p: [0, h / 2 + m / 2, -0.004 * S], s: [w + 2 * m, m, 0.01 * S], c: '#151515' });
    L.push({ p: [0, -h / 2 - m / 2, -0.004 * S], s: [w + 2 * m, m, 0.01 * S], c: '#151515' });
    L.push({ p: [-w / 2 - m / 2, 0, -0.004 * S], s: [m, h, 0.01 * S], c: '#151515' });
    L.push({ p: [w / 2 + m / 2, 0, -0.004 * S], s: [m, h, 0.01 * S], c: '#151515' });
    // window frame (steel) and a pale sill
    const t = 0.018 * S;
    const { x, y, w: ww, h: hh } = WIN;
    L.push({
      p: [x * S, (y + hh / 2) * S + t / 2, 0],
      s: [(ww + 0.05) * S, t, 0.03 * S],
      c: P.steel,
    });
    L.push({
      p: [x * S, (y - hh / 2) * S - t / 2, 0],
      s: [(ww + 0.05) * S, t, 0.03 * S],
      c: P.steel,
    });
    L.push({ p: [(x - ww / 2) * S - t / 2, y * S, 0], s: [t, hh * S, 0.03 * S], c: P.steel });
    L.push({ p: [(x + ww / 2) * S + t / 2, y * S, 0], s: [t, hh * S, 0.03 * S], c: P.steel });
    L.push({
      p: [x * S, (y - hh / 2) * S - 0.04 * S, 0.02 * S],
      s: [(ww + 0.08) * S, 0.02 * S, 0.07 * S],
      c: '#b7ab8d',
    });
    // half-drawn curtain: left of the window, folds as thin boxes
    for (let i = 0; i < 5; i += 1)
      L.push({
        p: [(x - ww / 2 - 0.02 + i * 0.03) * S, (y + 0.1) * S, 0.03 * S],
        s: [0.032 * S, (hh * 0.85 + (i % 2) * 0.02) * S, 0.02 * S],
        c: i % 2 ? '#8a2f3b' : P.curtain,
      });
    // luggage rack along the top edge
    L.push({ p: [0.1 * S, 0.5 * S, 0.12 * S], s: [1.5 * S, 0.016 * S, 0.12 * S], c: P.steel });
    for (const xr of [-0.4, 0.1, 0.55])
      L.push({ p: [xr * S, 0.46 * S, 0.12 * S], s: [0.012 * S, 0.08 * S, 0.012 * S], c: P.steel });
    // reading light, above right, outside the halo
    L.push({ p: [0.7 * S, 0.34 * S, 0.02 * S], s: [0.07 * S, 0.026 * S, 0.04 * S], c: '#2a2a2e' });
    // tray with tumbler and a folded paper, lower right
    L.push({ p: [0.62 * S, -0.34 * S, 0.14 * S], s: [0.34 * S, 0.014 * S, 0.2 * S], c: '#b7ab8d' });
    L.push({ p: [0.7 * S, -0.3 * S, 0.14 * S], s: [0.05 * S, 0.075 * S, 0.05 * S], c: P.steel });
    L.push({
      p: [0.55 * S, -0.325 * S, 0.14 * S],
      s: [0.1 * S, 0.008 * S, 0.12 * S],
      c: '#e8e4d8',
      ry: 0.3,
    });
    // seat headrest at the bottom edge
    L.push({ p: [-0.1 * S, -0.55 * S, 0.3 * S], s: [1.1 * S, 0.22 * S, 0.12 * S], c: P.seat });
    L.push({ p: [-0.1 * S, -0.44 * S, 0.3 * S], s: [0.5 * S, 0.02 * S, 0.12 * S], c: '#40609a' });
    return L;
  }, [S, w, h]);

  const steam = useMemo<PuffSpec[]>(() => {
    const r = rng(8);
    return Array.from({ length: quality === 'low' ? 3 : 6 }, () => ({
      x: 0.7 * S + (r() - 0.5) * 0.01 * S,
      y: -0.26 * S,
      z: 0.14 * S,
      w: 0.045 * S,
      h: 0.045 * S,
    }));
  }, [S, quality]);

  return (
    <group name="train">
      <ambientLight intensity={0.9} color="#c9bfae" />
      <SpillLight
        u={u}
        base={0.28 * 2.2}
        position={[0, 0, 0.9 * S]}
        colour="#ffd9a0"
        distance={5 * S}
      />
      <GradQuad
        position={[0, 0, -0.03 * S]}
        size={[6 * S, 3.4 * S]}
        top="#cbbf9f"
        bottom="#a79c80"
      />
      <mesh position={[WIN.x * S, WIN.y * S, -0.005 * S]} material={scene}>
        <planeGeometry args={[WIN.w * S, WIN.h * S]} />
      </mesh>
      <Boxes specs={props3d} />
      <Glow
        u={u}
        position={[0, 0, -0.02 * S]}
        size={[w * 1.9, h * 2.2]}
        colour="#ffe2b0"
        base={0.28}
        spill
      />
      <Glow
        u={u}
        position={[0.7 * S, 0.3 * S, 0.05 * S]}
        size={[0.4 * S, 0.4 * S]}
        colour="#fff0cf"
        base={0.45}
      />
      <Glow
        u={u}
        position={[WIN.x * S + 0.1 * S, WIN.y * S, 0.05 * S]}
        size={[0.8 * S, 1.2 * S]}
        colour={P.skyHorizon}
        base={0.1}
        spill
      />
      <PuffLayer
        uniforms={u}
        puffs={steam}
        top="#f0ece2"
        shadow="#b9b4a6"
        riseSpeed={0.05 * S}
        rise={0.14 * S}
        opacity={0.4}
        seed={6}
        renderOrder={12}
        hideInCalm
      />
      <DimOverlay dim={dim} />
    </group>
  );
}
