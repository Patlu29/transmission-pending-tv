/**
 * Procedural geometry for the Lumen pane and its puck. Pure three.js (no DOM), so it also runs in Node for triangle
 * counts. Nothing is downloaded. Original work.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Path,
  RingGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOLO_COLOURS, HOLO_LAYOUT } from './layout.ts';

const L = HOLO_LAYOUT;

function roundedRect<T extends Path>(path: T, w: number, h: number, r: number): T {
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

/** Rounded slab, front at z = 0 running back to -depth, optional hole. */
function slab(
  w: number,
  h: number,
  r: number,
  depth: number,
  bevel: number,
  hole?: { w: number; h: number; r: number },
): BufferGeometry {
  const shape = roundedRect(new Shape(), w, h, r);
  if (hole) shape.holes.push(roundedRect(new Path(), hole.w, hole.h, hole.r));
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 8,
    steps: 1,
  });
  geo.translate(0, 0, -(depth + bevel));
  return geo;
}

function bare(geo: BufferGeometry): BufferGeometry {
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.deleteAttribute('uv');
  out.deleteAttribute('color');
  out.computeVertexNormals();
  return out;
}

function coloured(geo: BufferGeometry, hex: string, scale = 1): BufferGeometry {
  const g = bare(geo);
  const c = new Color(hex).multiplyScalar(scale);
  const n = g.attributes.position?.count ?? 0;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return g;
}

/** Pearl ceramic border: a 6 mm frame round the glass. */
export function buildBezelGeometry(): BufferGeometry {
  const { width: W, height: H, radius, thickness, border } = L.pane;
  const geo = slab(W, H, radius, thickness, 0.0015, {
    w: W - 2 * border,
    h: H - 2 * border,
    r: 0.012,
  });
  return bare(geo);
}

/** Satin bevel: a thin ring on the outer edge of the border. */
export function buildTrimGeometry(): BufferGeometry {
  const { width: W, height: H, radius, thickness } = L.pane;
  const geo = slab(W + 0.004, H + 0.004, radius + 0.002, thickness + 0.002, 0.001, {
    w: W - 0.006,
    h: H - 0.006,
    r: radius - 0.004,
  });
  geo.translate(0, 0, -0.0005);
  return bare(geo);
}

/** Smoked glass body behind the player rect. */
export function buildGlassBodyGeometry(): BufferGeometry {
  const { width: gw, height: gh } = L.glass;
  const geo = slab(gw, gh, 0.012, L.pane.thickness - 0.001, 0.0005);
  geo.translate(0, 0, -0.0008);
  return bare(geo);
}

/** The player-rect plane. UVs 0..1 (u right, v up). Flat: the player and the holo material both need a flat face. */
export function buildScreenGeometry(): BufferGeometry {
  const { width: w, height: h } = L.screen;
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new Float32BufferAttribute(
      [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0],
      3,
    ),
  );
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** A 2 px edge light just outside the player rect (flush), as a thin rounded frame. */
export function buildEdgeLightGeometry(): BufferGeometry {
  const { width: w, height: h } = L.screen;
  const t = 0.0022;
  const shape = roundedRect(new Shape(), w + 2 * t, h + 2 * t, L.screen.cornerRadius + t);
  shape.holes.push(roundedRect(new Path(), w, h, L.screen.cornerRadius));
  return slabFlat(shape);
}

function slabFlat(shape: Shape): BufferGeometry {
  const geo = new ExtrudeGeometry(shape, { depth: 0.0004, bevelEnabled: false, curveSegments: 8 });
  geo.translate(0, 0, 0.0003);
  return bare(geo);
}

/** Matte graphite puck (an oval lathe) with a band of speaker slits, vertex-coloured. Floor at shelfY. */
export function buildPuckGeometry(): BufferGeometry {
  const { width, depth, height, cz } = L.puck;
  const R = width / 2;
  const profile = [
    new Vector2(0.0001, 0),
    new Vector2(R * 0.97, 0),
    new Vector2(R, height * 0.08),
    new Vector2(R, height * 0.8),
    new Vector2(R * 0.93, height),
    new Vector2(0.0001, height),
  ];
  const lathe = new LatheGeometry(profile, 72);
  lathe.scale(1, 1, depth / width);
  lathe.translate(0, L.shelfY, cz);
  const parts: BufferGeometry[] = [coloured(lathe, HOLO_COLOURS.graphite)];
  // speaker slits around the side band
  for (let i = 0; i < 44; i += 1) {
    const a = (i / 44) * Math.PI * 2;
    const slit = new BoxGeometry(0.004, 0.026, 0.002);
    slit.rotateY(-a + Math.PI / 2);
    slit.translate(
      Math.cos(a) * (R + 0.0005),
      L.shelfY + height * 0.42,
      cz + Math.sin(a) * (R * (depth / width) + 0.0005),
    );
    parts.push(coloured(slit, HOLO_COLOURS.slit));
  }
  return mergeGeometries(parts, false);
}

/** Oval top face of the puck (the control plate), a touch lighter than the body. */
export function buildControlPlateGeometry(): BufferGeometry {
  const { width, depth, cz, topY } = L.puck;
  const circle = new CircleGeometry(width / 2 - 0.03, 64);
  circle.rotateX(-Math.PI / 2);
  circle.scale(1, 1, depth / width);
  circle.translate(0, topY + 0.0006, cz);
  return coloured(circle, HOLO_COLOURS.graphiteMid, 0.9);
}

/** A flat light ring (a band, a hairline and a travelling bead), lying in the xy plane with z up. Origin at its centre. */
export function buildRingGeometry(radius: number, width: number): BufferGeometry {
  const band = new RingGeometry(radius - width / 2, radius + width / 2, 72, 1);
  const hair = new TorusGeometry(radius, 0.0013, 6, 72);
  hair.translate(0, 0, 0.0008);
  const bead = new SphereGeometry(width * 0.34, 10, 8);
  bead.translate(radius, 0, 0.0016);
  return mergeGeometries(
    [
      coloured(band, HOLO_COLOURS.lumen, 0.32),
      coloured(hair, HOLO_COLOURS.lumen, 0.85),
      coloured(bead, HOLO_COLOURS.lumenBright, 1.1),
    ],
    false,
  );
}

/** The power dimple: a shallow dark disc with a lit rim, z up. */
export function buildDimpleGeometry(radius: number): BufferGeometry {
  const disc = new CylinderGeometry(radius, radius, 0.003, 32);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0, 0.0012);
  const rim = new TorusGeometry(radius, 0.0016, 6, 40);
  rim.translate(0, 0, 0.0028);
  return mergeGeometries(
    [coloured(disc, '#0b1018'), coloured(rim, HOLO_COLOURS.lumen, 0.8)],
    false,
  );
}

export interface HoloGeometries {
  bezel: BufferGeometry;
  trim: BufferGeometry;
  glassBody: BufferGeometry;
  screen: BufferGeometry;
  edgeLight: BufferGeometry;
  puck: BufferGeometry;
  controlPlate: BufferGeometry;
  ringChannel: BufferGeometry;
  ringVolume: BufferGeometry;
  dimple: BufferGeometry;
}

export function buildHoloGeometries(): HoloGeometries {
  const r = L.rings;
  return {
    bezel: buildBezelGeometry(),
    trim: buildTrimGeometry(),
    glassBody: buildGlassBodyGeometry(),
    screen: buildScreenGeometry(),
    edgeLight: buildEdgeLightGeometry(),
    puck: buildPuckGeometry(),
    controlPlate: buildControlPlateGeometry(),
    ringChannel: buildRingGeometry(r.channel.radius, r.channel.width),
    ringVolume: buildRingGeometry(r.volume.radius, r.volume.width),
    dimple: buildDimpleGeometry(r.power.radius),
  };
}

export function triangleCount(geo: BufferGeometry): number {
  return (geo.index ? geo.index.count : (geo.attributes.position?.count ?? 0)) / 3;
}
