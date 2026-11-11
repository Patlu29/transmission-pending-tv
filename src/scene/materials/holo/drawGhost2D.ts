/**
 * 2D-mode equivalent of the holo shader's Occupant layer (design-spec-2050 4.2, "2D"). Replaces the 1970s drawGhost2D. A CPU port of the same
 * emergence, strips, placement and luminance ceilings, drawn at low resolution so it is cheap and its grain is
 * coarse. Call it at 30 Hz at most while `ghost` is above 0, and not at all under Calm.
 *
 * Usage (frontend):
 *   const layer = document.createElement('canvas'); layer.width = 192; layer.height = 144;
 *   layer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none';
 *   // put it above the screen background and BELOW the text, then each 33 ms while haunted:
 *   drawGhost2D(layer.getContext('2d')!, 192, 144, { ghost, near, time, aspect: screenW / screenH,
 *     textMask: rasteriserCanvas, scale: 192 / screenCssWidth });
 *
 * The layer is white with alpha equal to the sRGB-encoded luminance, so over the black screen it shows the same
 * grey the shader would. `textMask` (the rasteriser canvas) is used to cap the figure over glyph cells and one cell
 * round them. Without it, pass `uniformCap: true` to cap the whole layer instead (safe but faint).
 */
import { OCCUPANT_H, OCCUPANT_W, createOccupantCanvas } from './occupant2050.ts';

/** Shared with the shader: scales the figure so its mean contribution stays under 0.05. */
export const GHOST_AREA_GAIN = 1.4;
/** Shared with the shader: effective text cap is `textCap` times this, to keep post-effect contrast at 4.5:1. */
export const GHOST_TEXT_CAP_SCALE = 0.9;

export interface Ghost2DOptions {
  ghost: number;
  near: number;
  /** Seconds on any steady clock. */
  time: number;
  /** Glass width over height. */
  aspect: number;
  seed?: number;
  peak?: number;
  textCap?: number;
  /** Noise frames per second (12 behind text). */
  noiseHz?: number;
  /** Canvas pixels per CSS px (strip height is 3 CSS px). */
  scale?: number;
  /** The rasteriser canvas, used as the text mask. */
  textMask?: CanvasImageSource | null;
  /** Cap the whole layer at the text cap when no mask is given. */
  uniformCap?: boolean;
  /** Monochrome: grey figure, no colour fringe. */
  mono?: boolean;
}

let sprite: { data: Uint8ClampedArray } | null = null;

function getSprite(): Uint8ClampedArray | null {
  if (typeof document === 'undefined') return null;
  if (!sprite) {
    const c = createOccupantCanvas();
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    sprite = { data: ctx.getImageData(0, 0, OCCUPANT_W, OCCUPANT_H).data };
  }
  return sprite.data;
}

function hash12(x: number, y: number): number {
  let p3x = (x * 0.1031) % 1;
  let p3y = (y * 0.1031) % 1;
  let p3z = (x * 0.1031) % 1;
  if (p3x < 0) p3x += 1;
  if (p3y < 0) p3y += 1;
  if (p3z < 0) p3z += 1;
  const d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33);
  p3x += d;
  p3y += d;
  p3z += d;
  const v = (p3x + p3y) * p3z;
  return v - Math.floor(v);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash12(xi, yi) + (hash12(xi + 1, yi) - hash12(xi, yi)) * fx;
  const b = hash12(xi, yi + 1) + (hash12(xi + 1, yi + 1) - hash12(xi, yi + 1)) * fx;
  return a + (b - a) * fy;
}

const ss = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function drawGhost2D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  o: Ghost2DOptions,
): void {
  ctx.clearRect(0, 0, w, h);
  if (o.ghost <= 0.0001) return;
  const spr = getSprite();
  if (!spr) return;
  const peak = o.peak ?? 0.3;
  const textCap = (o.textCap ?? 0.07) * GHOST_TEXT_CAP_SCALE;
  const seed = o.seed ?? 0;
  const scale = o.scale ?? 1;
  const frame = Math.floor(o.time * Math.min(24, o.noiseHz ?? 12));

  // Text mask, dilated by about 14 CSS px.
  let mask: Float32Array | null = null;
  if (o.textMask) {
    const m = document.createElement('canvas');
    m.width = w;
    m.height = h;
    const mc = m.getContext('2d', { willReadFrequently: true });
    if (mc) {
      mc.drawImage(o.textMask, 0, 0, w, h);
      const px = mc.getImageData(0, 0, w, h).data;
      const base = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i += 1) {
        const l =
          (0.2126 * (px[i * 4] ?? 0) +
            0.7152 * (px[i * 4 + 1] ?? 0) +
            0.0722 * (px[i * 4 + 2] ?? 0)) /
          255;
        base[i] = l > 0.08 ? 1 : 0;
      }
      const r = Math.max(1, Math.round(14 * scale));
      const hz = new Uint8Array(w * h);
      for (let y = 0; y < h; y += 1)
        for (let x = 0; x < w; x += 1) {
          let v = 0;
          for (let k = -r; k <= r && !v; k += 1) {
            const xx = x + k;
            if (xx >= 0 && xx < w && base[y * w + xx]) v = 1;
          }
          hz[y * w + x] = v;
        }
      mask = new Float32Array(w * h);
      for (let y = 0; y < h; y += 1)
        for (let x = 0; x < w; x += 1) {
          let v = 0;
          for (let k = -r; k <= r && !v; k += 1) {
            const yy = y + k;
            if (yy >= 0 && yy < h && hz[yy * w + x]) v = 1;
          }
          mask[y * w + x] = v;
        }
    }
  }

  const ne = o.near * o.near * (3 - 2 * o.near);
  const spriteH = ((0.35 + (0.95 - 0.35) * ne) * (0.7 / 0.95)) / 0.3229;
  const headCx = 0.06 * Math.sin((2 * Math.PI * o.time) / 40) * o.aspect;
  const headCy = 0.5 - (0.62 + (0.45 - 0.62) * ne);
  const mouthA = ss(0.8, 1, o.near);
  const stripPx = Math.max(1, 3 * scale);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    const uvy = 1 - (y + 0.5) / h;
    void stripPx;
    for (let x = 0; x < w; x += 1) {
      const uvx = (x + 0.5) / w;
      const pgx = (uvx - 0.5) * o.aspect;
      const pgy = uvy - 0.5;
      const syRaw = 0.3125 - (pgy - headCy) / spriteH;
      const slice = Math.floor(syRaw * 48);
      const fr = syRaw * 48 - slice;
      const syTop = (slice + 0.5) / 48;
      const shift =
        (vnoise(slice * 0.31 + seed * 7, o.time * 0.2) - 0.5) * 2 * 0.012 +
        0.03 * Math.exp(-(((syRaw - 0.508) / 0.02) ** 2));
      const sx = 0.5 + (pgx - headCx - shift * o.aspect) / (spriteH * 0.66667);
      let lum = 0;
      if (sx >= 0 && sx <= 1 && syTop >= 0 && syTop <= 1) {
        const ix = Math.min(OCCUPANT_W - 1, Math.floor(sx * OCCUPANT_W));
        const iy = Math.min(OCCUPANT_H - 1, Math.floor(syTop * OCCUPANT_H));
        const si = (iy * OCCUPANT_W + ix) * 4;
        const tone = (spr[si] ?? 0) / 255;
        let cover = (spr[si + 3] ?? 0) / 255;
        // the seam parts into a slit from near 0.8, up to 8 units wide, brow to chin
        const slitW = 0.002 + (0.0156 - 0.002) * mouthA;
        if (syTop > 0.2 && syTop < 0.5)
          cover *= 1 - mouthA * (1 - ss(slitW * 0.7, slitW, Math.abs(sx - 0.5)));
        const nl = hash12(x + frame * 37 + 11, y + frame * 17 + 29);
        const low = vnoise(uvx * 9 * o.aspect + o.time * 0.05, uvy * 9 + seed * 3.1);
        const n = (low + nl) / 2;
        const want = o.ghost * 1.2 * (0.55 + 0.45 * Math.min(1.3, tone / 0.85));
        const vis = ss(n - 0.12, n + 0.12, want);
        const rim = 1 + 0.7 * (1 - ss(0, 0.09, fr));
        const gap = 1 - 0.3 * ss(0.88, 1, fr);
        lum = peak * GHOST_AREA_GAIN * (1 - 0.45 * ne) * (tone / 0.85) * cover * vis * rim * gap;
      }
      lum = Math.min(lum, peak);
      const cap = mask ? (mask[y * w + x] ? textCap : peak) : o.uniformCap ? textCap : peak;
      lum = Math.min(lum, cap);
      const s = Math.pow(lum, 1 / 2.2);
      const i = (y * w + x) * 4;
      img.data[i] = o.mono ? 235 : 207;
      img.data[i + 1] = o.mono ? 235 : 234;
      img.data[i + 2] = o.mono ? 235 : 255;
      img.data[i + 3] = Math.round(s * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}
