/**
 * Room kit: shared uniforms, clock, spill, palettes and geometry helpers for the nine v2 rooms.
 * Owner: technical-artist. Everything is procedural; nothing is downloaded.
 *
 * Coordinates: every room is authored in ANCHOR SPACE, the same space as `<ScreenAnchor/>`: origin at the
 * centre of the screen face, +Z towards the viewer, +Y up, units of metres. Sizes scale with `widthM`
 * (the anchor's width), so a room looks the same whatever scale the scene-developer's anchor uses. Mount the
 * room component next to `<ScreenAnchor/>` (a sibling at the same transform).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  Vector3,
  Vector4,
  type IUniform,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BoxGeometry } from 'three';
import { ROOM_GLSL, ROOM_UNIFORMS_GLSL } from '../../shaders/room/common.ts';

export interface RoomUniforms {
  uTime: IUniform<number>;
  uCalm: IUniform<number>;
  uSpill: IUniform<number>;
  uKeepOut: IUniform<Vector4>;
  uView: IUniform<Vector3>;
}

export function createRoomUniforms(): RoomUniforms {
  return {
    uTime: { value: 0 },
    uCalm: { value: 0 },
    uSpill: { value: 1 },
    uKeepOut: { value: new Vector4(-1e5, -1e5, -1e5, -1e5) },
    uView: { value: new Vector3(1280, 800, 1) },
  };
}

/** Shared spill function (design-spec-v2 5.0): fastest component 1.3 Hz, plus or minus 13 per cent. */
export function spill(t: number, calm: boolean): number {
  if (calm) return 1;
  return 1 + 0.08 * Math.sin(2 * Math.PI * 0.6 * t) + 0.05 * Math.sin(2 * Math.PI * 1.3 * t + 1.7);
}

/** Sets the keep-out rect (player rect in CSS px, top-left origin of the canvas) plus the halo. null clears it. */
export function setKeepOut(
  u: RoomUniforms,
  rect: { x: number; y: number; width: number; height: number } | null,
  halo = 24,
): void {
  if (!rect) u.uKeepOut.value.set(-1e5, -1e5, -1e5, -1e5);
  else
    u.uKeepOut.value.set(
      rect.x - halo,
      rect.y - halo,
      rect.x + rect.width + halo,
      rect.y + rect.height + halo,
    );
}

/** Per-room frame held in Calm and reduced motion (seconds). Each room picks a pleasant one. */
export const CALM_TIME = 9.5;

/** Drives the shared uniforms. Call once per room (the room components do it). */
export function useRoomClock(u: RoomUniforms, calm: boolean, calmTime = CALM_TIME): void {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    setView(u, size.width, size.height, gl.getPixelRatio());
    invalidate();
  }, [u, size.width, size.height, gl, invalidate]);
  useFrame((state) => tick(u, calm ? calmTime : state.clock.elapsedTime, calm));
}

function tick(u: RoomUniforms, t: number, calm: boolean): void {
  u.uTime.value = t;
  u.uCalm.value = calm ? 1 : 0;
  u.uSpill.value = spill(t, calm);
}

function setView(u: RoomUniforms, w: number, h: number, dpr: number): void {
  u.uView.value.set(w, h, dpr);
}

/** Returns the caller's uniforms or a private set. */
export function useRoomUniforms(given?: RoomUniforms): RoomUniforms {
  return useMemo(() => given ?? createRoomUniforms(), [given]);
}

export interface RoomProps {
  /** displayStore.reducedMotion: freezes every animation at a fixed pleasant frame and hides sprites. */
  calm: boolean;
  /** For information: the CSS filter does the greyscale, never a shader. */
  colour?: 'bw' | 'colour';
  pose?: 'browse' | 'watch';
  /** Shared uniforms (the scene-developer sets `uKeepOut` through `setKeepOut`). Optional. */
  uniforms?: RoomUniforms;
  /** Anchor width in metres. Defaults to the room's own `widthM`. */
  widthM?: number;
  /** Camera distance from the anchor plane in the watch pose, metres. Default 1.6 x widthM. */
  watchDistance?: number;
  /** 'low' on phones: fewer sprites and rows. */
  quality?: 'high' | 'low';
}

export interface RoomScreenSpec {
  aspect: number;
  widthM: number;
  fill: number;
  align: 'centre' | 'left' | 'right';
  vAlign?: 'centre' | 'upper';
}

/* ---------- seeded random ---------- */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- colour helpers ---------- */
/** Relative luminance (0..1) of an sRGB hex, as the greyscale filter sees it. */
export function luminance(hex: string): number {
  const c = new Color(hex); // linear working space
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/* ---------- shader material helper ---------- */
export interface RoomMaterialOptions {
  vertex: string;
  fragment: string;
  uniforms?: Record<string, IUniform>;
  transparent?: boolean;
  additive?: boolean;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: typeof DoubleSide;
}

/** ShaderMaterial wired to the shared room uniforms, with ROOM_GLSL in the fragment shader. */
export function roomMaterial(shared: RoomUniforms, o: RoomMaterialOptions): ShaderMaterial {
  const m = new ShaderMaterial({
    uniforms: { ...shared, ...(o.uniforms ?? {}) },
    vertexShader: ROOM_UNIFORMS_GLSL + o.vertex,
    fragmentShader: `precision highp float;\n${ROOM_GLSL}\n${o.fragment}`,
    transparent: o.transparent ?? true,
    depthWrite: o.depthWrite ?? false,
    depthTest: o.depthTest ?? true,
    toneMapped: false,
  });
  if (o.additive) m.blending = AdditiveBlending;
  if (o.side !== undefined) m.side = o.side;
  return m;
}

/* ---------- merged coloured boxes (one draw call for a whole prop set) ---------- */
export interface BoxSpec {
  /** centre */
  p: [number, number, number];
  /** size */
  s: [number, number, number];
  /** sRGB hex */
  c: string;
  /** rotation about z, radians */
  rz?: number;
  ry?: number;
  rx?: number;
}

/** One BufferGeometry from many boxes, with per-vertex colour. Position, normal and colour only. */
export function mergeBoxes(specs: BoxSpec[]): BufferGeometry {
  const parts = specs.map((b) => {
    const g = new BoxGeometry(b.s[0], b.s[1], b.s[2]);
    g.deleteAttribute('uv');
    if (b.rx) g.rotateX(b.rx);
    if (b.ry) g.rotateY(b.ry);
    if (b.rz) g.rotateZ(b.rz);
    g.translate(b.p[0], b.p[1], b.p[2]);
    const ng = g.toNonIndexed();
    const col = new Color(b.c);
    const n = ng.attributes.position?.count ?? 0;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) arr.set([col.r, col.g, col.b], i * 3);
    ng.setAttribute('color', new Float32BufferAttribute(arr, 3));
    return ng;
  });
  return mergeGeometries(parts, false);
}

/** Triangle count of a geometry. */
export function tris(g: BufferGeometry): number {
  return (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3;
}

/** Random points on a spherical cap (stars). Directions with elevation above `minElev` (radians), radius r. */
export function skyPoints(
  count: number,
  r: number,
  centre: [number, number, number],
  minElev: number,
  seed: number,
  azRange = Math.PI,
  maxElev = 1.2,
): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const az = (rand() * 2 - 1) * azRange;
    const sinE = Math.sin(minElev) + rand() * (Math.sin(maxElev) - Math.sin(minElev));
    const e = Math.asin(sinE);
    out[i * 3] = centre[0] + Math.cos(e) * Math.sin(az) * r;
    out[i * 3 + 1] = centre[1] + Math.sin(e) * r;
    out[i * 3 + 2] = centre[2] - Math.cos(e) * Math.cos(az) * r;
  }
  return out;
}

/** Scale from anchor-plane coordinates to world coordinates at depth z, for a camera at distance D: place a prop where it will appear. */
export function proj(D: number, z: number): number {
  return (D - z) / D;
}
