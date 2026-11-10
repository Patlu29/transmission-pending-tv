/**
 * Procedural geometry for the TV body. Pure three.js (no DOM), so it also runs in Node for triangle counts.
 * Nothing here is downloaded: every vertex is built in code. Original work.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Path,
  Shape,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TV_GREYS, TV_LAYOUT } from './layout.ts';

const L = TV_LAYOUT;

function roundedRectPath<T extends Path>(path: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

function roundedRectPoints(w: number, h: number, r: number, segments = 6): Vector2[] {
  const pts: Vector2[] = [];
  const corners: Array<[number, number, number]> = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2],
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const a = a0 + ((Math.PI / 2) * i) / segments;
      pts.push(new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  return pts;
}

/** Extruded rounded slab: front face at z = 0, running back to -depth. Optional rectangular hole. */
function slab(
  w: number,
  h: number,
  r: number,
  depth: number,
  bevel: number,
  hole?: { w: number; h: number; r: number },
): BufferGeometry {
  const shape = roundedRectPath(new Shape(), w, h, r);
  if (hole) shape.holes.push(roundedRectPath(new Path(), hole.w, hole.h, hole.r));
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 6,
    steps: 1,
  });
  // Extrude runs from z = -bevel to depth + bevel. Put the front (largest z) at 0.
  geo.translate(0, 0, -(depth + bevel));
  return geo;
}

/** Position and normal only, non-indexed, so parts can be merged. */
function bare(geo: BufferGeometry): BufferGeometry {
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.deleteAttribute('uv');
  out.deleteAttribute('color');
  out.computeVertexNormals();
  return out;
}

function withColor(geo: BufferGeometry, hex: string): BufferGeometry {
  const g = bare(geo);
  const c = new Color(hex);
  const n = g.attributes.position?.count ?? 0;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return g;
}

/** Cabinet body, back loft and every other part, as geometries in cabinet-local space (screen centre at x = screenCx). */
function loft(
  wA: number,
  hA: number,
  rA: number,
  zA: number,
  wB: number,
  hB: number,
  rB: number,
  zB: number,
): BufferGeometry {
  const a = roundedRectPoints(wA, hA, rA);
  const b = roundedRectPoints(wB, hB, rB);
  const n = a.length;
  const pos: number[] = [];
  for (const p of a) pos.push(p.x, p.y, zA);
  for (const p of b) pos.push(p.x, p.y, zB);
  const centre = n * 2;
  pos.push(0, 0, zB);
  const idx: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    idx.push(i, n + i, j, j, n + i, n + j);
    idx.push(centre, n + j, n + i);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Wood cabinet front block (with UVs for the grain map) plus four splayed legs. */
export function buildCabinetGeometry(): BufferGeometry {
  const c = L.cabinet;
  const block = slab(c.width, c.height, c.radius, 0.24, 0.012);
  block.translate(-L.screenCx, 0, 0);
  const parts: BufferGeometry[] = [block];

  const legX = 0.4;
  const legsY = -c.height / 2 - L.legs.height / 2 + 0.006;
  const splay = (L.legs.splayDegrees * Math.PI) / 180;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new CylinderGeometry(0.02, 0.013, L.legs.height + 0.012, 12, 1);
      const m = new Matrix4()
        .makeTranslation(sx * legX - L.screenCx, legsY, sz > 0 ? -0.05 : -0.19)
        .multiply(new Matrix4().makeRotationZ(sx * splay))
        .multiply(new Matrix4().makeRotationX(sz > 0 ? -splay : splay));
      leg.applyMatrix4(m);
      parts.push(leg.toNonIndexed());
    }
  }
  // Legs keep uv (cylinder) and block keeps uv (extrude); both are non-indexed with position, normal, uv.
  return mergeGeometries(
    parts.map((p) => (p.index ? p.toNonIndexed() : p)),
    false,
  );
}

/** Dark satin plastic: bezel, back shell, top handle slot and vent strip (position and normal only). */
export function buildBezelGeometry(): BufferGeometry {
  const s = L.screen;
  const bz = L.bezel.width;
  const parts: BufferGeometry[] = [];
  const bezel = slab(s.width + 2 * bz, s.height + 2 * bz, 0.04, 0.024, 0.006, {
    w: s.width,
    h: s.height,
    r: s.cornerRadius,
  });
  bezel.translate(0, 0, 0.022);
  parts.push(bare(bezel));

  const c = L.cabinet;
  const shell = loft(
    c.width * 0.96,
    c.height * 0.95,
    0.045,
    -0.2,
    c.rearWidth,
    c.rearHeight,
    0.05,
    -c.depth,
  );
  shell.translate(-L.screenCx, 0, 0);
  parts.push(bare(shell));

  // Top handle slot and vent strip, lying just above the cabinet top.
  const topY = c.height / 2 + 0.0008;
  const slot = new BoxGeometry(0.22, 0.004, 0.04);
  slot.translate(-0.16 - L.screenCx, topY, -0.12);
  parts.push(bare(slot));
  for (let i = 0; i < 9; i += 1) {
    const bar = new BoxGeometry(0.01, 0.004, 0.12);
    bar.translate(0.2 + i * 0.026 - L.screenCx, topY, -0.12);
    parts.push(bare(bar));
  }
  return mergeGeometries(parts, false);
}

/** Brushed metal: trim ring round the glass and the base plates under each knob. */
export function buildTrimGeometry(): BufferGeometry {
  const s = L.screen;
  const parts: BufferGeometry[] = [];
  const ring = slab(s.width + 0.012, s.height + 0.012, s.cornerRadius + 0.004, 0.03, 0.002, {
    w: s.width,
    h: s.height,
    r: s.cornerRadius,
  });
  ring.translate(0, 0, 0.026);
  parts.push(bare(ring));
  const plateZ = 0.012;
  for (const k of [L.knobs.channel, L.knobs.volume, L.knobs.power]) {
    const disc = new CylinderGeometry(k.radius * 1.25, k.radius * 1.25, 0.004, 40, 1);
    disc.rotateX(Math.PI / 2);
    disc.translate(k.x - L.screenCx, k.y, plateZ + 0.002);
    parts.push(bare(disc));
  }
  return mergeGeometries(parts, false);
}

/** Control plate with UVs 0..1 across the front, for the baked label and grille texture. */
export function buildPlateGeometry(): BufferGeometry {
  const p = L.plate;
  const geo = slab(p.width, p.height, 0.02, 0.012, 0.002);
  geo.translate(p.cx - L.screenCx, p.cy, 0.012);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (pos && uv) {
    for (let i = 0; i < pos.count; i += 1) {
      uv.setXY(
        i,
        (pos.getX(i) - (p.cx - L.screenCx) + p.width / 2) / p.width,
        (pos.getY(i) - p.cy + p.height / 2) / p.height,
      );
    }
    uv.needsUpdate = true;
  }
  return geo;
}

/** Knob: ribbed skirt, domed cap and a pointer line in vertex colour. Axis is +z, origin on the plate. */
export function buildKnobGeometry(radius: number, height: number): BufferGeometry {
  const R = radius;
  const H = height;
  const profile = [
    new Vector2(0.0001, 0),
    new Vector2(R * 1.0, 0),
    new Vector2(R * 1.0, H * 0.55),
    new Vector2(R * 0.94, H * 0.88),
    new Vector2(R * 0.78, H),
    new Vector2(0.0001, H),
  ];
  const lathe = new LatheGeometry(profile, 48);
  const pos = lathe.attributes.position;
  if (pos) {
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (Math.hypot(x, z) > R * 0.9) {
        const f = 1 + 0.045 * Math.cos(Math.atan2(z, x) * 24);
        pos.setX(i, x * f);
        pos.setZ(i, z * f);
      }
    }
  }
  lathe.rotateX(Math.PI / 2); // lathe axis y -> +z
  const body = withColor(lathe, TV_GREYS.knob);

  const mark = new BoxGeometry(R * 0.12, R * 0.7, 0.003);
  mark.translate(0, R * 0.42, H + 0.0012);
  return mergeGeometries([body, withColor(mark, TV_GREYS.knobMark)], false);
}

/** Domed CRT glass with UVs 0..1 across the 4:3 picture. Name the mesh `screen`. */
export function buildScreenGeometry(segX = 40, segY = 30): BufferGeometry {
  const { width: w, height: h, bulge } = L.screen;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segY; j += 1) {
    for (let i = 0; i <= segX; i += 1) {
      const u = i / segX;
      const v = j / segY;
      const nx = u * 2 - 1;
      const ny = v * 2 - 1;
      pos.push(nx * (w / 2), ny * (h / 2), bulge * (1 - (nx * nx + ny * ny) / 2) - 0.001);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < segY; j += 1) {
    for (let i = 0; i < segX; i += 1) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + segX + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface TvGeometries {
  cabinet: BufferGeometry;
  bezel: BufferGeometry;
  trim: BufferGeometry;
  plate: BufferGeometry;
  screen: BufferGeometry;
  knobPower: BufferGeometry;
  knobChannel: BufferGeometry;
  knobVolume: BufferGeometry;
}

export function buildTvGeometries(): TvGeometries {
  const k = L.knobs;
  return {
    cabinet: buildCabinetGeometry(),
    bezel: buildBezelGeometry(),
    trim: buildTrimGeometry(),
    plate: buildPlateGeometry(),
    screen: buildScreenGeometry(),
    knobPower: buildKnobGeometry(k.power.radius, k.power.height),
    knobChannel: buildKnobGeometry(k.channel.radius, k.channel.height),
    knobVolume: buildKnobGeometry(k.volume.radius, k.volume.height),
  };
}

/** Triangle count of a geometry (indexed or not). */
export function triangleCount(geo: BufferGeometry): number {
  return (geo.index ? geo.index.count : (geo.attributes.position?.count ?? 0)) / 3;
}
