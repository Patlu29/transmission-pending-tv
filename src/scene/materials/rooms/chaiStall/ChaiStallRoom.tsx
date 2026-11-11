/**
 * Chai stall: an evening tea stall, a small screen on a bracket on the stall front, a crowd of flat vector
 * silhouettes (no faces) watching, steam, hanging bulbs. "Cricket" is whatever the video is: nothing is shipped.
 * Crowd heads stay 24 px below and 40 px outside the player rect. Anchor space, units of `widthM` (0.7 m).
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
  MeshBasicMaterial,
  Color,
} from 'three';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { rng, useRoomClock, useRoomUniforms, type BoxSpec, type RoomProps } from '../roomKit.ts';
import {
  Boxes,
  CanvasSign,
  DimOverlay,
  Glow,
  GradQuad,
  PointSprites,
  PuffLayer,
  SpillLight,
  type PuffSpec,
} from '../roomParts.tsx';
import { CHAI_STALL_SCREEN, CHAI_STALL_PALETTE } from '../specs.ts';
import { proj } from '../roomKit.ts';

const P = CHAI_STALL_PALETTE;

/** Flat vector cut-out of a standing person: shoulders, torso, head circle. Variant changes the arm and cap. */
function personGeometry(variant: number, colour: string, scale: number): BufferGeometry {
  const body = new Shape();
  body.moveTo(-0.5, -1.7);
  body.lineTo(-0.46, 0.05);
  body.quadraticCurveTo(-0.5, 0.3, -0.18, 0.38);
  body.lineTo(-0.1, 0.46);
  body.lineTo(0.1, 0.46);
  body.lineTo(0.18, 0.38);
  body.quadraticCurveTo(0.5, 0.3, 0.46, 0.05);
  body.lineTo(0.5, -1.7);
  body.closePath();
  const head = new Shape();
  const cx = 0;
  const cy = 0.76;
  const hr = variant === 2 ? 0.27 : 0.25;
  for (let i = 0; i <= 20; i += 1) {
    const a = (i / 20) * Math.PI * 2;
    const x = cx + Math.cos(a) * hr * 0.92;
    const y = cy + Math.sin(a) * hr * (variant === 1 ? 1.1 : 1);
    if (i === 0) head.moveTo(x, y);
    else head.lineTo(x, y);
  }
  const geos = [new ShapeGeometry(body), new ShapeGeometry(head)];
  if (variant === 1) {
    const arm = new Shape();
    arm.moveTo(0.42, 0.2);
    arm.lineTo(0.62, 0.7);
    arm.lineTo(0.72, 0.66);
    arm.lineTo(0.56, 0.1);
    arm.closePath();
    geos.push(new ShapeGeometry(arm));
  }
  const pos: number[] = [];
  const idx: number[] = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i += 1) pos.push(p.getX(i) * scale, p.getY(i) * scale, 0);
    const gi = g.index!;
    for (let i = 0; i < gi.count; i += 1) idx.push(gi.getX(i) + off);
    off += p.count;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const c = new Color(colour);
  const col: number[] = [];
  for (let i = 0; i < pos.length / 3; i += 1) col.push(c.r, c.g, c.b);
  out.setAttribute('color', new Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}

export function ChaiStallRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = CHAI_STALL_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const D = props.watchDistance ?? 1.9 * S;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 18);
  const w = S;
  const h = S / CHAI_STALL_SCREEN.aspect;
  const bulbL = useRef<Group>(null);
  const bulbR = useRef<Group>(null);
  const crowdRefs = useRef<Array<Group | null>>([]);

  // Crowd: view-space placement. Positions are in anchor-plane coordinates at depth z, then converted so they land
  // where intended. Heads stay >= 24 px (about 0.03 S) below the rect and >= 40 px (0.048 S) outside its sides.
  const crowd = useMemo(() => {
    const z = 0.4 * S;
    const k = proj(D, z);
    const defs = [
      { x: -0.8, y: -0.18, v: 0, c: 0 },
      { x: -0.66, y: -0.24, v: 1, c: 1 },
      { x: 0.7, y: -0.2, v: 2, c: 2 },
      { x: 0.84, y: -0.15, v: 0, c: 3 },
      { x: -0.3, y: -0.46, v: 2, c: 3 },
      { x: 0.12, y: -0.5, v: 1, c: 0 },
      { x: 0.42, y: -0.46, v: 0, c: 2 },
    ];
    const count = quality === 'low' ? 5 : 7;
    return defs.slice(0, count).map((d, i) => {
      const scale = 0.14 * S * k;
      return {
        geo: personGeometry(d.v, P.clothes[d.c]!, scale),
        x: d.x * S * k,
        y: d.y * S * k,
        z,
        i,
      };
    });
  }, [S, D, quality]);
  const crowdMat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      crowd.forEach((c) => c.geo.dispose());
      crowdMat.dispose();
    },
    [crowd, crowdMat],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const sway = (g: Group | null, i: number): void => {
      if (g) g.position.x = calm ? 0 : Math.sin((2 * Math.PI * t) / (4 + (i % 3))) * 0.004 * S;
    };
    crowdRefs.current.forEach(sway);
    const swing = calm ? 0 : Math.sin((2 * Math.PI * t) / 5) * ((2 * Math.PI) / 180);
    if (bulbL.current) bulbL.current.rotation.z = swing;
    if (bulbR.current) bulbR.current.rotation.z = -swing;
  });

  const set = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const m = 0.02 * S;
    // stall front wall, tin roof, brick side
    L.push({ p: [0, 0, -0.06 * S], s: [2.2 * S, 1.3 * S, 0.02 * S], c: '#264d63' });
    for (let i = -10; i <= 10; i += 1)
      L.push({
        p: [i * 0.11 * S, 0, -0.045 * S],
        s: [0.004 * S, 1.3 * S, 0.004 * S],
        c: '#1c3b4c',
      });
    L.push({ p: [0, 0.5 * S, -0.02 * S], s: [2.3 * S, 0.1 * S, 0.14 * S], c: P.tin });
    for (let i = -10; i <= 10; i += 1)
      L.push({
        p: [i * 0.115 * S, 0.5 * S, 0.055 * S],
        s: [0.004 * S, 0.1 * S, 0.004 * S],
        c: '#57493b',
      });
    L.push({ p: [-0.95 * S, -0.1 * S, -0.045 * S], s: [0.25 * S, 0.9 * S, 0.01 * S], c: P.brick });
    // black surround and bracket
    L.push({ p: [0, h / 2 + m / 2, -0.01 * S], s: [w + 2 * m, m, 0.03 * S], c: '#0a0a0a' });
    L.push({ p: [0, -h / 2 - m / 2, -0.01 * S], s: [w + 2 * m, m, 0.03 * S], c: '#0a0a0a' });
    L.push({ p: [-w / 2 - m / 2, 0, -0.01 * S], s: [m, h, 0.03 * S], c: '#0a0a0a' });
    L.push({ p: [w / 2 + m / 2, 0, -0.01 * S], s: [m, h, 0.03 * S], c: '#0a0a0a' });
    L.push({
      p: [0, h / 2 + m + 0.07 * S, -0.03 * S],
      s: [0.012 * S, 0.14 * S, 0.012 * S],
      c: '#202020',
    });
    // counter with kettle, glasses, biscuit jars, bananas (below the rect by the halo)
    L.push({ p: [0, -0.4 * S, 0.12 * S], s: [1.9 * S, 0.05 * S, 0.3 * S], c: '#3b2a1c' });
    L.push({ p: [0, -0.5 * S, 0.12 * S], s: [1.9 * S, 0.2 * S, 0.28 * S], c: '#2a4f66' });
    L.push({ p: [-0.35 * S, -0.34 * S, 0.12 * S], s: [0.09 * S, 0.09 * S, 0.09 * S], c: P.steel });
    L.push({
      p: [-0.35 * S, -0.28 * S, 0.12 * S],
      s: [0.03 * S, 0.03 * S, 0.03 * S],
      c: '#8c9096',
    });
    for (let i = 0; i < 4; i += 1)
      L.push({
        p: [(0.05 + i * 0.045) * S, -0.365 * S, 0.12 * S],
        s: [0.026 * S, 0.04 * S, 0.026 * S],
        c: P.glass,
      });
    L.push({ p: [0.45 * S, -0.35 * S, 0.12 * S], s: [0.07 * S, 0.07 * S, 0.07 * S], c: '#d8cfa8' });
    L.push({ p: [0.58 * S, -0.35 * S, 0.12 * S], s: [0.07 * S, 0.07 * S, 0.07 * S], c: '#cdb785' });
    // bicycle leaning at the left (outside the halo)
    L.push({
      p: [-0.78 * S, -0.3 * S, 0.1 * S],
      s: [0.18 * S, 0.012 * S, 0.012 * S],
      c: '#1b1b1d',
      rz: 0.6,
    });
    L.push({ p: [-0.84 * S, -0.38 * S, 0.1 * S], s: [0.1 * S, 0.1 * S, 0.008 * S], c: '#1b1b1d' });
    // stools
    for (const x of [-0.55, 0.62])
      L.push({ p: [x * S, -0.52 * S, 0.3 * S], s: [0.07 * S, 0.05 * S, 0.07 * S], c: '#4a3524' });
    return L;
  }, [S, w, h]);

  const steam = useMemo<PuffSpec[]>(() => {
    const r = rng(11);
    const n = quality === 'low' ? 4 : 9;
    return Array.from({ length: n }, (_, i) => ({
      x: (i % 2 ? -0.35 : 0.1 + (i % 4) * 0.04) * S + (r() - 0.5) * 0.01 * S,
      y: -0.3 * S,
      z: 0.14 * S,
      w: 0.05 * S,
      h: 0.06 * S,
    }));
  }, [S, quality]);
  const moth = useMemo(
    () => new Float32Array([-0.64 * S, 0.34 * S, 0.1 * S, -0.62 * S, 0.3 * S, 0.1 * S]),
    [S],
  );

  return (
    <group name="chai-stall">
      <GradQuad position={[0, 0, -0.1 * S]} size={[8 * S, 5 * S]} top={P.night} bottom="#1a2036" />
      <Boxes specs={set} flat />
      <CanvasSign
        position={[-0.62 * S, 0.34 * S, -0.03 * S]}
        size={[0.3 * S, 0.09 * S]}
        text="CHAI"
        fg="#f4e6c0"
        bg="#7a2630"
      />
      {[-1, 1].map((sx, i) => (
        <group key={sx} ref={i ? bulbR : bulbL} position={[sx * 0.66 * S, 0.5 * S, 0.0]}>
          <Boxes
            specs={[
              { p: [0, -0.1 * S, 0], s: [0.004 * S, 0.2 * S, 0.004 * S], c: '#111' },
              { p: [0, -0.215 * S, 0], s: [0.028 * S, 0.034 * S, 0.028 * S], c: P.bulb },
            ]}
            flat
          />
          <Glow
            u={u}
            position={[0, -0.215 * S, 0.02 * S]}
            size={[0.36 * S, 0.36 * S]}
            colour={P.bulb}
            base={0.5}
          />
        </group>
      ))}
      {crowd.map((c, i) => (
        <group key={c.i} ref={(g) => void (crowdRefs.current[i] = g)} position={[0, 0, 0]}>
          <mesh geometry={c.geo} material={crowdMat} position={[c.x, c.y, c.z]} renderOrder={6} />
        </group>
      ))}
      <Glow
        u={u}
        position={[0, -0.36 * S, 0.2 * S]}
        size={[1.9 * S, 0.5 * S]}
        colour="#ffd9a0"
        base={0.35}
      />
      <Glow
        u={u}
        position={[0, 0.05 * S, -0.05 * S]}
        size={[w * 1.6, h * 2.0]}
        colour="#cfe0ff"
        base={0.25}
        spill
      />
      <PuffLayer
        uniforms={u}
        puffs={steam}
        top="#f0ece2"
        shadow="#a9a498"
        riseSpeed={0.05 * S}
        rise={0.16 * S}
        opacity={0.4}
        seed={9}
        renderOrder={12}
        hideInCalm
      />
      <PointSprites
        uniforms={u}
        positions={moth}
        colour="#fff0c0"
        size={[2, 3]}
        alpha={0.9}
        twinkle={0.4}
        twinkleHz={[0.5, 1]}
        velocity={[0.004 * S, 0.003 * S, 0]}
        wrap={[0.05 * S, 0.05 * S, 0.001]}
        hideInCalm
        additive
        renderOrder={9}
      />
      <SpillLight
        u={u}
        base={0.35}
        position={[0, 0.3 * S, 0.5 * S]}
        colour="#ffd9a0"
        distance={3 * S}
        steady
      />
      <DimOverlay dim={dim} />
    </group>
  );
}
