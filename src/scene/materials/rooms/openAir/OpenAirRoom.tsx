/**
 * Open-air screen: a rigged screen on poles in a field at night, string lights, tree line, beanbags, moon and stars.
 * Anchor space, units of `widthM` (8 m).
 */
import { useMemo } from 'react';
import { rng, useRoomClock, useRoomUniforms, type BoxSpec, type RoomProps } from '../roomKit.ts';
import {
  Boxes,
  DimOverlay,
  Glow,
  Ground,
  PointSprites,
  SkyDome,
  SpillLight,
} from '../roomParts.tsx';
import { OPEN_AIR_SCREEN, OPEN_AIR_PALETTE } from '../specs.ts';
import { skyPoints, proj } from '../roomKit.ts';

const P = OPEN_AIR_PALETTE;

function dimHex(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): string =>
    Math.round(v * f)
      .toString(16)
      .padStart(2, '0');
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

export function OpenAirRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = OPEN_AIR_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const D = props.watchDistance ?? 1.56 * S;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 12);
  const w = S;
  const h = S / OPEN_AIR_SCREEN.aspect;
  const cam = { x: 0, y: 0, z: D };
  const groundY = -0.43 * S;

  const stars = useMemo(
    () => skyPoints(quality === 'low' ? 50 : 110, 44 * S, [0, 0, D], 0.03, 5, 1.15),
    [S, D, quality],
  );
  const fireflies = useMemo(() => {
    const r = rng(40);
    const a = new Float32Array(12 * 3);
    for (let i = 0; i < 12; i += 1)
      a.set([(i % 2 ? 1 : -1) * (0.58 + r() * 0.4) * S, (-0.38 + r() * 0.5) * S, 0.2 * S], i * 3);
    return a;
  }, [S]);

  const set = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const T = 0.019 * S; // 0.15 m truss border
    const gap = 0.004 * S;
    L.push({
      p: [0, h / 2 + gap + T / 2, -0.01 * S],
      s: [w + 2 * (gap + T), T, 0.03 * S],
      c: P.truss,
    });
    L.push({
      p: [0, -h / 2 - gap - T / 2, -0.01 * S],
      s: [w + 2 * (gap + T), T, 0.03 * S],
      c: P.truss,
    });
    L.push({ p: [-w / 2 - gap - T / 2, 0, -0.01 * S], s: [T, h, 0.03 * S], c: P.truss });
    L.push({ p: [w / 2 + gap + T / 2, 0, -0.01 * S], s: [T, h, 0.03 * S], c: P.truss });
    // poles at both sides, from the ground to above the rect top
    for (const sx of [-1, 1]) {
      L.push({
        p: [sx * 0.585 * S, -0.155 * S, -0.02 * S],
        s: [0.012 * S, 0.55 * S, 0.012 * S],
        c: '#16161c',
      });
    }
    // string-light lines: from the pole tops out to the sides only (they never cross the rect)
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i += 1) {
        const f = i / 5;
        L.push({
          p: [
            sx * (0.585 + f * 0.28) * S,
            (0.2 - 0.09 * Math.sin(f * Math.PI) - f * 0.16) * S,
            -0.02 * S,
          ],
          s: [0.05 * S, 0.0035 * S, 0.003 * S],
          c: '#18181c',
          rz: sx * (-0.4 + f * 0.1),
        });
      }
    }
    // tree line on the horizon (behind the screen plane)
    const r = rng(8);
    for (let i = -9; i <= 9; i += 1) {
      const ht = 0.14 + r() * 0.12;
      L.push({
        p: [i * 0.16 * S, 0.0 + ht * S * 0.35, -3 * S],
        s: [0.2 * S, ht * 1.1 * S, 0.05 * S],
        c: '#05070e',
        rz: (r() - 0.5) * 0.1,
      });
    }
    // beanbags and a blanket in the lower foreground
    const k = proj(D, 0.5 * S);
    P.beanbags.forEach((c, i) =>
      L.push({
        p: [(-0.55 + i * 0.55) * S * k, (-0.37 - (i % 2) * 0.015) * S * k, 0.5 * S],
        s: [0.16 * S * k, 0.075 * S * k, 0.14 * S],
        c: dimHex(c, 0.55),
        ry: 0.2 * (i - 1),
        rz: 0.06 * (i - 1),
      }),
    );
    L.push({ p: [0, -0.43 * S * k, 0.42 * S], s: [1.3 * S, 0.02 * S, 0.5 * S], c: '#3a2f3a' });
    // two seated heads below the rect
    for (const sx of [-0.6, 0.55])
      L.push({
        p: [sx * S * k, -0.37 * S * k, 0.5 * S],
        s: [0.05 * S, 0.06 * S, 0.04 * S],
        c: '#080a10',
      });
    return L;
  }, [S, w, h, D]);

  // bulbs along the string lines
  const bulbs = useMemo(() => {
    const a: number[] = [];
    for (const sx of [-1, 1])
      for (let i = 0; i < 9; i += 1) {
        const f = i / 8;
        a.push(
          sx * (0.585 + f * 0.28) * S,
          (0.2 - 0.09 * Math.sin(f * Math.PI) - f * 0.16 - 0.01) * S,
          -0.02 * S,
        );
      }
    return new Float32Array(a);
  }, [S]);

  return (
    <group name="open-air">
      <ambientLight intensity={0.5} color="#8c97c0" />
      <SpillLight
        u={u}
        base={0.28 * 2.4}
        position={[0, -0.2 * S, 0.8 * S]}
        colour="#e8f0ff"
        distance={6 * S}
      />
      <SkyDome
        u={u}
        r={50 * S}
        centre={cam}
        zenith={P.sky}
        mid="#222b55"
        horizon="#6a4a7a"
        pale="#8a6a8a"
        horizonElev={-0.03}
        glow={0.5}
      />
      <PointSprites
        uniforms={u}
        positions={stars}
        colour="#ffffff"
        size={[1.6, 3.6]}
        twinkle={0.08}
        twinkleHz={[0.3, 0.9]}
        renderOrder={-90}
      />
      <Ground
        u={u}
        position={[0, groundY, -2 * S]}
        size={[10 * S, 8 * S]}
        a="#1c3320"
        b="#33502f"
        far="#5a4a6a"
      />
      <Boxes specs={set} flat />
      <Glow
        u={u}
        position={[0, groundY + 0.01 * S, 0.5 * S]}
        size={[1.9 * S, 0.5 * S]}
        colour="#e8f0ff"
        base={0.28}
        spill
      />
      <PointSprites
        uniforms={u}
        positions={bulbs}
        colour={P.stringLights}
        size={[4, 6]}
        alpha={1}
        twinkle={0}
        additive
        renderOrder={9}
      />
      <PointSprites
        uniforms={u}
        positions={new Float32Array([-0.62 * S * 7.4, 0.3 * S * 7.4, -10 * S])}
        colour={P.moon}
        size={[34, 34]}
        alpha={1}
        twinkle={0}
        renderOrder={-80}
      />
      <Glow
        u={u}
        position={[-0.62 * S * 7.4, 0.3 * S * 7.4, -10.1 * S]}
        size={[3 * S, 3 * S]}
        colour={P.moon}
        base={0.25}
        fade={false}
        renderOrder={-81}
      />
      <PointSprites
        uniforms={u}
        positions={fireflies}
        colour="#d8ff7a"
        size={[3, 5]}
        alpha={0.9}
        twinkle={0.5}
        twinkleHz={[0.3, 0.9]}
        velocity={[0.01 * S, 0.006 * S, 0]}
        wrap={[0.06 * S, 0.08 * S, 0.01]}
        hideInCalm
        additive
        renderOrder={9}
      />
      <DimOverlay dim={dim} />
    </group>
  );
}
