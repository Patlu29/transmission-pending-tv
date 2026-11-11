/**
 * Mountain sky (the hero room). A summit at late dusk above a sea of clouds; the flat 16:9 screen hangs in the sky.
 * Anchor space: origin at the screen centre, +Z towards the viewer, units of `widthM` (default 12 m).
 * Nothing here is mapped from video. Nothing renders inside the player rect plus 24 px (shared `keepFade`).
 * Frozen Calm state: stars, clouds and aurora at a fixed frame; no birds, spindrift or sparkles.
 */
import { useEffect, useMemo } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import {
  mergeBoxes,
  rng,
  roomMaterial,
  useRoomClock,
  useRoomUniforms,
  type RoomProps,
  type RoomUniforms,
} from '../roomKit.ts';
import { DimOverlay, PointSprites, PuffLayer, SkyDome, type PuffSpec } from '../roomParts.tsx';
import { MOUNTAIN_SKY_SCREEN, MOUNTAIN_SKY_PALETTE } from '../specs.ts';
import { skyPoints } from '../roomKit.ts';

const P = MOUNTAIN_SKY_PALETTE;

const HORIZON_ELEV = -0.158; // the cloud line, 9 degrees below eye level

/* ---------------- ridges ---------------- */

function ridgeGeometry(
  seed: number,
  dist: number,
  base: number,
  peak: number,
  inner: number,
  cam: Vector3,
): BufferGeometry {
  const rand = rng(seed);
  const n = 72;
  const phiMax = 1.25;
  const vals: number[] = [];
  let ph = rand() * 10;
  for (let i = 0; i <= n; i += 1) {
    const phi = -phiMax + (2 * phiMax * i) / n;
    ph += 0.35 + rand() * 0.5;
    const mask = Math.min(1, Math.max(0, (Math.abs(phi) - inner) / 0.22));
    const ridged = 1 - Math.abs(Math.sin(ph) * 0.8 + Math.sin(ph * 2.7 + 1.3) * 0.45);
    const e =
      base + peak * mask * mask * (0.35 + 0.65 * Math.max(0, ridged)) + 0.012 * (rand() - 0.5);
    vals.push(e);
  }
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const phi = -phiMax + (2 * phiMax * i) / n;
    const x = cam.x + phi * dist;
    const z = cam.z - dist;
    const top = cam.y + dist * Math.tan(vals[i] ?? base);
    pos.push(x, top, z, x, cam.y - dist * 0.9, z);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function Ridges({ cam, S, quality }: { cam: Vector3; S: number; quality: 'high' | 'low' }) {
  const layers = useMemo(() => {
    // far, mid, near; peaks only in the outer columns, inner tops stay under the cloud line.
    const defs: Array<[number, number, number, number, number, string]> = [
      [11, 17 * S, HORIZON_ELEV - 0.035, 0.34, 0.4, P.farRidge],
      [23, 12.5 * S, HORIZON_ELEV - 0.05, 0.3, 0.44, P.midRidge],
      [37, 9.6 * S, HORIZON_ELEV - 0.06, 0.26, 0.5, P.nearRidge],
    ];
    return (quality === 'low' ? defs.slice(0, 2) : defs).map(([seed, d, b, pk, inn, c]) => ({
      geo: ridgeGeometry(seed, d, b, pk, inn, cam),
      mat: new MeshBasicMaterial({ color: c, toneMapped: false, side: DoubleSide }),
    }));
  }, [cam, S, quality]);
  useEffect(
    () => () =>
      layers.forEach((l) => {
        l.geo.dispose();
        l.mat.dispose();
      }),
    [layers],
  );
  return (
    <>
      {layers.map((l, i) => (
        <mesh
          key={i}
          geometry={l.geo}
          material={l.mat}
          renderOrder={-50 + i}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

/* ---------------- cloud sea ---------------- */

function CloudSea({
  u,
  cam,
  S,
  quality,
}: {
  u: RoomUniforms;
  cam: Vector3;
  S: number;
  quality: 'high' | 'low';
}) {
  const rows = useMemo(() => {
    const dists = quality === 'low' ? [4.4, 8.4] : [3.4, 4.2, 5.2, 6.4, 7.7, 9.2];
    const deps = quality === 'low' ? [17, 9.1] : [21, 17.4, 14.2, 11.8, 10.0, 8.9];
    return dists.map((dm, k) => {
      const d = dm * S;
      const y0 = cam.y - d * Math.tan((deps[k]! * Math.PI) / 180);
      const spacing = 0.085 * d;
      const span = 2.1 * d;
      const rand = rng(100 + k);
      const puffs: PuffSpec[] = [];
      for (let x = -span / 2; x < span / 2; x += spacing) {
        const s = 0.8 + rand() * 0.6;
        puffs.push({
          x: x + (rand() - 0.5) * spacing * 0.8,
          y: y0 + (rand() - 0.4) * 0.03 * d,
          z: cam.z - d,
          w: 0.22 * d * s,
          h: 0.115 * d * s,
        });
      }
      const far = k / (dists.length - 1);
      return { d, puffs, span, far, speed: ((k < 3 ? 3 : 7) * 0.574 * d) / 1080 };
    });
  }, [cam, S, quality]);
  return (
    <>
      {rows.map((r, k) => (
        <PuffLayer
          key={k}
          uniforms={u}
          puffs={r.puffs}
          top={P.cloudTop}
          shadow={P.cloudShadow}
          fog={P.horizon}
          fogAmount={0.12 + 0.34 * r.far}
          drift={r.speed * (quality === 'low' ? 0.5 : 1)}
          span={r.span}
          opacity={0.95}
          seed={k + 5}
          renderOrder={-20 + (rows.length - k)}
        />
      ))}
    </>
  );
}

/** A dark base under the nearest cloud row so no sky shows through below the sea. */
function SeaFloor({ cam, S }: { cam: Vector3; S: number }) {
  const geo = useMemo(() => {
    const d = 4.4 * S;
    const w = 3.2 * d;
    const top = cam.y - d * Math.tan((18 * Math.PI) / 180);
    const bottom = cam.y - d * 0.9;
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [-w, top, cam.z - d, w, top, cam.z - d, w, bottom, cam.z - d, -w, bottom, cam.z - d],
        3,
      ),
    );
    const c1 = new Color(P.cloudShadow).lerp(new Color(P.horizon), 0.15);
    const c2 = new Color(P.cloudShadow).multiplyScalar(0.55);
    g.setAttribute(
      'color',
      new Float32BufferAttribute(
        [c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c2.r, c2.g, c2.b],
        3,
      ),
    );
    g.setIndex([0, 2, 1, 0, 3, 2]);
    return g;
  }, [cam, S]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} renderOrder={-30} frustumCulled={false}>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
  );
}

/* ---------------- birds ---------------- */

const BIRD_VERT = /* glsl */ `
attribute vec4 aBird; // x, y, z, seed
varying vec2 vUv;
varying float vSeed;
uniform float uSpan;
uniform float uSize;
void main() {
  vUv = position.xy * 2.0;
  vSeed = aBird.w;
  float x = mod(aBird.x + 0.9 * uTime * uSize * 0.55 + uSpan * 0.5, uSpan) - uSpan * 0.5;
  float y = aBird.y + sin(uTime * 0.6 + aBird.w * 30.0) * uSize * 0.4;
  vec3 c = vec3(x, y, aBird.z) + vec3(position.x * uSize, position.y * uSize * 0.5, 0.0);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(c, 1.0);
}
`;
const BIRD_FRAG = /* glsl */ `
varying vec2 vUv;
varying float vSeed;
void main() {
  float flap = sin(uTime * 9.42 + vSeed * 20.0) * 0.5 + 0.5;       // 1.5 Hz wing-beat
  float x = abs(vUv.x);
  float v = x * (0.55 + 0.45 * flap) * 1.0;
  float line = abs(vUv.y * 1.4 + 0.15 - (0.55 * x - 0.35 * flap * x * x * 2.0)) ;
  float a = (1.0 - smoothstep(0.07, 0.16, line)) * (1.0 - smoothstep(0.7, 1.0, x));
  a *= keepFade() * (1.0 - uCalm);
  if (a < 0.01) discard;
  gl_FragColor = vec4(0.09, 0.08, 0.16, a * 0.9);
}
`;

function Birds({ u, cam, S }: { u: RoomUniforms; cam: Vector3; S: number }) {
  const { geo, mat } = useMemo(() => {
    const base = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position as Float32BufferAttribute);
    const rand = rng(77);
    const n = 8;
    const arr = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      const d = (5.5 + rand() * 2.2) * S;
      const dep = (10.5 + rand() * 6) * (Math.PI / 180);
      arr.set([(rand() - 0.5) * 2.2 * d, cam.y - d * Math.tan(dep), cam.z - d, rand()], i * 4);
    }
    g.setAttribute('aBird', new InstancedBufferAttribute(arr, 4));
    g.instanceCount = n;
    const m = roomMaterial(u, {
      vertex: BIRD_VERT,
      fragment: BIRD_FRAG,
      uniforms: { uSpan: { value: 4.6 * S }, uSize: { value: 0.16 * S } },
    });
    return { geo: g, mat: m };
  }, [u, cam, S]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} renderOrder={5} frustumCulled={false} />;
}

/* ---------------- ledge, cairn and trekking pole ---------------- */

function Ledge({ cam, S }: { cam: Vector3; S: number }) {
  const { geo, mat, cairn, pole } = useMemo(() => {
    const d = 1.0 * S;
    const z = cam.z - d;
    const rand = rng(5);
    const pos: number[] = [];
    const idx: number[] = [];
    const side = (sign: number): void => {
      const start = pos.length / 3;
      const xs = [0.04, 0.14, 0.22, 0.3, 0.38, 0.48, 0.62, 0.9];
      xs.forEach((fx, i) => {
        const x = sign * fx * S;
        const top =
          cam.y - d * (0.36 - 0.22 * Math.pow(fx / 0.9, 0.55)) + (rand() - 0.5) * 0.012 * S;
        pos.push(x, top, z, x, cam.y - d * 0.9, z);
        if (i < xs.length - 1) {
          const a = start + i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      });
    };
    side(-1);
    side(1);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // cairn: three stacked low-poly stones at lower left; pole leaning at lower right
    const topAt = (fx: number): number => cam.y - d * (0.36 - 0.22 * Math.pow(fx / 0.9, 0.55));
    const cx = -0.36 * S;
    const cy = topAt(0.36);
    const stones = mergeBoxes([
      {
        p: [cx, cy + 0.006 * S, z + 0.01 * S],
        s: [0.042 * S, 0.017 * S, 0.03 * S],
        c: P.nearRidge,
        rz: 0.1,
        ry: 0.4,
      },
      {
        p: [cx + 0.002 * S, cy + 0.022 * S, z + 0.01 * S],
        s: [0.03 * S, 0.015 * S, 0.024 * S],
        c: P.nearRidge,
        rz: -0.12,
        ry: 0.9,
      },
      {
        p: [cx - 0.001 * S, cy + 0.033 * S, z + 0.01 * S],
        s: [0.02 * S, 0.012 * S, 0.018 * S],
        c: P.nearRidge,
        rz: 0.2,
        ry: 0.2,
      },
    ]);
    const px = 0.36 * S;
    const poleG = mergeBoxes([
      {
        p: [px, topAt(0.36) + 0.065 * S, z + 0.01 * S],
        s: [0.003 * S, 0.14 * S, 0.003 * S],
        c: P.nearRidge,
        rz: -0.2,
      },
      {
        p: [px + 0.025 * S, topAt(0.36) + 0.13 * S, z + 0.01 * S],
        s: [0.008 * S, 0.024 * S, 0.008 * S],
        c: P.nearRidge,
        rz: -0.2,
      },
    ]);
    return {
      geo: g,
      mat: new MeshBasicMaterial({ color: P.nearRidge, toneMapped: false, side: DoubleSide }),
      cairn: stones,
      pole: poleG,
    };
  }, [cam, S]);
  const vmat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      cairn.dispose();
      pole.dispose();
      vmat.dispose();
    },
    [geo, mat, cairn, pole, vmat],
  );
  return (
    <>
      <mesh geometry={geo} material={mat} renderOrder={2} frustumCulled={false} />
      <mesh geometry={cairn} material={vmat} renderOrder={3} frustumCulled={false} />
      <mesh geometry={pole} material={vmat} renderOrder={3} frustumCulled={false} />
    </>
  );
}

/* ---------------- portal dressing (outside the rect, behind the rect plane) ---------------- */

const PILLAR_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uBase;
void main() {
  float across = 1.0 - smoothstep(0.0, 1.0, abs(vUv.x));
  float down = smoothstep(1.0, 0.0, vUv.y * 0.5 + 0.5);
  float a = pow(across, 2.5) * (1.0 - down * down) * uBase * uSpill;
  gl_FragColor = vec4(0.81, 0.85, 1.0, a);
}
`;
const GLOW_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uBase;
uniform vec3 uColour;
void main() {
  float r = length(vUv);
  float a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.8, 1.0, r));
  a = a * uBase * uSpill;
  gl_FragColor = vec4(uColour, a);
}
`;
const HALO_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec2 uHalf;   // rect half size
uniform float uFall;  // fade distance
uniform float uBase;
void main() {
  vec2 p = vUv * (uHalf + vec2(uFall));
  vec2 q = abs(p) - uHalf;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float a = (1.0 - smoothstep(0.0, uFall, d));
  a = a * a * step(0.0, d) * uBase * uSpill;
  gl_FragColor = vec4(0.72, 0.78, 1.0, a);
}
`;
const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;

function Portal({ u, S, aspect }: { u: RoomUniforms; S: number; aspect: number }) {
  const w = S;
  const h = S / aspect;
  const px = S / 1037; // about one CSS pixel at the watch pose on a 1440 wide window
  const { frame, pillar, glow, halo, mats } = useMemo(() => {
    const T = 0.01 * S;
    const gap = 2 * px;
    const hair = 2 * px;
    const zf = -0.0008 * S;
    const ow = w + 2 * gap; // frame inner
    const oh = h + 2 * gap;
    const boxes = [
      // frame
      { p: [0, oh / 2 + T / 2, zf], s: [ow + 2 * T, T, 0.001], c: P.frame },
      { p: [0, -oh / 2 - T / 2, zf], s: [ow + 2 * T, T, 0.001], c: P.frame },
      { p: [-ow / 2 - T / 2, 0, zf], s: [T, oh, 0.001], c: P.frame },
      { p: [ow / 2 + T / 2, 0, zf], s: [T, oh, 0.001], c: P.frame },
      // hairline on the frame's outer edge
      { p: [0, oh / 2 + T + hair / 2, zf], s: [ow + 2 * T + 2 * hair, hair, 0.001], c: P.hairline },
      {
        p: [0, -oh / 2 - T - hair / 2, zf],
        s: [ow + 2 * T + 2 * hair, hair, 0.001],
        c: P.hairline,
      },
      { p: [-ow / 2 - T - hair / 2, 0, zf], s: [hair, oh + 2 * T, 0.001], c: P.hairline },
      { p: [ow / 2 + T + hair / 2, 0, zf], s: [hair, oh + 2 * T, 0.001], c: P.hairline },
    ] as Array<{ p: [number, number, number]; s: [number, number, number]; c: string }>;
    // corner brackets: L strokes, 6 per cent of the rect width long, 3 px thick, 12 px off the frame
    const L = 0.06 * w;
    const th = 3 * px;
    const off = T + hair + 12 * px;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx * (ow / 2 + off);
        const cy = sy * (oh / 2 + off);
        boxes.push({ p: [cx - sx * (L / 2 - th / 2), cy, zf], s: [L, th, 0.001], c: P.hairline });
        boxes.push({ p: [cx, cy - sy * (L / 2 - th / 2), zf], s: [th, L, 0.001], c: P.hairline });
      }
    }
    const frameGeo = mergeBoxes(boxes);
    const quad = (): PlaneGeometry => new PlaneGeometry(1, 1);
    const pw = 0.1 * w;
    const top = -h / 2 - T - hair - 24 * px;
    const pillarGeo = quad();
    pillarGeo.scale(pw, 0.62 * S + top, 1);
    pillarGeo.translate(0, top - (0.62 * S + top) / 2, zf);
    const glowGeo = quad();
    glowGeo.scale(3.2 * S, 0.6 * S, 1);
    const haloGeo = quad();
    const fall = 0.12 * w;
    haloGeo.scale(w + 2 * fall + 2 * T, h + 2 * fall + 2 * T, 1);
    haloGeo.translate(0, 0, zf * 0.5);
    const m = {
      pillar: roomMaterial(u, {
        vertex: QUAD_VERT,
        fragment: PILLAR_FRAG,
        additive: true,
        uniforms: { uBase: { value: 0.2 } },
      }),
      glow: roomMaterial(u, {
        vertex: QUAD_VERT,
        fragment: GLOW_FRAG,
        additive: true,
        uniforms: { uBase: { value: 0.42 }, uColour: { value: new Color(P.horizonPale) } },
      }),
      halo: roomMaterial(u, {
        vertex: QUAD_VERT,
        fragment: HALO_FRAG,
        additive: true,
        uniforms: {
          uHalf: { value: [(w + 2 * (T + hair)) / 2, (h + 2 * (T + hair)) / 2] },
          uFall: { value: fall },
          uBase: { value: 0.15 },
        },
      }),
      frame: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    };
    return { frame: frameGeo, pillar: pillarGeo, glow: glowGeo, halo: haloGeo, mats: m };
  }, [u, S, w, h, px]);
  useEffect(
    () => () => {
      [frame, pillar, glow, halo].forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [frame, pillar, glow, halo, mats],
  );
  return (
    <>
      <mesh geometry={halo} material={mats.halo} renderOrder={1} frustumCulled={false} />
      <mesh geometry={frame} material={mats.frame} renderOrder={2} frustumCulled={false} />
      <mesh geometry={pillar} material={mats.pillar} renderOrder={2} frustumCulled={false} />
      <PoolMesh geometry={glow} material={mats.glow} S={S} />
    </>
  );
}

/** The glow pool sits on the cloud sea (a row depth), spill-modulated. */
function PoolMesh({
  geometry,
  material,
  S,
}: {
  geometry: BufferGeometry;
  material: ReturnType<typeof roomMaterial>;
  S: number;
}) {
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, -1.0 * S, -2.4 * S]}
      renderOrder={-10}
      frustumCulled={false}
    />
  );
}

/* ---------------- sparkles ---------------- */

function Sparkles({ u, S }: { u: RoomUniforms; S: number }) {
  const positions = useMemo(() => {
    const r = rng(9);
    const a = new Float32Array(18 * 3);
    for (let i = 0; i < 18; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      a.set([side * (0.56 + r() * 0.5) * S, (r() - 0.5) * 0.9 * S - 0.1 * S, -0.01 * S], i * 3);
    }
    return a;
  }, [S]);
  return (
    <PointSprites
      uniforms={u}
      positions={positions}
      colour="#cfd8ff"
      size={[2, 4]}
      twinkle={0.4}
      twinkleHz={[0.2, 0.9]}
      alpha={0.8}
      velocity={[0, 0.0047 * S, 0]}
      wrap={[0.05 * S, 0.5 * S, 0.01]}
      hideInCalm
      additive
      renderOrder={4}
    />
  );
}

/** Snow crystals blown along the lower band only (screen-space band: below 82 per cent of the height is safe). */
function Spindrift({ u, S, cam }: { u: RoomUniforms; S: number; cam: Vector3 }) {
  const positions = useMemo(() => {
    const r = rng(21);
    const a = new Float32Array(48 * 3);
    for (let i = 0; i < 48; i += 1) {
      const d = (2.2 + r() * 1.4) * S;
      a.set(
        [(r() - 0.5) * 1.8 * d, cam.y - d * Math.tan((19 + r() * 3) * (Math.PI / 180)), cam.z - d],
        i * 3,
      );
    }
    return a;
  }, [S, cam]);
  return (
    <PointSprites
      uniforms={u}
      positions={positions}
      colour="#f2e8ff"
      size={[1.5, 3]}
      twinkle={0.2}
      alpha={0.55}
      velocity={[0.14 * S, 0.01 * S, 0]}
      wrap={[1.6 * S, 0.03 * S, 0.1]}
      hideInCalm
      renderOrder={6}
    />
  );
}

/* ---------------- the room ---------------- */

export function MountainSkyRoom(props: RoomProps & { dim?: number }) {
  const { calm, quality = 'high', widthM = MOUNTAIN_SKY_SCREEN.widthM, dim = 1 } = props;
  const S = widthM;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm);
  const D = props.watchDistance ?? 1.6 * S;
  const cam = useMemo(() => new Vector3(0, -0.083 * S, D), [S, D]);
  const stars = useMemo(
    () =>
      skyPoints(
        quality === 'low' ? 60 : 120,
        44 * S,
        [cam.x, cam.y, cam.z],
        HORIZON_ELEV + 0.04,
        3,
        1.15,
      ),
    [quality, S, cam],
  );
  return (
    <group name="mountain-sky">
      <SkyDome
        u={u}
        r={50 * S}
        centre={cam}
        zenith={P.zenith}
        mid={P.midSky}
        horizon={P.horizon}
        pale={P.horizonPale}
        horizonElev={HORIZON_ELEV}
        aurora
      />
      <PointSprites
        uniforms={u}
        positions={stars}
        colour="#ffffff"
        size={[2.2, 5]}
        twinkle={0.1}
        twinkleHz={[0.3, 1.2]}
        renderOrder={-90}
      />
      <Ridges cam={cam} S={S} quality={quality} />
      <SeaFloor cam={cam} S={S} />
      <CloudSea u={u} cam={cam} S={S} quality={quality} />
      <SideClouds u={u} cam={cam} S={S} quality={quality} />
      <Portal u={u} S={S} aspect={MOUNTAIN_SKY_SCREEN.aspect} />
      {quality === 'high' && <Ledge cam={cam} S={S} />}
      {!calm && quality === 'high' && <Birds u={u} cam={cam} S={S} />}
      {!calm && quality === 'high' && <Spindrift u={u} S={S} cam={cam} />}
      {!calm && <Sparkles u={u} S={S} />}
      <DimOverlay dim={dim} />
    </group>
  );
}

/** Mid clouds in the side columns only, fading by the keep-out before the halo. */
function SideClouds({
  u,
  cam,
  S,
  quality,
}: {
  u: RoomUniforms;
  cam: Vector3;
  S: number;
  quality: 'high' | 'low';
}) {
  const puffs = useMemo(() => {
    const r = rng(300);
    const out: PuffSpec[] = [];
    const n = quality === 'low' ? 4 : 8;
    for (let i = 0; i < n; i += 1) {
      const d = (6 + r() * 2) * S;
      const sign = i % 2 === 0 ? -1 : 1;
      const x = sign * (0.4 + r() * 0.35) * d;
      const dep = (-4 + r() * 10) * (Math.PI / 180); // above and just below the line
      out.push({ x, y: cam.y + d * Math.tan(dep), z: cam.z - d, w: 0.3 * d, h: 0.1 * d });
    }
    return out;
  }, [cam, S, quality]);
  return (
    <PuffLayer
      uniforms={u}
      puffs={puffs}
      top={P.cloudTop}
      shadow={P.cloudShadow}
      fog={P.midSky}
      fogAmount={0.25}
      drift={0.0016 * 6 * 0.574 * 12 * S * 0.012}
      span={5 * S}
      opacity={0.8}
      seed={12}
      renderOrder={-15}
    />
  );
}
