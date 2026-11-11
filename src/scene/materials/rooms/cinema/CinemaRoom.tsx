/**
 * Cinema: an empty auditorium from the middle of the house. Proscenium, open curtains with heavy folds, seat backs
 * (merged, one draw call), sconces, aisle lights, a projector beam visible only above the screen, dust motes in it.
 * Anchor space, units of `widthM` (6 m). No curved screen.
 */
import { useMemo } from 'react';
import { Color, DoubleSide } from 'three';
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
  CanvasSign,
  DimOverlay,
  Glow,
  GradQuad,
  PointSprites,
  SpillLight,
} from '../roomParts.tsx';
import { CINEMA_SCREEN, CINEMA_PALETTE } from '../specs.ts';
import { proj } from '../roomKit.ts';

const P = CINEMA_PALETTE;

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
// A wedge from an apex at the top centre widening towards the screen; fades by keepFade so it cannot enter the rect.
const BEAM_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  float down = 1.0 - vUv.y;                        // 0 at the apex (top), 1 at the screen
  float hw = 0.04 + down * 0.5;
  float a = (1.0 - smoothstep(hw * 0.55, hw, abs(vUv.x - 0.5))) * (0.35 + 0.65 * down);
  a *= 0.16 * uSpill * keepFade();
  gl_FragColor = vec4(1.0, 0.93, 0.8, a);
}
`;

export function CinemaRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = CINEMA_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const D = props.watchDistance ?? 1.5 * S;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 15);
  const w = S;
  const h = S / CINEMA_SCREEN.aspect;
  const beam = useMemo(
    () =>
      roomMaterial(u, {
        vertex: BEAM_VERT,
        fragment: BEAM_FRAG,
        side: DoubleSide as unknown as typeof DoubleSide,
      }),
    [u],
  );

  const set = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const r = rng(3);
    // proscenium frame: black surround and a gold trim ring
    const m = 0.035 * S;
    L.push({ p: [0, h / 2 + m / 2, -0.01 * S], s: [w + 2 * m, m, 0.02 * S], c: '#050405' });
    L.push({ p: [0, -h / 2 - m / 2, -0.01 * S], s: [w + 2 * m, m, 0.02 * S], c: '#050405' });
    L.push({ p: [-w / 2 - m / 2, 0, -0.01 * S], s: [m, h, 0.02 * S], c: '#050405' });
    L.push({ p: [w / 2 + m / 2, 0, -0.01 * S], s: [m, h, 0.02 * S], c: '#050405' });
    L.push({
      p: [0, h / 2 + m + 0.007 * S, -0.005 * S],
      s: [w + 2 * m + 0.02 * S, 0.014 * S, 0.03 * S],
      c: P.gold,
    });
    // valance across the top, above the rect
    L.push({ p: [0, 0.4 * S, 0.02 * S], s: [2 * 0.72 * S, 0.06 * S, 0.04 * S], c: '#3a1019' });
    // curtains: heavy folds as alternating strips left and right, outside the rect plus halo
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 9; i += 1) {
        const shade = i % 2 ? P.curtain : '#3a1019';
        L.push({
          p: [sx * (0.57 + i * 0.016) * S, 0.02 * S, 0.02 * S + (i % 3) * 0.006 * S],
          s: [0.02 * S, 0.98 * S, 0.03 * S],
          c: shade,
        });
      }
      L.push({
        p: [sx * 0.585 * S, 0.37 * S, 0.04 * S],
        s: [0.16 * S, 0.014 * S, 0.02 * S],
        c: P.gold,
      });
      // sconces down the side walls
      for (const y of [0.1, -0.12]) {
        L.push({
          p: [sx * 0.69 * S, y * S, 0.1 * S],
          s: [0.02 * S, 0.05 * S, 0.02 * S],
          c: P.gold,
        });
        L.push({
          p: [sx * 0.665 * S, y * S, 0.1 * S],
          s: [0.012 * S, 0.034 * S, 0.016 * S],
          c: '#ffe2b0',
        });
      }
    }
    // seat backs: three rows in the lower foreground, placed by their projected position (tops under the rect)
    const rows = [
      { z: 0.55 * S, top: -0.385, n: 16 },
      { z: 0.35 * S, top: -0.41, n: 14 },
    ];
    rows.forEach((row, ri) => {
      const k = proj(D, row.z);
      for (let i = 0; i < row.n; i += 1) {
        const x = (-0.65 + (i / (row.n - 1)) * 1.3) * S * k;
        const gap = (i === 3 || i === row.n - 4) && ri === 0 ? 0.05 : 0; // aisles
        L.push({
          p: [x, (row.top - 0.07) * S * k, row.z],
          s: [0.075 * S * k, 0.16 * S * k, 0.04 * S],
          c: ri ? '#52171f' : P.seats,
        });
        void gap;
      }
    });
    // audience heads in the lower corners, kept 24 px below and outside the rect
    for (const [x, y] of [
      [-0.6, -0.33],
      [0.58, -0.34],
      [-0.52, -0.36],
    ] as const) {
      L.push({ p: [x * S, y * S, 0.3 * S], s: [0.045 * S, 0.055 * S, 0.04 * S], c: '#060506' });
      L.push({
        p: [x * S, (y - 0.06) * S, 0.3 * S],
        s: [0.09 * S, 0.06 * S, 0.04 * S],
        c: '#060506',
      });
    }
    // aisle lights on the floor
    for (let i = 0; i < 6; i += 1)
      L.push({
        p: [(-0.62 + i * 0.25) * S, -0.43 * S, 0.7 * S],
        s: [0.012 * S, 0.006 * S, 0.012 * S],
        c: P.aisle,
      });
    void r;
    return L;
  }, [S, w, h, D]);

  const motes = useMemo(() => {
    const r = rng(33);
    const n = quality === 'low' ? 14 : 30;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1)
      a.set([(r() - 0.5) * 0.7 * S, (0.33 + r() * 0.1) * S, 0.05 * S], i * 3);
    return a;
  }, [S, quality]);

  return (
    <group name="cinema">
      <GradQuad
        position={[0, 0, -0.1 * S]}
        size={[6 * S, 3.4 * S]}
        top="#0b080a"
        bottom="#1e1519"
      />
      <Boxes specs={set} flat />
      <mesh material={beam} position={[0, 0.375 * S, 0.0]} renderOrder={4} frustumCulled={false}>
        <planeGeometry args={[0.95 * S, 0.17 * S]} />
      </mesh>
      <Glow
        u={u}
        position={[0, -0.36 * S, 0.4 * S]}
        size={[1.6 * S, 0.4 * S]}
        colour="#ffe6c0"
        base={0.3}
        spill
      />
      <Glow
        u={u}
        position={[0, 0, -0.02 * S]}
        size={[w * 1.6, h * 1.9]}
        colour="#fff0d8"
        base={0.12}
        spill
      />
      <PointSprites
        uniforms={u}
        positions={motes}
        colour="#fff0d0"
        size={[1.5, 3]}
        alpha={0.7}
        velocity={[0.002 * S, -0.003 * S, 0]}
        wrap={[0.04 * S, 0.06 * S, 0.01]}
        hideInCalm
        additive
        renderOrder={9}
      />
      <CanvasSign
        position={[-0.62 * S, 0.37 * S, 0.1 * S]}
        size={[0.1 * S, 0.034 * S]}
        text="EXIT"
        fg="#ffffff"
        bg={P.exit}
      />
      <SpillLight u={u} base={0.3} position={[0, 0, 0.8 * S]} colour="#ffe6c0" distance={4 * S} />
      <DimOverlay dim={dim} />
    </group>
  );
}
void Color;
