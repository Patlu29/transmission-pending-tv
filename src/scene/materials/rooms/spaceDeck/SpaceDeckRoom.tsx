/**
 * Space deck: a bulkhead with the flat screen at its centre, two tall windows onto a procedural Earth and stars,
 * handrail, floor light strips, floating dust in the windows and lower region. Anchor space, units of `widthM` (3 m).
 * No imagery: Earth, clouds and stars are noise in a shader.
 */
import { useEffect, useMemo } from 'react';
import { Color, DoubleSide, Path, Shape, ShapeGeometry } from 'three';
import {
  roomMaterial,
  useRoomClock,
  useRoomUniforms,
  rng,
  type BoxSpec,
  type RoomProps,
} from '../roomKit.ts';
import { Boxes, DimOverlay, Glow, PointSprites, SpillLight } from '../roomParts.tsx';
import { SPACE_DECK_SCREEN, SPACE_DECK_PALETTE } from '../specs.ts';

const P = SPACE_DECK_PALETTE;

const WIN = { cx: 0.67, w: 0.18, h: 0.92 }; // in units of S, centre x of each window

const EARTH_VERT = /* glsl */ `
varying vec2 vXY;
void main() { vXY = (modelMatrix * vec4(position, 1.0)).xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
const EARTH_FRAG = /* glsl */ `
varying vec2 vXY;
uniform vec3 uOcean; uniform vec3 uCloud; uniform vec3 uSun;
uniform float uS;
void main() {
  vec2 p = vXY / uS;
  vec2 c = vec2(0.0, -2.05);
  float R = 2.45;
  vec2 q = (p - c) / R;
  float r = length(q);
  vec3 col = vec3(0.0);
  // stars
  vec2 g = floor(p * 150.0);
  float h = hash21(g);
  float tw = 0.9 + 0.1 * sin(uTime * (0.6 + h * 5.0) + h * 40.0);
  col += vec3(1.0) * step(0.985, h) * (0.6 + 0.4 * hash21(g + 3.0)) * tw * smoothstep(0.5, 0.15, length(fract(p * 150.0) - 0.5));
  if (r < 1.0) {
    float z = sqrt(1.0 - r * r);
    vec3 n = vec3(q, z);
    float rot = uTime * 6.2831853 / 120.0;           // one turn per 120 s
    float lon = atan(n.x, n.z) + rot;
    float lat = asin(clamp(n.y, -1.0, 1.0));
    vec2 sph = vec2(lon * 1.6, lat * 2.4);
    float land = smoothstep(0.52, 0.62, fbm(sph * 1.3 + 4.0));
    float cl = smoothstep(0.45, 0.78, fbm(sph * 2.2 + vec2(uTime * 0.004, 0.0)));
    vec3 base = mix(uOcean, vec3(0.30, 0.45, 0.34), land * 0.8);
    base = mix(base, uCloud, cl * 0.9);
    // sun from the right, drifting slowly (40 s)
    float sa = 0.35 + 0.18 * sin(6.2831853 * uTime / 40.0);
    vec3 sd = normalize(vec3(cos(sa), 0.35, 0.55));
    float lit = clamp(dot(n, sd), 0.0, 1.0);
    base *= 0.10 + 0.95 * smoothstep(0.0, 0.7, lit);
    float rim = pow(1.0 - z, 3.0);
    base += vec3(0.35, 0.6, 1.0) * rim * 0.55 * (0.3 + lit);
    base += uSun * pow(rim, 1.5) * smoothstep(0.55, 1.0, lit) * (1.0 + 0.05 * sin(uTime * 0.628));
    col = base;
  } else {
    float glow = exp(-(r - 1.0) * 38.0);
    float sa = 0.35 + 0.18 * sin(6.2831853 * uTime / 40.0);
    float side = max(0.0, dot(normalize(q), vec2(cos(sa), 0.35)));
    col += vec3(0.30, 0.55, 1.0) * glow * 0.5 + uSun * glow * pow(side, 4.0) * 0.7;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export function SpaceDeckRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = SPACE_DECK_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const D = props.watchDistance ?? 1.6 * S;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 20);
  const w = S;
  const h = S / SPACE_DECK_SCREEN.aspect;

  const bulkhead = useMemo(() => {
    const W = 7 * S;
    const H = 4 * S;
    const shape = new Shape();
    shape.moveTo(-W / 2, -H / 2);
    shape.lineTo(W / 2, -H / 2);
    shape.lineTo(W / 2, H / 2);
    shape.lineTo(-W / 2, H / 2);
    shape.closePath();
    for (const sx of [-1, 1]) {
      const hole = new Path();
      const x0 = sx * WIN.cx * S - (WIN.w * S) / 2;
      const x1 = x0 + WIN.w * S;
      const y0 = -(WIN.h * S) / 2;
      const y1 = y0 + WIN.h * S;
      const r = 0.05 * S;
      hole.moveTo(x0 + r, y0);
      hole.lineTo(x1 - r, y0);
      hole.quadraticCurveTo(x1, y0, x1, y0 + r);
      hole.lineTo(x1, y1 - r);
      hole.quadraticCurveTo(x1, y1, x1 - r, y1);
      hole.lineTo(x0 + r, y1);
      hole.quadraticCurveTo(x0, y1, x0, y1 - r);
      hole.lineTo(x0, y0 + r);
      hole.quadraticCurveTo(x0, y0, x0 + r, y0);
      shape.holes.push(hole);
    }
    return new ShapeGeometry(shape);
  }, [S]);
  const earth = useMemo(
    () =>
      roomMaterial(u, {
        vertex: EARTH_VERT,
        fragment: EARTH_FRAG,
        transparent: false,
        depthWrite: true,
        uniforms: {
          uOcean: { value: new Color(P.ocean) },
          uCloud: { value: new Color(P.cloud) },
          uSun: { value: new Color(P.sunrise) },
          uS: { value: S },
        },
      }),
    [u, S],
  );
  useEffect(
    () => () => {
      bulkhead.dispose();
      earth.dispose();
    },
    [bulkhead, earth],
  );

  const props3d = useMemo<BoxSpec[]>(() => {
    const z0 = -0.002 * S;
    const L: BoxSpec[] = [];
    // dark surround and a hairline of light around the screen (outside the rect plus a margin)
    const m = 0.07 * S;
    L.push({ p: [0, h / 2 + m / 2, z0 + 0.001], s: [w + 2 * m, m, 0.004], c: '#14171c' });
    L.push({ p: [0, -h / 2 - m / 2, z0 + 0.001], s: [w + 2 * m, m, 0.004], c: '#14171c' });
    L.push({ p: [-w / 2 - m / 2, 0, z0 + 0.001], s: [m, h, 0.004], c: '#14171c' });
    L.push({ p: [w / 2 + m / 2, 0, z0 + 0.001], s: [m, h, 0.004], c: '#14171c' });
    L.push({
      p: [0, h / 2 + m + 0.004 * S, z0 + 0.002],
      s: [w + 2 * m + 0.01 * S, 0.004 * S, 0.004],
      c: P.accent,
    });
    // seams in the hull
    for (const y of [-0.62, 0.62])
      L.push({ p: [0, y * S, z0 + 0.0005], s: [7 * S, 0.006 * S, 0.003], c: '#7d848f' });
    for (const x of [-1.2, -0.3, 0.3, 1.2])
      L.push({ p: [x * S, 0, z0 + 0.0005], s: [0.005 * S, 4 * S, 0.003], c: '#7d848f' });
    // window frames
    for (const sx of [-1, 1]) {
      const cx = sx * WIN.cx * S;
      const fw = WIN.w * S;
      const fh = WIN.h * S;
      const t = 0.014 * S;
      L.push({ p: [cx, fh / 2 + t / 2, z0 + 0.003], s: [fw + 2 * t, t, 0.01], c: P.panel });
      L.push({ p: [cx, -fh / 2 - t / 2, z0 + 0.003], s: [fw + 2 * t, t, 0.01], c: P.panel });
      L.push({ p: [cx - fw / 2 - t / 2, 0, z0 + 0.003], s: [t, fh, 0.01], c: P.panel });
      L.push({ p: [cx + fw / 2 + t / 2, 0, z0 + 0.003], s: [t, fh, 0.01], c: P.panel });
    }
    return L;
  }, [S, w, h]);

  // Rail and floor lights, in front of the bulkhead, placed with the perspective of their depth.
  const front = useMemo<BoxSpec[]>(() => {
    const z = 0.25 * S;
    const k = (D - z) / D;
    const L: BoxSpec[] = [];
    L.push({ p: [0, -0.44 * S * k, z], s: [2.6 * S * k, 0.018 * S, 0.02 * S], c: P.rail });
    for (const x of [-1, -0.5, 0, 0.5, 1])
      L.push({ p: [x * S * k, -0.49 * S * k, z], s: [0.012 * S, 0.1 * S, 0.012 * S], c: P.rail });
    // floor light strips
    for (const sx of [-1, 1])
      L.push({
        p: [sx * 0.45 * S, -0.465 * S, 0.5 * S],
        s: [0.24 * S, 0.006 * S, 0.01 * S],
        c: P.accent,
      });
    // cables hanging at the lower corners
    for (const sx of [-1, 1])
      for (let i = 0; i < 4; i += 1)
        L.push({
          p: [sx * (0.81 - i * 0.006) * S, (-0.3 - i * 0.05) * S, 0.05 * S],
          s: [0.006 * S, 0.06 * S, 0.006 * S],
          c: '#20242b',
          rz: sx * 0.12,
        });
    return L;
  }, [S, D]);

  const dust = useMemo(() => {
    const r = rng(14);
    const n = quality === 'low' ? 12 : 26;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const inWindow = i % 2 === 0;
      const sx = i % 4 < 2 ? -1 : 1;
      if (inWindow)
        a.set(
          [sx * (WIN.cx + (r() - 0.5) * WIN.w * 0.9) * S, (r() - 0.5) * WIN.h * 0.9 * S, 0.1 * S],
          i * 3,
        );
      else a.set([(r() - 0.5) * 1.5 * S, (-0.43 + r() * 0.07) * S, 0.3 * S], i * 3);
    }
    return a;
  }, [S, quality]);

  return (
    <group name="space-deck">
      <ambientLight intensity={0.55} color="#dfe6f3" />
      <SpillLight
        u={u}
        base={0.22 * 3}
        position={[0, 0, 1.2 * S]}
        colour="#dfeaff"
        distance={8 * S}
      />
      <mesh position={[0, -0.9 * S, -1.5 * S]} material={earth} renderOrder={-50}>
        <planeGeometry args={[7 * S, 5.4 * S]} />
      </mesh>
      <mesh geometry={bulkhead} position={[0, 0, -0.01 * S]}>
        <meshLambertMaterial color={P.hull} side={DoubleSide} />
      </mesh>
      <Boxes specs={props3d} />
      <Boxes specs={front} />
      <Glow
        u={u}
        position={[0, 0, -0.005 * S]}
        size={[w * 1.9, h * 2.1]}
        colour="#dfeaff"
        base={0.22}
        spill
      />
      <PointSprites
        uniforms={u}
        positions={dust}
        colour="#e8eef7"
        size={[1.5, 3]}
        alpha={0.6}
        velocity={[0.004 * S, 0.006 * S, 0]}
        wrap={[0.05 * S, 0.1 * S, 0.02 * S]}
        hideInCalm
        renderOrder={8}
      />
      <DimOverlay dim={dim} />
    </group>
  );
}
