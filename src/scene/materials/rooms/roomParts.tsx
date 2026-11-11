/* eslint-disable react-hooks/immutability -- R3F geometry and material attributes are built imperatively */
/**
 * Reusable room parts: instanced soft puffs (clouds, steam), starfield, point sprites, dim overlay.
 * Everything fades through `keepFade()` so nothing renders inside the player rect plus its halo.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PointLight,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { ROOM_UNIFORMS_GLSL } from '../../shaders/room/common.ts';
import { mergeBoxes, rng, roomMaterial, type BoxSpec, type RoomUniforms } from './roomKit.ts';

/* ---------------- soft puffs (clouds, steam, smoke) ---------------- */

export interface PuffSpec {
  /** centre in world (anchor-space) metres */
  x: number;
  y: number;
  z: number;
  /** width and height in metres */
  w: number;
  h: number;
}

export interface PuffLayerProps {
  uniforms: RoomUniforms;
  puffs: PuffSpec[];
  /** sRGB hex colours: lit top and shadowed underside, then fade-to-fog colour and its amount */
  top: string;
  shadow: string;
  fog?: string;
  fogAmount?: number;
  /** drift in metres per second along x (0 = still), wrapping over `span` metres */
  drift?: number;
  span?: number;
  /** vertical rise in metres per second with wrap over `rise` metres (steam) */
  riseSpeed?: number;
  rise?: number;
  opacity?: number;
  seed?: number;
  renderOrder?: number;
  /** puffs are hidden entirely when calm (steam, motes) */
  hideInCalm?: boolean;
}

const PUFF_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aSizeSeed;      // w, h, seed
uniform float uDrift;
uniform float uSpan;
uniform float uRiseSpeed;
uniform float uRise;
varying vec2 vUv;
varying float vSeed;
varying float vLife;
void main() {
  vUv = position.xy * 2.0;
  vSeed = aSizeSeed.z;
  float x = aPos.x;
  float y = aPos.y;
  vLife = 1.0;
  if (uSpan > 0.0) x = mod(aPos.x + uDrift * uTime + uSpan * 0.5, uSpan) - uSpan * 0.5;
  if (uRise > 0.0) {
    float ph = fract(uTime * uRiseSpeed / uRise + aSizeSeed.z);
    y += ph * uRise;
    x += sin(ph * 6.2831853 + aSizeSeed.z * 20.0) * aSizeSeed.x * 0.35;
    vLife = smoothstep(0.0, 0.18, ph) * (1.0 - smoothstep(0.55, 1.0, ph));
  }
  vec3 c = vec3(x, y, aPos.z) + vec3(position.x * aSizeSeed.x, position.y * aSizeSeed.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(c, 1.0);
}
`;

const PUFF_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uShadow;
uniform vec3 uFog;
uniform float uFogAmount;
uniform float uOpacity;
uniform float uHideCalm;
varying vec2 vUv;
varying float vSeed;
varying float vLife;
void main() {
  vec2 p = vUv;
  float n = fbm(p * 2.6 + vSeed * 31.0);
  float n2 = vnoise(p * 6.0 + vSeed * 7.0);
  float r = length(p * vec2(1.0, 1.55)) + (n - 0.5) * 0.75 + (n2 - 0.5) * 0.16;
  float dens = 1.0 - smoothstep(0.30, 0.95, r);
  float lit = smoothstep(-0.55, 0.65, p.y + (n - 0.5) * 0.7);
  vec3 col = mix(uShadow, uTop, lit);
  col = mix(col, uFog, uFogAmount);
  float a = dens * uOpacity * keepFade() * vLife * (1.0 - uHideCalm * uCalm);
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}
`;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** srgb to linear for shader constants (ShaderMaterial with toneMapped false writes raw values, so keep sRGB). */
function v3(hex: string): { value: [number, number, number] } {
  return { value: rgb(hex) };
}

export function PuffLayer({
  uniforms,
  puffs,
  top,
  shadow,
  fog = '#000000',
  fogAmount = 0,
  drift = 0,
  span = 0,
  riseSpeed = 0,
  rise = 0,
  opacity = 0.9,
  seed = 1,
  renderOrder = 0,
  hideInCalm = false,
}: PuffLayerProps) {
  const geometry = useMemo(() => {
    const base = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position as Float32BufferAttribute);
    const r = rng(seed);
    const pos = new Float32Array(puffs.length * 3);
    const sz = new Float32Array(puffs.length * 3);
    puffs.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      sz.set([p.w, p.h, r()], i * 3);
    });
    g.setAttribute('aPos', new InstancedBufferAttribute(pos, 3));
    g.setAttribute('aSizeSeed', new InstancedBufferAttribute(sz, 3));
    g.instanceCount = puffs.length;
    return g;
  }, [puffs, seed]);
  const material = useMemo(
    () =>
      roomMaterial(uniforms, {
        vertex: PUFF_VERT,
        fragment: PUFF_FRAG,
        uniforms: {
          uDrift: { value: drift },
          uSpan: { value: span },
          uRiseSpeed: { value: riseSpeed },
          uRise: { value: rise },
          uTop: v3(top),
          uShadow: v3(shadow),
          uFog: v3(fog),
          uFogAmount: { value: fogAmount },
          uOpacity: { value: opacity },
          uHideCalm: { value: hideInCalm ? 1 : 0 },
        },
      }),
    [uniforms, drift, span, riseSpeed, rise, top, shadow, fog, fogAmount, opacity, hideInCalm],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh geometry={geometry} material={material} renderOrder={renderOrder} frustumCulled={false} />
  );
}

/* ---------------- point sprites (stars, sparkles, spindrift, fireflies, motes) ---------------- */

export interface PointsProps {
  uniforms: RoomUniforms;
  /** world positions, x y z per point */
  positions: Float32Array;
  /** sRGB hex */
  colour: string;
  /** pixel size range in CSS px at DPR 1 */
  size: [number, number];
  /** twinkle frequency range in Hz (2 or less) and depth (0..1 alpha swing, at most 0.1 for stars) */
  twinkleHz?: [number, number];
  twinkle?: number;
  /** base alpha */
  alpha?: number;
  /** world drift per second (wrapped in a box of `wrap` metres around the start point) */
  velocity?: [number, number, number];
  wrap?: [number, number, number];
  seed?: number;
  hideInCalm?: boolean;
  /** additive blending for glows */
  additive?: boolean;
  renderOrder?: number;
}

const POINTS_VERT = /* glsl */ `
attribute float aSeed;
uniform vec2 uSize;
uniform vec2 uTwHz;
uniform vec3 uVel;
uniform vec3 uWrap;
varying float vSeed;
varying float vTw;
void main() {
  vec3 p = position;
  if (uWrap.x > 0.0) {
    vec3 ph = vec3(aSeed, fract(aSeed * 7.31), fract(aSeed * 13.7));
    p += mod(uVel * uTime + uWrap * ph, uWrap) - uWrap * 0.5;
  }
  vSeed = aSeed;
  vTw = sin(6.2831853 * mix(uTwHz.x, uTwHz.y, aSeed) * uTime + aSeed * 40.0);
  gl_PointSize = mix(uSize.x, uSize.y, pow(aSeed, 3.0)) * uView.z;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}
`;

const POINTS_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uAlpha;
uniform float uTwDepth;
uniform float uHideCalm;
varying float vSeed;
varying float vTw;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d));
  a *= a;
  a *= uAlpha * (1.0 - uTwDepth * (0.5 + 0.5 * vTw)) * keepFade() * (1.0 - uHideCalm * uCalm);
  if (a < 0.003) discard;
  vec3 col = mix(uColour, vec3(0.81, 0.85, 1.0), step(0.7, vSeed) * 0.6);
  gl_FragColor = vec4(col, a);
}
`;

export function PointSprites({
  uniforms,
  positions,
  colour,
  size,
  twinkleHz = [0.3, 1.2],
  twinkle = 0.1,
  alpha = 1,
  velocity = [0, 0, 0],
  wrap = [0, 0, 0],
  seed = 3,
  hideInCalm = false,
  additive = false,
  renderOrder = 0,
}: PointsProps) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const r = rng(seed);
    const s = new Float32Array(positions.length / 3);
    for (let i = 0; i < s.length; i += 1) s[i] = r();
    g.setAttribute('aSeed', new Float32BufferAttribute(s, 1));
    return g;
  }, [positions, seed]);
  const material: ShaderMaterial = useMemo(
    () =>
      roomMaterial(uniforms, {
        vertex: POINTS_VERT,
        fragment: POINTS_FRAG,
        additive,
        uniforms: {
          uSize: { value: size },
          uTwHz: { value: twinkleHz },
          uVel: { value: velocity },
          uWrap: { value: wrap },
          uColour: v3(colour),
          uAlpha: { value: alpha },
          uTwDepth: { value: twinkle },
          uHideCalm: { value: hideInCalm ? 1 : 0 },
        },
      }),
    [uniforms, size, twinkleHz, velocity, wrap, colour, alpha, twinkle, hideInCalm, additive],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <points
      geometry={geometry}
      material={material}
      renderOrder={renderOrder}
      frustumCulled={false}
    />
  );
}

/* ---------------- full-screen dim overlay (focus backdrop, channel-change dip) ---------------- */

const DIM_VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;
const DIM_FRAG = /* glsl */ `uniform float uDim; void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - uDim); }`;

/** Darkens the whole canvas to `dim` (1 = no change, 0.6 = the focus backdrop). Draws last. */
export function DimOverlay({ dim }: { dim: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uDim: { value: dim } },
        vertexShader: DIM_VERT,
        fragmentShader: DIM_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    material.uniforms.uDim!.value = dim;
  }, [material, dim]);
  useEffect(() => () => material.dispose(), [material]);
  if (dim >= 0.999) return null;
  return (
    <mesh renderOrder={1000} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export { ROOM_UNIFORMS_GLSL };

/* ---------------- generic sky sphere: gradient, horizon glow, optional aurora in the side columns ---------------- */

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uPale;
uniform vec3 uA1; uniform vec3 uA2; uniform float uAuroraOn; uniform float uHorizonElev; uniform float uGlowAmt;
varying vec3 vDir;
void main() {
  float e = asin(clamp(vDir.y, -1.0, 1.0));
  float az = atan(vDir.x, -vDir.z);
  float h = e - uHorizonElev;
  vec3 col = mix(uPale, uHorizon, smoothstep(-0.05, 0.10, h));
  col = mix(col, uMid, smoothstep(0.015, 0.30, h));
  col = mix(col, uZenith, smoothstep(0.20, 0.75, h));
  col = mix(col, uMid * 0.55, smoothstep(0.0, -0.18, h));
  float glow = exp(-pow((h - 0.015) / 0.06, 2.0)) * (0.65 + 0.35 * exp(-az * az * 1.4));
  col += uHorizon * glow * uGlowAmt;
  vec2 sp = vec2(gl_FragCoord.x, uView.y * uView.z - gl_FragCoord.y) / (uView.xy * uView.z);
  float side = 1.0 - smoothstep(0.20, 0.32, min(sp.x, 1.0 - sp.x));
  float upper = 1.0 - smoothstep(0.30, 0.52, sp.y);
  float t = uTime;
  float c1 = 0.11 + 0.05 * sin(az * 2.3 + t * 0.2094) + 0.025 * sin(az * 5.0 - t * 0.1571);
  float c2 = 0.205 + 0.04 * sin(az * 1.7 - t * 0.157 + 2.0);
  float curtain = 0.55 + 0.45 * vnoise(vec2(az * 9.0 + t * 0.05, e * 3.0));
  float rays = 0.55 + 0.45 * vnoise(vec2(az * 70.0, 3.0));
  float r1 = exp(-pow((e - c1) / 0.03, 2.0)) * curtain * rays;
  float r2 = exp(-pow((e - c2) / 0.024, 2.0)) * curtain * rays;
  float am = side * upper * keepFade() * uAuroraOn * 0.15;
  col = mix(col, uA1, clamp(r1 * am * 6.0, 0.0, 0.15));
  col = mix(col, uA2, clamp(r2 * am * 6.0, 0.0, 0.15));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function SkyDome({
  u,
  r,
  centre,
  zenith,
  mid,
  horizon,
  pale,
  horizonElev,
  aurora = false,
  glow = 0.3,
}: {
  u: RoomUniforms;
  r: number;
  centre: { x: number; y: number; z: number };
  zenith: string;
  mid: string;
  horizon: string;
  pale: string;
  horizonElev: number;
  aurora?: boolean;
  glow?: number;
}) {
  const material = useMemo(
    () =>
      roomMaterial(u, {
        vertex: SKY_VERT,
        fragment: SKY_FRAG,
        transparent: false,
        side: BackSide as unknown as typeof DoubleSide,
        uniforms: {
          uZenith: { value: new Color(zenith) },
          uMid: { value: new Color(mid) },
          uHorizon: { value: new Color(horizon) },
          uPale: { value: new Color(pale) },
          uA1: { value: new Color('#3fe0a0') },
          uA2: { value: new Color('#8a5ae0') },
          uAuroraOn: { value: aurora ? 1 : 0 },
          uHorizonElev: { value: horizonElev },
          uGlowAmt: { value: glow },
        },
      }),
    [u, zenith, mid, horizon, pale, horizonElev, aurora, glow],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      position={[centre.x, centre.y, centre.z]}
      material={material}
      renderOrder={-100}
      frustumCulled={false}
    >
      <sphereGeometry args={[r, 40, 24]} />
    </mesh>
  );
}

/* ---------------- small helpers shared by the interior rooms ---------------- */

/** Merged coloured boxes, lit by the room's lights (Lambert) or flat (basic). One draw call. */
export function Boxes({
  specs,
  flat = false,
  renderOrder = 0,
}: {
  specs: BoxSpec[];
  flat?: boolean;
  renderOrder?: number;
}) {
  const geometry = useMemo(() => mergeBoxes(specs), [specs]);
  const material = useMemo(
    () =>
      flat
        ? new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
        : new MeshLambertMaterial({ vertexColors: true }),
    [flat],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh geometry={geometry} material={material} renderOrder={renderOrder} frustumCulled={false} />
  );
}

/** Vertical gradient quad, unlit. Centre position, size, top and bottom sRGB colours. */
export function GradQuad({
  position,
  size,
  top,
  bottom,
  renderOrder = 0,
}: {
  position: [number, number, number];
  size: [number, number];
  top: string;
  bottom: string;
  renderOrder?: number;
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const [w, h] = size;
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [-w / 2, h / 2, 0, w / 2, h / 2, 0, w / 2, -h / 2, 0, -w / 2, -h / 2, 0],
        3,
      ),
    );
    const a = new Color(top);
    const b = new Color(bottom);
    g.setAttribute(
      'color',
      new Float32BufferAttribute([a.r, a.g, a.b, a.r, a.g, a.b, b.r, b.g, b.b, b.r, b.g, b.b], 3),
    );
    g.setIndex([0, 2, 1, 0, 3, 2]);
    return g;
  }, [size, top, bottom]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} renderOrder={renderOrder} frustumCulled={false}>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
  );
}

const GLOW_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColour;
uniform float uBase;
uniform float uUseSpill;
uniform float uFade;   // 1 = apply keepFade
void main() {
  float r = length(vUv);
  float a = exp(-r * r * 3.0) * (1.0 - smoothstep(0.85, 1.0, r)) * uBase * mix(1.0, uSpill, uUseSpill);
  a *= mix(1.0, keepFade(), uFade);
  gl_FragColor = vec4(uColour, a);
}
`;
const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;

/** Soft radial glow (lamps, light pools, spill washes, bokeh). Additive. `spill` modulates it with the shared flicker. */
export function Glow({
  u,
  position,
  size,
  colour,
  base,
  spill = false,
  fade = true,
  renderOrder = 10,
}: {
  u: RoomUniforms;
  position: [number, number, number];
  size: [number, number];
  colour: string;
  base: number;
  spill?: boolean;
  fade?: boolean;
  renderOrder?: number;
}) {
  const material = useMemo(
    () =>
      roomMaterial(u, {
        vertex: GLOW_VERT,
        fragment: GLOW_FRAG,
        additive: true,
        uniforms: {
          uColour: { value: new Color(colour) },
          uBase: { value: base },
          uUseSpill: { value: spill ? 1 : 0 },
          uFade: { value: fade ? 1 : 0 },
        },
      }),
    [u, colour, base, spill, fade],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={position} material={material} renderOrder={renderOrder} frustumCulled={false}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/** Point light whose intensity follows the shared spill (steady in Calm). Surround only, never the video. */
export function SpillLight({
  u,
  base,
  position,
  colour = '#ffffff',
  distance = 0,
  steady = false,
}: {
  u: RoomUniforms;
  base: number;
  position: [number, number, number];
  colour?: string;
  distance?: number;
  steady?: boolean;
}) {
  const light = useMemo(
    () => new PointLight(colour, base, distance, 1.6),
    [colour, base, distance],
  );
  useFrame(() => {
    light.intensity = steady ? base : base * u.uSpill.value;
  });
  return <primitive object={light} position={position} />;
}

/** Canvas text label for generic signs ("CHAI", "EXIT"). Unlit plane. */
export function CanvasSign({
  position,
  size,
  text,
  fg,
  bg,
  font = '700 64px "Barlow Condensed", Arial Narrow, sans-serif',
  renderOrder = 1,
}: {
  position: [number, number, number];
  size: [number, number];
  text: string;
  fg: string;
  bg: string;
  font?: string;
  renderOrder?: number;
}) {
  const map = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = Math.max(32, Math.round((256 * size[1]) / size[0]));
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = fg;
      g.font = font.replace('64px', `${Math.round(c.height * 0.7)}px`);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, c.width / 2, c.height / 2 + 2);
    }
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [text, fg, bg, font, size]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={position} renderOrder={renderOrder}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/* ---------------- ground plane with swaying grass shading ---------------- */

const GROUND_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uFar; uniform float uSway;
void main() {
  vec2 p = vUv * vec2(60.0, 40.0);
  float wind = sin(uTime * 0.7 + p.y * 0.3) * 0.6 * uSway;
  float blades = vnoise(vec2(p.x * 3.0 + wind, p.y * 0.7)) * 0.6 + vnoise(vec2(p.x * 9.0 + wind * 2.0, p.y * 1.7)) * 0.4;
  vec3 col = mix(uA, uB, blades);
  col = mix(uFar, col, smoothstep(1.0, 0.15, vUv.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

/** A flat ground quad (xz plane facing up) with swaying blade shading. uv.y runs from near (0) to far (1). */
export function Ground({
  u,
  position,
  size,
  a,
  b,
  far,
  sway = 1,
}: {
  u: RoomUniforms;
  position: [number, number, number];
  size: [number, number];
  a: string;
  b: string;
  far: string;
  sway?: number;
}) {
  const material = useMemo(
    () =>
      roomMaterial(u, {
        vertex: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
        fragment: GROUND_FRAG,
        transparent: false,
        depthWrite: true,
        uniforms: {
          uA: { value: new Color(a) },
          uB: { value: new Color(b) },
          uFar: { value: new Color(far) },
          uSway: { value: sway },
        },
      }),
    [u, a, b, far, sway],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}
