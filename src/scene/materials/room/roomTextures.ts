/**
 * Procedural greyscale room textures. Browser only (canvas). All tiles are seamless. Nothing is downloaded.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { drawOccupant } from '../ghost/drawOccupant.ts';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

/**
 * Wall paper: a faint diamond lattice with a small dot in each diamond, 256 by 256, seamless.
 * Pixel values stay within 120 to 136 (under 8 per cent contrast). Multiply by the material colour to set the brightness.
 */
export function createWallTexture(): CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgb(120,120,120)';
  ctx.lineWidth = 3;
  // Diagonal lattice with 64 px spacing, drawn with wrap-around overdraw so the tile is seamless.
  for (let k = -4; k <= 8; k += 1) {
    ctx.beginPath();
    ctx.moveTo(k * 64, -64);
    ctx.lineTo(k * 64 + 320, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k * 64, -64);
    ctx.lineTo(k * 64 - 320, 256);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgb(136,136,136)';
  for (let y = 0; y < 4; y += 1)
    for (let x = 0; x < 4; x += 1) {
      for (const [ox, oy] of [
        [32, 0],
        [0, 32],
        [32, 64],
        [64, 32],
      ] as const) {
        const cx = (x * 64 + ox) % 256;
        const cy = (y * 64 + oy) % 256;
        {
          ctx.beginPath();
          ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  // Faint vertical weave grain.
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = 'rgb(122,122,122)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 256);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dust fall for the shelf top: an alpha texture (grey specks, a few soft wisps) for a transparent overlay,
 * 256 by 256, seamless. R = G = B = 154 and alpha up to 0.35, so it reads as pale grey dust on a dark shelf.
 */
export function createDustTexture(): CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  const r = rng(1974);
  ctx.clearRect(0, 0, 256, 256);
  const wrapDraw = (x: number, y: number, fn: (px: number, py: number) => void): void => {
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) fn(x + dx, y + dy);
  };
  // Soft wisps (wide, very faint).
  for (let i = 0; i < 14; i += 1) {
    const x = r() * 256;
    const y = r() * 256;
    const rad = 18 + r() * 34;
    wrapDraw(x, y, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(154,154,154,0.10)');
      g.addColorStop(1, 'rgba(154,154,154,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
  // Specks.
  for (let i = 0; i < 520; i += 1) {
    const x = r() * 256;
    const y = r() * 256;
    const s = 0.5 + r() * 1.2;
    const a = 0.08 + r() * 0.27;
    wrapDraw(x, y, (px, py) => {
      ctx.fillStyle = `rgba(154,154,154,${a})`;
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // A few fibres.
  ctx.strokeStyle = 'rgba(154,154,154,0.3)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 26; i += 1) {
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * Math.PI * 2;
    const len = 6 + r() * 14;
    wrapDraw(x, y, (px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + Math.cos(a) * len * 0.5,
        py + Math.sin(a + 0.8) * len * 0.5,
        px + Math.cos(a) * len,
        py + Math.sin(a) * len,
      );
      ctx.stroke();
    });
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

/** Soft elliptical blob for the contact shadow: black with a radial alpha falloff, 128 by 128. */
export function createBlobShadowTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.95)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

/**
 * Wall decal map: the Occupant's silhouette, soft-edged, white on opaque black (use as `alphaMap`, which reads green).
 * 128 by 192, the same 2:3 shape as the sprite.
 */
export function createDecalTexture(): CanvasTexture {
  const [c, ctx] = canvas(128, 192);
  drawOccupant(ctx, 128, 192, { mode: 'silhouette' });
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 128, 192);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

/** Decal opacity from `hauntStore.shadow` (0..1): never above 0.10. */
export function decalOpacity(shadow: number): number {
  return Math.min(0.1, Math.max(0, shadow) * 0.1);
}
