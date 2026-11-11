/**
 * 1970s TV room extras for live channels (design-spec-v2 5.1): table lamp with doily on the shelf to the right of the
 * set, a rug edge at the bottom of frame, and a bezel-ring shader (low-alpha scanlines and a soft inner glow at the
 * opening edge only, plus the 300 ms channel-change static burst). Units: the TvBody's (cabinet width = 1), origin at
 * the screen centre. Mount next to `<TvBody tint={colourActive ? 1 : 0} />`. `colourActive` is `useColourActive()`.
 */
import { useEffect, useMemo } from 'react';
import { Path, Shape, ShapeGeometry } from 'three';
import { TV_LAYOUT } from '../../tv/layout.ts';
import { TV_ROOM_PALETTE } from '../specs.ts';
import {
  roomMaterial,
  useRoomClock,
  useRoomUniforms,
  type BoxSpec,
  type RoomProps,
} from '../roomKit.ts';
import { Boxes, Glow, SpillLight } from '../roomParts.tsx';

const P = TV_ROOM_PALETTE;

const RING_VERT = /* glsl */ `
varying vec2 vXY;
void main() { vXY = position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
const RING_FRAG = /* glsl */ `
varying vec2 vXY;
uniform vec2 uHole; uniform float uBurst; uniform float uRing;
void main() {
  vec2 q = abs(vXY) - uHole;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);         // distance from the opening edge (positive outside)
  float scan = 0.5 + 0.5 * cos(vXY.y / 0.0035 * 6.2831853);
  float glow = exp(-max(d, 0.0) / (uRing * 0.35));
  float a = (0.07 * scan + 0.16 * glow) * (1.0 - 0.0);
  float grain = hash21(floor(vXY * 260.0) + floor(uTime * 12.0));
  a += uBurst * (0.35 * grain + 0.1);
  gl_FragColor = vec4(0.82, 0.84, 0.88, a * (1.0 - smoothstep(uRing * 0.9, uRing, d)));
}
`;

function setBurst(m: { uniforms: Record<string, { value: unknown }> }, v: number): void {
  m.uniforms.uBurst!.value = v;
}

export function TvRoomExtras(
  props: RoomProps & {
    /** `useColourActive()`: warm lamp glow and tinted extras only when true. */
    colourActive?: boolean;
    /** 0..1 channel-change static burst on the bezel ring (300 ms, at most once per 1000 ms). Ignored in Calm. */
    burst?: number;
  },
) {
  const { calm, colourActive = false, burst = 0 } = props;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 14);
  const s = TV_LAYOUT.screen;
  const ox = -TV_LAYOUT.screenCx;
  const shelfY = TV_LAYOUT.shelfY;

  const ring = useMemo(() => {
    const ringW = 0.028;
    const outer = new Shape();
    const ow = s.width + 2 * ringW;
    const oh = s.height + 2 * ringW;
    outer.moveTo(-ow / 2, -oh / 2);
    outer.lineTo(ow / 2, -oh / 2);
    outer.lineTo(ow / 2, oh / 2);
    outer.lineTo(-ow / 2, oh / 2);
    outer.closePath();
    const hole = new Path();
    hole.moveTo(-s.width / 2, -s.height / 2);
    hole.lineTo(-s.width / 2, s.height / 2);
    hole.lineTo(s.width / 2, s.height / 2);
    hole.lineTo(s.width / 2, -s.height / 2);
    hole.closePath();
    outer.holes.push(hole);
    return {
      geo: new ShapeGeometry(outer),
      mat: roomMaterial(u, {
        vertex: RING_VERT,
        fragment: RING_FRAG,
        uniforms: {
          uHole: { value: [s.width / 2, s.height / 2] },
          uBurst: { value: 0 },
          uRing: { value: ringW },
        },
      }),
    };
  }, [u, s.width, s.height]);
  useEffect(() => {
    setBurst(ring.mat, calm ? 0 : Math.min(1, Math.max(0, burst)));
  }, [ring, burst, calm]);
  useEffect(
    () => () => {
      ring.geo.dispose();
      ring.mat.dispose();
    },
    [ring],
  );

  const lampX = 0.9 + ox * 0 + 0.0;
  const props3d = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const base = shelfY + 0.004;
    // doily under the lamp
    L.push({ p: [lampX, base, -0.2], s: [0.2, 0.004, 0.2], c: '#d8d0bc' });
    // lamp: base, stem, shade (the top stays under the glass top)
    L.push({
      p: [lampX, base + 0.05, -0.2],
      s: [0.07, 0.1, 0.07],
      c: colourActive ? '#5a3b24' : '#3a3a3a',
    });
    L.push({ p: [lampX, base + 0.13, -0.2], s: [0.012, 0.08, 0.012], c: '#222222' });
    L.push({
      p: [lampX, base + 0.22, -0.2],
      s: [0.16, 0.11, 0.16],
      c: colourActive ? P.lampShade : '#bdbdbd',
    });
    L.push({
      p: [lampX, base + 0.285, -0.2],
      s: [0.1, 0.02, 0.1],
      c: colourActive ? '#c9822f' : '#8c8c8c',
    });
    // rug edge at the bottom of frame
    L.push({
      p: [ox, shelfY - 0.2, 0.9],
      s: [4, 0.02, 0.7],
      c: colourActive ? '#7a2a1c' : '#3a3a3a',
    });
    for (let i = 0; i < 6; i += 1)
      L.push({
        p: [ox + (i - 2.5) * 0.5, shelfY - 0.188, 0.9],
        s: [0.08, 0.002, 0.7],
        c: colourActive ? '#c9a24a' : '#8c8c8c',
      });
    return L;
  }, [colourActive, ox, shelfY, lampX]);

  return (
    <group name="tv-room-extras">
      <mesh geometry={ring.geo} material={ring.mat} position={[0, 0, 0.0245]} renderOrder={3} />
      <Boxes specs={props3d} flat />
      <Glow
        u={u}
        position={[lampX, shelfY + 0.22, -0.12]}
        size={[0.7, 0.7]}
        colour={colourActive ? P.lampGlow : '#e0e0e0'}
        base={0.15}
        fade={false}
      />
      <SpillLight
        u={u}
        base={0.22}
        position={[0, 0, 0.5]}
        colour={colourActive ? '#ffe8c8' : '#ffffff'}
        distance={3}
      />
    </group>
  );
}
