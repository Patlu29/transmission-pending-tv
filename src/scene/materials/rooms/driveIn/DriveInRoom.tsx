/**
 * Car at the drive-in: you sit in the driver's seat; the screen tower stands across the lot on a warm night. The
 * windscreen is open air (no glass is drawn), A-pillars frame the view, the dashboard sits along the bottom.
 * Anchor space, units of `widthM` (14 m). The screen is high in the frame: use `vAlign: 'upper'`.
 */
import { useMemo } from 'react';
import { rng, useRoomClock, useRoomUniforms, type BoxSpec, type RoomProps } from '../roomKit.ts';
import { Boxes, DimOverlay, Glow, Ground, PointSprites, SkyDome } from '../roomParts.tsx';
import { DRIVE_IN_SCREEN, DRIVE_IN_PALETTE } from '../specs.ts';
import { skyPoints, proj } from '../roomKit.ts';

const P = DRIVE_IN_PALETTE;

export function DriveInRoom(props: RoomProps & { dim?: number }) {
  const { calm, widthM = DRIVE_IN_SCREEN.widthM, dim = 1, quality = 'high' } = props;
  const S = widthM;
  const D = props.watchDistance ?? 1.56 * S;
  const u = useRoomUniforms(props.uniforms);
  useRoomClock(u, calm, 11);
  const w = S;
  const h = S / DRIVE_IN_SCREEN.aspect;
  const camY = -0.09 * 2 * D * 0.2867; // the camera sits below the anchor centre (rect centre at 41 per cent)
  const stars = useMemo(
    () => skyPoints(quality === 'low' ? 40 : 90, 44 * S, [0, camY, D], 0.02, 17, 1.1),
    [S, D, camY, quality],
  );

  const far = useMemo<BoxSpec[]>(() => {
    const L: BoxSpec[] = [];
    const m = 0.03 * S;
    // tower frame and legs behind the screen plane
    L.push({ p: [0, h / 2 + m / 2, -0.01 * S], s: [w + 2 * m, m, 0.03 * S], c: P.tower });
    L.push({ p: [0, -h / 2 - m / 2, -0.01 * S], s: [w + 2 * m, m, 0.03 * S], c: P.tower });
    L.push({ p: [-w / 2 - m / 2, 0, -0.01 * S], s: [m, h, 0.03 * S], c: P.tower });
    L.push({ p: [w / 2 + m / 2, 0, -0.01 * S], s: [m, h, 0.03 * S], c: P.tower });
    for (const sx of [-0.3, 0, 0.3])
      L.push({
        p: [sx * S, -h / 2 - 0.25 * S, -0.02 * S],
        s: [0.03 * S, 0.5 * S, 0.03 * S],
        c: '#1e222a',
      });
    // snack bar on the right, light poles on both sides, parked car roofs below the screen
    L.push({ p: [0.78 * S, -0.36 * S, -0.5 * S], s: [0.3 * S, 0.12 * S, 0.2 * S], c: '#3a3226' });
    L.push({
      p: [0.78 * S, -0.37 * S, -0.39 * S],
      s: [0.22 * S, 0.05 * S, 0.01 * S],
      c: P.snackBar,
    });
    for (const sx of [-1, 1])
      L.push({
        p: [sx * 0.62 * S, -0.1 * S, -0.3 * S],
        s: [0.008 * S, 0.7 * S, 0.008 * S],
        c: '#16181e',
      });
    const r = rng(6);
    for (let row = 0; row < 2; row += 1) {
      const k = proj(D, -0.8 * S + row * 0.5 * S);
      for (let i = -7; i <= 7; i += 1) {
        if (Math.abs(i * 0.11) < 0.06 && row === 1) continue;
        L.push({
          p: [
            (i * 0.105 + (r() - 0.5) * 0.02) * S * k,
            (-0.395 + row * 0.015) * S * k,
            -0.8 * S + row * 0.5 * S,
          ],
          s: [0.085 * S * k, 0.035 * S * k, 0.1 * S],
          c: row ? '#12141a' : '#0c0e13',
        });
        L.push({
          p: [i * 0.105 * S * k, (-0.41 + row * 0.015) * S * k, -0.8 * S + row * 0.5 * S],
          s: [0.1 * S * k, 0.03 * S * k, 0.1 * S],
          c: row ? '#0d0f14' : '#090b0f',
        });
      }
    }
    return L;
  }, [S, w, h, D]);

  // Interior: positioned in the camera's frame (group placed at the camera) so it sits where a driver sees it.
  const interior = useMemo<BoxSpec[]>(() => {
    // Camera frame, one metre ahead (z = -1). The view is 0.573 m tall there, so y = (0.5 - f) * 0.573 for a screen
    // height fraction f. The dashboard top is at f 0.845 and the wheel's top arc just above it, well under the rect.
    const L: BoxSpec[] = [];
    const z = -1;
    const y = (f: number): number => (0.5 - f) * 0.5734;
    for (const sx of [-1, 1]) {
      L.push({ p: [sx * 0.445, 0.04, z], s: [0.075, 0.7, 0.02], c: '#08090c', rz: sx * 0.2 });
      L.push({
        p: [sx * 0.402, 0.04, z + 0.004],
        s: [0.004, 0.7, 0.01],
        c: '#2c313b',
        rz: sx * 0.2,
      });
    }
    L.push({ p: [0, y(0.845), z], s: [1.4, 0.006, 0.03], c: '#343a46' });
    L.push({ p: [0, y(0.845) - 0.05, z], s: [1.4, 0.1, 0.03], c: '#14161a' });
    L.push({ p: [0, y(0.845) + 0.008, z - 0.01], s: [0.62, 0.03, 0.03], c: '#0e1013' });
    L.push({ p: [0, y(0.845) + 0.024, z - 0.01], s: [0.62, 0.004, 0.03], c: '#2a2f39' });
    for (const sx of [-1, 1]) {
      const gx = sx * 0.3;
      const gy = y(0.845) - 0.03;
      L.push({ p: [gx, gy, z + 0.01], s: [0.09, 0.09, 0.004], c: '#07080a' });
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        L.push({
          p: [gx + Math.cos(a) * 0.038, gy + Math.sin(a) * 0.038, z + 0.014],
          s: [0.006, 0.01, 0.004],
          c: P.dial,
          rz: a,
        });
      }
      L.push({
        p: [gx + sx * 0.008, gy + 0.012, z + 0.016],
        s: [0.003, 0.034, 0.003],
        c: '#ffd9a0',
        rz: sx * 0.9,
      });
    }
    const cy = y(0.845) - 0.13;
    for (let i = 0; i < 40; i += 1) {
      const a = (i / 40) * Math.PI * 2;
      const wx = Math.cos(a) * 0.23;
      const wy = cy + Math.sin(a) * 0.15;
      if (wy < y(1.02)) continue;
      L.push({ p: [wx, wy, z + 0.02], s: [0.045, 0.036, 0.02], c: '#0c0d10', rz: a + Math.PI / 2 });
      if (Math.sin(a) > 0.25)
        L.push({
          p: [wx, wy + 0.012, z + 0.03],
          s: [0.03, 0.006, 0.006],
          c: '#3a404c',
          rz: a + Math.PI / 2,
        });
    }
    L.push({ p: [-0.11, cy + 0.07, z + 0.02], s: [0.2, 0.018, 0.016], c: '#0c0d10', rz: -0.5 });
    L.push({ p: [0.11, cy + 0.07, z + 0.02], s: [0.2, 0.018, 0.016], c: '#0c0d10', rz: 0.5 });
    return L;
  }, []);

  const moths = useMemo(() => {
    const r = rng(23);
    const a = new Float32Array(8 * 3);
    for (let i = 0; i < 8; i += 1)
      a.set(
        [(i % 2 ? 1 : -1) * 0.62 * S + (r() - 0.5) * 0.05 * S, (0.28 + r() * 0.05) * S, -0.3 * S],
        i * 3,
      );
    return a;
  }, [S]);

  return (
    <group name="drive-in">
      <SkyDome
        u={u}
        r={50 * S}
        centre={{ x: 0, y: camY, z: D }}
        zenith={P.sky}
        mid="#141c3a"
        horizon="#2a2a46"
        pale="#3a3550"
        horizonElev={-0.06}
        glow={0.25}
      />
      <PointSprites
        uniforms={u}
        positions={stars}
        colour="#ffffff"
        size={[1.2, 2.6]}
        alpha={0.7}
        twinkle={0.08}
        twinkleHz={[0.3, 0.9]}
        renderOrder={-90}
      />
      <Ground
        u={u}
        position={[0, -0.46 * S, -2 * S]}
        size={[10 * S, 8 * S]}
        a="#14161c"
        b="#1f2229"
        far="#2a2a46"
        sway={0}
      />
      <Boxes specs={far} flat />
      <group position={[0, camY, D]}>
        <Boxes specs={interior} flat renderOrder={8} />
        {[-1, 1].map((sx) => (
          <Glow
            key={sx}
            u={u}
            position={[sx * 0.3, (0.5 - 0.845) * 0.5734 - 0.03, -0.97]}
            size={[0.2, 0.2]}
            colour={P.dial}
            base={0.5}
            fade={false}
          />
        ))}
        <Glow
          u={u}
          position={[0, (0.5 - 0.845) * 0.5734 - 0.02, -0.96]}
          size={[1.3, 0.2]}
          colour="#c7d0e0"
          base={0.14}
          spill
          fade={false}
        />
      </group>
      <Glow
        u={u}
        position={[0.78 * S, -0.34 * S, -0.36 * S]}
        size={[0.5 * S, 0.3 * S]}
        colour={P.snackBar}
        base={0.5}
      />
      {[-1, 1].map((sx) => (
        <Glow
          key={sx}
          u={u}
          position={[sx * 0.62 * S, 0.26 * S, -0.28 * S]}
          size={[0.16 * S, 0.16 * S]}
          colour="#ffe0a0"
          base={0.8}
        />
      ))}
      <Glow
        u={u}
        position={[-0.3 * S, -0.4 * S, -0.7 * S]}
        size={[0.12 * S, 0.06 * S]}
        colour={P.tailLight}
        base={0.6}
      />
      <PointSprites
        uniforms={u}
        positions={moths}
        colour="#fff0c0"
        size={[2, 3]}
        alpha={0.8}
        twinkle={0.4}
        twinkleHz={[0.5, 1]}
        velocity={[0.01 * S, 0.004 * S, 0]}
        wrap={[0.06 * S, 0.05 * S, 0.001]}
        hideInCalm
        additive
        renderOrder={9}
      />
      <DimOverlay dim={dim} />
    </group>
  );
}
