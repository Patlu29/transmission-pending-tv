/**
 * Procedural greyscale textures for the TV body. Browser only (canvas). Generated at mount, nothing downloaded.
 * Every pixel has R = G = B.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { TV_GREYS, TV_LAYOUT } from './layout.ts';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToGrey(hex: string): number {
  return parseInt(hex.slice(1, 3), 16);
}

/** Smooth 2D value noise whose lattice wraps every `px` by `py` cells, so the texture tiles. */
function makeNoise(seed: number, px: number, py: number): (u: number, v: number) => number {
  const rnd = mulberry32(seed);
  const table = new Float32Array(px * py);
  for (let i = 0; i < table.length; i += 1) table[i] = rnd();
  const at = (xi: number, yi: number): number =>
    table[(((yi % py) + py) % py) * px + (((xi % px) + px) % px)] ?? 0;
  return (u, v) => {
    const x = u * px;
    const y = v * py;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Grey walnut: long grain streaks between --tv-wood-dark and --tv-wood-light around --tv-wood-mid. Also usable as a bump map. */
export function createWoodTexture(size = 512, seed = 1974): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const img = ctx.createImageData(size, size);
  const warpLow = makeNoise(seed, 3, 12);
  const warpHigh = makeNoise(seed + 1, 8, 40);
  const fibreNoise = makeNoise(seed + 2, 24, 160);
  const dark = hexToGrey(TV_GREYS.woodDark);
  const mid = hexToGrey(TV_GREYS.woodMid);
  const light = hexToGrey(TV_GREYS.woodLight);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const warp = warpLow(u, v) * 2 + warpHigh(u, v) * 0.6;
      const ring = Math.sin((v * 9 + warp * 1.6) * Math.PI * 2);
      const fibre = fibreNoise(u, v) - 0.5;
      const t = 0.5 + 0.26 * ring + 0.2 * fibre; // 0..1 around 0.5
      const g = t < 0.5 ? dark + (mid - dark) * (t / 0.5) : mid + (light - mid) * ((t - 0.5) / 0.5);
      const grey = Math.max(0, Math.min(255, Math.round(g)));
      const o = (y * size + x) * 4;
      img.data[o] = grey;
      img.data[o + 1] = grey;
      img.data[o + 2] = grey;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 1;
  return tex;
}

const PLATE_PX_PER_UNIT = 1450;

/**
 * Control plate: dark plastic with etched caps labels (POWER, CH, VOL), channel tick marks and the speaker
 * grille slots with a faint cloth weave. Draws again once Barlow Condensed has loaded.
 */
export function createPlateTexture(): { texture: CanvasTexture; ready: Promise<void> } {
  const P = TV_LAYOUT.plate;
  const w = Math.round(P.width * PLATE_PX_PER_UNIT);
  const h = Math.round(P.height * PLATE_PX_PER_UNIT);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  // Cabinet-local metres to canvas pixels (canvas y runs down, texture v runs up).
  const px = (x: number): number => (x - (P.cx - P.width / 2)) * PLATE_PX_PER_UNIT;
  const py = (y: number): number => (P.cy + P.height / 2 - y) * PLATE_PX_PER_UNIT;
  const s = PLATE_PX_PER_UNIT;

  const draw = (): void => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, w, h);

    // Grille recess with horizontal slots over a cloth weave.
    const g = TV_LAYOUT.grille;
    const gx = px(g.x - g.width / 2);
    const gy = py(g.y + g.height / 2);
    const gw = g.width * s;
    const gh = g.height * s;
    ctx.fillStyle = TV_GREYS.grille;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = '#232323';
    const slots = 16;
    for (let i = 0; i < slots; i += 1) {
      const sy = gy + (gh / slots) * (i + 0.18);
      ctx.fillRect(gx + 0.012 * s, sy, gw - 0.024 * s, (gh / slots) * 0.46);
    }
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    for (let x = gx; x < gx + gw; x += 3) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy + gh);
      ctx.stroke();
    }
    for (let y = gy; y < gy + gh; y += 3) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Tick marks around the channel knob (270 degrees, twelve ticks) and end dots round the volume knob.
    const drawTicks = (kx: number, ky: number, r: number, n: number, long: boolean): void => {
      ctx.strokeStyle = '#a8a8a8';
      ctx.lineWidth = Math.max(2, 0.0018 * s);
      for (let i = 0; i < n; i += 1) {
        const a = (225 - (270 * i) / (n - 1)) * (Math.PI / 180);
        const r0 = r * 1.42;
        const r1 = r * (long ? 1.72 : 1.58);
        ctx.beginPath();
        ctx.moveTo(px(kx) + Math.cos(a) * r0 * s, py(ky) - Math.sin(a) * r0 * s);
        ctx.lineTo(px(kx) + Math.cos(a) * r1 * s, py(ky) - Math.sin(a) * r1 * s);
        ctx.stroke();
      }
    };
    const K = TV_LAYOUT.knobs;
    drawTicks(K.channel.x, K.channel.y, K.channel.radius, 12, true);
    drawTicks(K.volume.x, K.volume.y, K.volume.radius, 6, false);

    // Etched labels.
    ctx.fillStyle = '#a8a8a8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(0.03 * s)}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
    if ('letterSpacing' in ctx)
      (ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(0.002 * s)}px`;
    ctx.fillText('CH', px(K.channel.x), py(0.105));
    ctx.fillText('VOL', px(K.volume.x), py(0.105));
    ctx.fillText('POWER', px(0.36), py(K.power.y));

    texture.needsUpdate = true;
  };

  draw();
  const ready =
    typeof document !== 'undefined' && 'fonts' in document
      ? document.fonts
          .load('600 24px "Barlow Condensed"')
          .then(() => draw())
          .catch(() => undefined)
      : Promise.resolve();
  return { texture, ready };
}
