/**
 * Rainy-night bedroom: indigo wall, a window with rain and warm city bokeh on the left, a bedside lamp and a steaming
 * mug on the right, the wall-hung screen over a low chest, fairy lights in the top-left corner, blanket and a
 * sleeping cat at the bottom edge. Anchor space, units of `widthM` (1.2 m).
 */
import { useEffect, useMemo } from 'react';
import { Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
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
  PointSprites,
  PuffLayer,
  SpillLight,
  type PuffSpec,
} from '../roomParts.tsx';
import { BEDROOM_SCREEN, BEDROOM_PALETTE } from '../specs.ts';

const P = BEDROOM_PALETTE;

const WINDOW = { x: -0.69, y: 0.1, w: 0.22, h: 0.8 };

const RAIN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
const RAIN_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uRain; uniform vec3 uBokeh; uniform float uAspect;
float drop(vec2 uv, float t, float cols, float rows, float seed) {
  vec2 g = vec2(uv.x * cols, uv.y * rows);
  vec2 id = floor(g); vec2 f = fract(g);
  float h = hash21(id + seed);
  float speed = 0.04 + 0.05 * hash21(id + seed + 9.0);
  float yy = fract(t * speed + h);                       // drop height in the cell, falls slowly (up in uv = top)
  vec2 c = vec2(0.25 + 0.5 * hash21(id + seed + 4.0), 1.0 - yy);
  vec2 d = (f - c) * vec2(1.0, 1.0);
  float body = 1.0 - smoothstep(0.05, 0.11, length(d * vec2(1.2, 0.75)));
  float trail = (1.0 - smoothstep(0.0, 0.03, abs(d.x))) * step(0.0, d.y) * smoothstep(0.7, 0.0, d.y) * 0.5;
  return (body + trail) * step(0.35, hash21(id + seed + 2.0));
}
void main() {
  vec2 uv = vUv;
  vec3 col = mix(vec3(0.08, 0.10, 0.17), uRain * 0.45, smoothstep(0.0, 1.0, uv.y) * 0.6);
  // city bokeh: discs in a grid, warm and cool, breathing 0.1 to 0.3 Hz at 10 per cent
  vec2 bg = vec2(uv.x * uAspect * 7.0, uv.y * 7.0);
  vec2 id = floor(bg); vec2 f = fract(bg) - 0.5;
  float hh = hash21(id);
  vec2 off = vec2(hash21(id + 5.0) - 0.5, hash21(id + 8.0) - 0.5) * 0.5;
  float r = 0.16 + 0.14 * hash21(id + 2.0);
  float disc = (1.0 - smoothstep(r * 0.7, r, length(f - off))) * step(0.42, hh) * step(uv.y, 0.62);
  float breathe = 1.0 + 0.10 * sin(uTime * 6.2831853 * (0.1 + 0.2 * hash21(id + 1.0)) + hh * 30.0);
  vec3 bk = mix(uRain * 1.4, uBokeh, step(0.55, hash21(id + 3.0)));
  col += bk * disc * 0.8 * breathe;
  // rain: two layers of sliding drops, plus still droplets
  float d1 = drop(uv * vec2(1.0, 1.0), uTime, 9.0, 3.0, 1.0);
  float d2 = drop(uv, uTime * 0.7, 15.0, 5.0, 7.0) * 0.8;
  float still = step(0.97, hash21(floor(uv * vec2(60.0, 120.0)))) * 0.5;
  float w = clamp(d1 + d2 + still, 0.0, 1.0);
  col = mix(col, col * 1.7 + vec3(0.12, 0.16, 0.22), w);
  col *= 1.0 - 0.35 * smoothstep(0.35, 0.0, abs(uv.x - 0.5) - 0.0) * 0.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function BedroomRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = BEDROOM_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 6);
  const w = S;
  const h = S / BEDROOM_SCREEN.aspect;
  const cat = useRef<Group>(null);
  useFrame((s) => {
    if (cat.current)
      cat.current.scale.y = calm ? 1 : 1 + 0.01 * Math.sin((2 * Math.PI * s.clock.elapsedTime) / 4);
  });

  const rain = useMemo(
    () =>
      roomMaterial(u, {
        vertex: RAIN_VERT,
        fragment: RAIN_FRAG,
        transparent: false,
        depthWrite: true,
        uniforms: {
          uRain: { value: new Color(P.rainLight) },
          uBokeh: { value: new Color(P.bokeh) },
          uAspect: { value: WINDOW.w / WINDOW.h },
        },
      }),
    [u],
  );
  useEffect(() => () => rain.dispose(), [rain]);

  const set = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const z = 0;
    // black surround (flush, behind the rect plane) and the wall-hung bracket
    const m = 0.03 * S;
    L.push({ p: [0, h / 2 + m / 2, -0.004 * S], s: [w + 2 * m, m, 0.01 * S], c: P.surround });
    L.push({ p: [0, -h / 2 - m / 2, -0.004 * S], s: [w + 2 * m, m, 0.01 * S], c: P.surround });
    L.push({ p: [-w / 2 - m / 2, 0, -0.004 * S], s: [m, h, 0.01 * S], c: P.surround });
    L.push({ p: [w / 2 + m / 2, 0, -0.004 * S], s: [m, h, 0.01 * S], c: P.surround });
    // low chest under the screen
    L.push({ p: [0, -0.43 * S, 0.06 * S], s: [0.9 * S, 0.14 * S, 0.22 * S], c: P.wood });
    L.push({ p: [0, -0.355 * S, 0.06 * S], s: [0.93 * S, 0.012 * S, 0.24 * S], c: '#5a4230' });
    for (const x of [-0.2, 0.2])
      L.push({ p: [x * S, -0.43 * S, 0.172 * S], s: [0.36 * S, 0.1 * S, 0.004 * S], c: '#3d2b1f' });
    // window frame
    const t = 0.016 * S;
    const { x, y, w: ww, h: hh } = WINDOW;
    L.push({
      p: [x * S, (y + hh / 2) * S + t / 2, -0.005 * S],
      s: [(ww + 0.04) * S, t, 0.03 * S],
      c: P.wood,
    });
    L.push({
      p: [x * S, (y - hh / 2) * S - t / 2, -0.005 * S],
      s: [(ww + 0.04) * S, t, 0.03 * S],
      c: P.wood,
    });
    L.push({
      p: [(x - ww / 2) * S - t / 2, y * S, -0.005 * S],
      s: [t, hh * S, 0.03 * S],
      c: P.wood,
    });
    L.push({
      p: [(x + ww / 2) * S + t / 2, y * S, -0.005 * S],
      s: [t, hh * S, 0.03 * S],
      c: P.wood,
    });
    L.push({ p: [x * S, y * S, -0.004 * S], s: [0.008 * S, hh * S, 0.02 * S], c: P.wood });
    L.push({ p: [x * S, (y + 0.1) * S, -0.004 * S], s: [ww * S, 0.008 * S, 0.02 * S], c: P.wood });
    // sill
    L.push({
      p: [x * S, (y - hh / 2) * S - 0.03 * S, 0.01 * S],
      s: [(ww + 0.08) * S, 0.018 * S, 0.06 * S],
      c: '#5a4230',
    });
    // curtain edge, left of the window
    L.push({
      p: [(x - ww / 2 - 0.05) * S, (y + 0.02) * S, 0.0],
      s: [0.05 * S, (hh + 0.14) * S, 0.03 * S],
      c: '#4a4466',
    });
    // bedside lamp
    const lx = 0.72;
    L.push({ p: [lx * S, -0.42 * S, 0.05 * S], s: [0.1 * S, 0.1 * S, 0.1 * S], c: P.wood });
    L.push({ p: [lx * S, -0.3 * S, 0.05 * S], s: [0.014 * S, 0.12 * S, 0.014 * S], c: '#2a2a2e' });
    L.push({ p: [lx * S, -0.2 * S, 0.05 * S], s: [0.11 * S, 0.1 * S, 0.11 * S], c: P.lamp });
    // mug
    L.push({ p: [0.6 * S, -0.355 * S, 0.1 * S], s: [0.04 * S, 0.045 * S, 0.04 * S], c: P.mug });
    // plant on the right
    L.push({ p: [0.74 * S, -0.04 * S, 0.02 * S], s: [0.07 * S, 0.07 * S, 0.07 * S], c: '#2b2630' });
    for (let i = 0; i < 6; i += 1)
      L.push({
        p: [(0.74 + (i - 2.5) * 0.02) * S, (0.07 + (i % 3) * 0.03) * S, 0.02 * S],
        s: [0.018 * S, 0.1 * S, 0.012 * S],
        c: '#2f5a44',
        rz: (i - 2.5) * 0.22,
      });
    // wall art: abstract shapes
    L.push({ p: [0.7 * S, 0.3 * S, -0.01 * S], s: [0.14 * S, 0.2 * S, 0.01 * S], c: '#c9a24a' });
    L.push({
      p: [0.7 * S, 0.3 * S, -0.004 * S],
      s: [0.06 * S, 0.06 * S, 0.01 * S],
      c: '#5a7a9a',
      rz: 0.78,
    });
    // blanket along the bottom edge, in front
    L.push({ p: [0, -0.44 * S, 0.34 * S], s: [2.2 * S, 0.2 * S, 0.3 * S], c: P.blanket });
    L.push({
      p: [-0.3 * S, -0.345 * S, 0.34 * S],
      s: [0.6 * S, 0.02 * S, 0.28 * S],
      c: '#7c6c8d',
      rz: 0.04,
    });
    L.push({
      p: [0.35 * S, -0.352 * S, 0.34 * S],
      s: [0.5 * S, 0.02 * S, 0.28 * S],
      c: '#7c6c8d',
      rz: -0.05,
    });
    void z;
    return L;
  }, [S, w, h]);

  const fairy = useMemo(() => {
    const a: number[] = [];
    for (let i = 0; i < 10; i += 1)
      a.push((-0.82 + i * 0.026) * S, (0.5 - Math.sin(i * 0.6) * 0.012) * S, 0.0);
    for (let i = 1; i < 7; i += 1) a.push(-0.83 * S, (0.5 - i * 0.07) * S, 0.0);
    return new Float32Array(a);
  }, [S]);
  const steam = useMemo<PuffSpec[]>(() => {
    const r = rng(2);
    return Array.from({ length: quality === 'low' ? 4 : 8 }, (_, i) => ({
      x: 0.6 * S + (r() - 0.5) * 0.01 * S,
      y: -0.33 * S,
      z: 0.1 * S,
      w: 0.05 * S,
      h: 0.05 * S + i * 0,
    }));
  }, [S, quality]);

  return (
    <group name="bedroom">
      <ambientLight intensity={0.9} color="#8a93c0" />
      <SpillLight
        u={u}
        base={0.3 * 2}
        position={[0, 0.1 * S, 1.0 * S]}
        colour="#9fb8d8"
        distance={6 * S}
      />
      <SpillLight
        u={u}
        base={0.9}
        position={[0.66 * S, -0.16 * S, 0.3 * S]}
        colour={P.lamp}
        distance={3 * S}
        steady
      />
      <GradQuad position={[0, 0, -0.03 * S]} size={[7 * S, 4 * S]} top="#2f3350" bottom="#454b6e" />
      <mesh position={[WINDOW.x * S, WINDOW.y * S, -0.01 * S]} material={rain}>
        <planeGeometry args={[WINDOW.w * S, WINDOW.h * S]} />
      </mesh>
      <Boxes specs={set} />
      <Glow
        u={u}
        position={[0, 0, -0.02 * S]}
        size={[w * 1.8, h * 2.2]}
        colour="#9fc0e0"
        base={0.3}
        spill
      />
      <Glow
        u={u}
        position={[0.72 * S, -0.18 * S, 0.08 * S]}
        size={[0.5 * S, 0.5 * S]}
        colour={P.lamp}
        base={0.55}
        fade
      />
      <Glow
        u={u}
        position={[WINDOW.x * S, WINDOW.y * S, 0.02 * S]}
        size={[0.5 * S, 1.1 * S]}
        colour={P.rainLight}
        base={0.12}
        spill
      />
      <PointSprites
        uniforms={u}
        positions={fairy}
        colour="#ffd9a0"
        size={[3, 5]}
        alpha={0.95}
        twinkle={0.1}
        twinkleHz={[0.2, 0.6]}
        additive
        renderOrder={9}
      />
      <PuffLayer
        uniforms={u}
        puffs={steam}
        top="#e6ebf5"
        shadow="#9aa8c0"
        riseSpeed={0.05 * S}
        rise={0.16 * S}
        opacity={0.4}
        seed={4}
        renderOrder={12}
        hideInCalm
      />
      <group ref={cat} position={[0.5 * S, -0.31 * S, 0.4 * S]}>
        <Boxes
          specs={[
            { p: [0, 0, 0], s: [0.16 * S, 0.06 * S, 0.08 * S], c: '#17151c' },
            { p: [0.095 * S, 0.01 * S, 0], s: [0.06 * S, 0.055 * S, 0.06 * S], c: '#17151c' },
            {
              p: [0.11 * S, 0.045 * S, 0.02 * S],
              s: [0.014 * S, 0.026 * S, 0.014 * S],
              c: '#17151c',
              rz: 0.3,
            },
            {
              p: [0.11 * S, 0.045 * S, -0.02 * S],
              s: [0.014 * S, 0.026 * S, 0.014 * S],
              c: '#17151c',
              rz: -0.1,
            },
          ]}
          flat
        />
      </group>
      <DimOverlay dim={dim} />
    </group>
  );
}
