import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoBlending,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { createOccupantCanvas } from '../../materials/holo/occupant2050.ts';
import vertexShader from './holo.vert.glsl?raw';
import fragmentShader from './holo.frag.glsl?raw';

/** Seconds the warm-up timeline lasts. The shader's key times are tied to this length. */
export const WARMUP_SECONDS = 2.2;
/** Default power-off collapse length in seconds. */
export const COLLAPSE_SECONDS = 0.55;
/** Hard ceiling for the noise rate (design-spec 7.2). */
export const MAX_NOISE_HZ = 24;
/** Smallest grain cell in CSS px (design-spec 7.2). */
export const MIN_GRAIN_PX = 2;

/** Every uniform of the holo screen material, with its meaning and range. */
export interface HoloUniformValues {
  /** Teletext canvas texture. Set sRGB and mipmaps by `prepareScreenTexture`. */
  uMap: Texture | null;
  /** Seconds. Drives noise frames, rolling bar and jitter. */
  uTime: number;
  /** Warm-up progress 0..1 (0 = set off, 1 = settled). */
  uWarmup: number;
  /** Power-off collapse progress 0..1 (0 = not collapsing, 1 = black). */
  uCollapse: number;
  /** 1 = calm / reduced motion (frozen noise, no bar, no jitter, no glow flicker). */
  uCalm: number;
  /** Device pixels per CSS px (renderer pixel ratio). */
  uPixelRatio: number;
  /** Glass width over height. Default 4/3. */
  uAspect: number;
  /** Picture gain 0..1 (use 0.4 for the dim loading card). */
  uBrightness: number;
  /** Rolling bar strength 0..1. */
  uBar: number;
  /** Channel-change burst 0..1. */
  uBurst: number;
  /** Noise frames per second, clamped to 24 in the shader. */
  uNoiseHz: number;
  /** Peak of the zero-mean grain in linear luminance. */
  uNoiseAmp: number;
  /** Grain cell size in CSS px, never below 2. */
  uGrainPx: number;
  /** Barrel strength. About 0.04 on the domed set glass, 0.08 on a flat quad. */
  uCurvature: number;
  /** Scanline count over the glass height. */
  uScanlines: number;
  /** Darkest scanline reduction 0..1. */
  uScanStrength: number;
  /** Corner darkening 0..1. */
  uVignette: number;
  /** Phosphor glow gain. */
  uGlow: number;
  /** Mip level used as the glow blur. */
  uGlowLod: number;
  /** Glass corner radius as a fraction of the glass width. */
  uCorner: number;
  /** Warm-up static luminance gain. Mean static luminance = level x 0.5 x opacity. */
  uStaticLevel: number;
  /** Faint window reflection while the set is off, 0 to 0.05 in luminance. */
  uReflection: number;
  /** Retired (kept so the seam compiles). */
  uJitter: number;
  /** 1 draws the 2 px edge light inside the glass (3d-screen and 2d). Use 0 when the HoloDisplay model has its own. */
  uEdge: number;
  /** 1 = Monochrome: grey output and no colour fringe. */
  uMono: number;
  /** Occupant sprite (`drawOccupant`, R = tone, A = coverage). Linear filter, no mipmaps. */
  uGhostMap: Texture | null;
  /** 0..1 how much of the figure has emerged from the static (`hauntStore.ghost`). */
  uGhost: number;
  /** 0..1 closeness: size, position, mouth and fog from 0.8 (`hauntStore.ghostNear`). */
  uGhostNear: number;
  /** Any number. Changes the strip tracking pattern. */
  uGhostSeed: number;
  /** Luminance ceiling for the figure over glyph cells and one cell round them. Default 0.07. */
  uGhostTextCap: number;
  /** Luminance ceiling for the figure on blank screen. Default 0.30. */
  uGhostPeak: number;
  /** 0 = no roll, else phase 0..1 through one roll (see `rollPhase`). */
  uRoll: number;
  /** 0..0.25 extra dim at the edge, outside the safe area only (`hauntStore.dim` in 3d-screen). */
  uHauntVignette: number;
}

export const HOLO_DEFAULTS: Omit<HoloUniformValues, 'uMap' | 'uGhostMap'> = {
  uTime: 0,
  uWarmup: 0,
  uCollapse: 0,
  uCalm: 0,
  uPixelRatio: 1,
  uAspect: 16 / 9,
  uBrightness: 1,
  uBar: 1,
  uBurst: 0,
  uNoiseHz: 12,
  uNoiseAmp: 0.012,
  uGrainPx: 2.5,
  uCurvature: 0,
  uScanlines: 0,
  uScanStrength: 0,
  uVignette: 0.2,
  uGlow: 0.1,
  uGlowLod: 2.5,
  uCorner: 0.016,
  uStaticLevel: 0,
  uReflection: 0.03,
  uJitter: 0,
  uEdge: 1,
  uMono: 0,
  uGhost: 0,
  uGhostNear: 0,
  uGhostSeed: 0,
  uGhostTextCap: 0.07,
  uGhostPeak: 0.3,
  uRoll: 0,
  uHauntVignette: 0,
};

export type HoloShaderMaterial = ShaderMaterial & {
  uniforms: { [K in keyof HoloUniformValues]: { value: HoloUniformValues[K] } };
};

/**
 * Makes a canvas texture suitable for the screen shader: sRGB (so the shader works in linear light),
 * mipmapped (the glow reads a blurred mip), clamped.
 */
export function prepareScreenTexture<T extends Texture>(texture: T): T {
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

let sharedOccupant: CanvasTexture | null = null;

/** The shared Occupant sprite texture (linear filter, no mipmaps, raw tone in R). Browser only; created once. */
export function getOccupantTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!sharedOccupant) {
    const tex = new CanvasTexture(createOccupantCanvas());
    tex.generateMipmaps = false;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    sharedOccupant = tex;
  }
  return sharedOccupant;
}

/** Builds the holo screen ShaderMaterial. Requires WebGL2. Dispose it when done. */
export function createHoloScreenMaterial(
  texture: Texture | null,
  overrides: Partial<Omit<HoloUniformValues, 'uMap'>> = {},
): HoloShaderMaterial {
  const values: HoloUniformValues = {
    uMap: texture,
    uGhostMap: getOccupantTexture(),
    ...HOLO_DEFAULTS,
    ...overrides,
  };
  const uniforms: Record<string, { value: unknown }> = {};
  for (const [key, value] of Object.entries(values)) uniforms[key] = { value };
  const material = new ShaderMaterial({
    name: 'HoloScreen',
    uniforms,
    vertexShader,
    fragmentShader,
    blending: NoBlending,
    transparent: false,
    depthWrite: true,
    toneMapped: true,
  });
  return material as HoloShaderMaterial;
}

/** Typed access to the live uniform slots (mutate `.value` each frame; never replace the objects). */
export function holoUniforms(material: HoloShaderMaterial): HoloShaderMaterial['uniforms'] {
  return material.uniforms;
}

/** Sets the screen texture, preparing it first (sRGB, mipmaps). */
export function setHoloTexture(material: HoloShaderMaterial, texture: Texture | null): void {
  if (texture) prepareScreenTexture(texture);
  material.uniforms.uMap.value = texture;
}

// Measured on rendered frames of the calibration field (mean 0.066), as a fraction of the settled picture mean.
const MATERIALISE: Array<[number, number]> = [
  [0, 0],
  [0.4, 0.0015],
  [0.7, 0.02],
  [0.9, 0.026],
  [1.1, 0.055],
  [1.25, 0.065],
  [1.5, 0.27],
  [1.7, 0.645],
  [1.9, 0.69],
  [2.05, 0.86],
  [2.2, 1],
];
// Fold: value against collapse progress 0..1.
const FOLD: Array<[number, number]> = [
  [0, 1],
  [0.05, 1],
  [0.18, 0.905],
  [0.36, 0.785],
  [0.5, 0.705],
  [0.65, 0.103],
  [0.75, 0.08],
  [0.85, 0.028],
  [0.95, 0],
  [1, 0],
];

function table(points: Array<[number, number]>, x: number): number {
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return points[points.length - 1]![1];
}

/**
 * Estimate of the mean linear luminance of the whole screen, for driving the room light (no GPU read-back). Built from
 * measured frames: materialise within 5 per cent and fold within 8 per cent of the rendered mean.
 *
 * @param pictureMean mean linear luminance of the settled picture. The calibration field measures 0.066 and the text
 *   page about 0.062 at the 3d-set card size.
 */
export function estimateHoloMeanLuminance(options: {
  warmup: number;
  collapse: number;
  pictureMean: number;
  brightness?: number;
}): number {
  const { warmup, collapse, pictureMean, brightness = 1 } = options;
  const picture = pictureMean * brightness;
  if (collapse > 0) return picture * table(FOLD, Math.min(1, collapse));
  if (warmup <= 0) return 0.0004; // faint reflection on the smoked glass
  return picture * table(MATERIALISE, Math.min(1, warmup) * WARMUP_SECONDS);
}

/** Shortest roll that respects the 0.8 screen heights per second peak speed (design-spec 16.6.1). */
export const ROLL_MIN_SECONDS = 2.4;

/**
 * Slip offset in screen heights for phase p (0..1). Same formula as the shader: a cosine sweep over the first
 * 5/6 (one full wrap), then a damped settle that overshoots by under 2 per cent. Use it for the 2D mode:
 * translate the screen contents by `rollOffset(p) % 1` of the screen height and draw a second copy to wrap.
 */
export function rollOffset(p: number): number {
  if (p <= 0) return 0;
  const main = 5 / 6;
  if (p < main) return 0.5 - 0.5 * Math.cos((Math.PI * p) / main);
  const r = (p - main) / (1 - main);
  return 1 + 0.03 * Math.sin(Math.PI * r) * (1 - r);
}

/**
 * Phase for `uRoll` from the roll record in hauntStore: `{ active, startedAt, dur }` with times in seconds on the
 * same clock as `now`. Returns 0 when not active, and never goes below 0.0001 while rolling so the shader sees it.
 * `dur` is clamped up to `ROLL_MIN_SECONDS`.
 */
export function rollPhase(
  roll: { active: boolean; startedAt: number; dur: number },
  now: number,
): number {
  if (!roll.active) return 0;
  const dur = Math.max(roll.dur, ROLL_MIN_SECONDS);
  const p = (now - roll.startedAt) / dur;
  if (p <= 0 || p >= 1) return 0;
  return Math.max(p, 0.0001);
}
