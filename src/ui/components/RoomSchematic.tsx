import type { EnvironmentId } from '@/scene/environments/contract';

type Shape =
  | {
      t: 'r';
      x: number;
      y: number;
      w: number;
      h: number;
      c: 'bg' | 'mid' | 'hi' | 'screen' | 'dark';
    }
  | { t: 'c'; x: number; y: number; r: number; c: 'mid' | 'hi' | 'dark' }
  | { t: 'p'; d: string; c: 'bg' | 'mid' | 'hi' | 'dark' };

/** Original greyscale layouts on a 96 x 54 grid: the screen is always the pale rectangle. Decorative. */
const SHAPES: Record<EnvironmentId, Shape[]> = {
  'mountain-sky': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 26, y: 5, w: 44, h: 25, c: 'screen' },
    { t: 'p', d: 'M0 54 L0 40 L18 30 L32 42 L50 28 L72 44 L96 34 L96 54 Z', c: 'dark' },
    { t: 'r', x: 0, y: 46, w: 96, h: 8, c: 'mid' },
    { t: 'c', x: 20, y: 48, r: 7, c: 'hi' },
    { t: 'c', x: 76, y: 49, r: 8, c: 'hi' },
  ],
  'tv-room': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 18, y: 10, w: 60, h: 34, c: 'dark' },
    { t: 'r', x: 22, y: 14, w: 36, h: 26, c: 'screen' },
    { t: 'c', x: 68, y: 20, r: 3, c: 'hi' },
    { t: 'c', x: 68, y: 32, r: 3, c: 'hi' },
    { t: 'r', x: 0, y: 46, w: 96, h: 8, c: 'mid' },
  ],
  cinema: [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 20, y: 6, w: 56, h: 24, c: 'screen' },
    { t: 'r', x: 8, y: 38, w: 14, h: 8, c: 'mid' },
    { t: 'r', x: 30, y: 38, w: 14, h: 8, c: 'mid' },
    { t: 'r', x: 52, y: 38, w: 14, h: 8, c: 'mid' },
    { t: 'r', x: 74, y: 38, w: 14, h: 8, c: 'mid' },
  ],
  'drive-in': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 24, y: 6, w: 48, h: 22, c: 'screen' },
    { t: 'r', x: 0, y: 36, w: 96, h: 18, c: 'dark' },
    { t: 'p', d: 'M8 36 L88 36 L82 28 L14 28 Z', c: 'mid' },
  ],
  'open-air': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 24, y: 8, w: 48, h: 22, c: 'screen' },
    { t: 'c', x: 10, y: 6, r: 1.5, c: 'hi' },
    { t: 'c', x: 28, y: 4, r: 1.5, c: 'hi' },
    { t: 'c', x: 48, y: 3, r: 1.5, c: 'hi' },
    { t: 'c', x: 68, y: 4, r: 1.5, c: 'hi' },
    { t: 'c', x: 86, y: 6, r: 1.5, c: 'hi' },
    { t: 'r', x: 0, y: 44, w: 96, h: 10, c: 'mid' },
  ],
  bedroom: [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 22, y: 8, w: 44, h: 24, c: 'screen' },
    { t: 'r', x: 72, y: 6, w: 16, h: 24, c: 'mid' },
    { t: 'c', x: 12, y: 36, r: 5, c: 'hi' },
    { t: 'r', x: 0, y: 44, w: 96, h: 10, c: 'dark' },
  ],
  'chai-stall': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 34, y: 8, w: 30, h: 17, c: 'screen' },
    { t: 'r', x: 6, y: 28, w: 84, h: 8, c: 'mid' },
    { t: 'c', x: 18, y: 24, r: 3, c: 'hi' },
    { t: 'c', x: 78, y: 24, r: 3, c: 'hi' },
    { t: 'r', x: 0, y: 44, w: 96, h: 10, c: 'dark' },
  ],
  train: [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'bg' },
    { t: 'r', x: 12, y: 8, w: 72, h: 30, c: 'mid' },
    { t: 'r', x: 26, y: 12, w: 44, h: 22, c: 'screen' },
    { t: 'r', x: 0, y: 44, w: 96, h: 10, c: 'dark' },
  ],
  'space-deck': [
    { t: 'r', x: 0, y: 0, w: 96, h: 54, c: 'dark' },
    { t: 'r', x: 26, y: 8, w: 44, h: 24, c: 'screen' },
    { t: 'c', x: 10, y: 20, r: 8, c: 'mid' },
    { t: 'c', x: 86, y: 20, r: 8, c: 'mid' },
    { t: 'c', x: 40, y: 44, r: 1, c: 'hi' },
    { t: 'c', x: 60, y: 46, r: 1, c: 'hi' },
  ],
};

/** Inline SVG schematic of a room's layout. Greyscale, about 1 kB, decorative (aria-hidden). */
export function RoomSchematic({
  id,
  width,
  height,
}: {
  id: EnvironmentId;
  width: number;
  height: number;
}) {
  return (
    <svg
      className="schematic"
      width={width}
      height={height}
      viewBox="0 0 96 54"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[id].map((s, i) => {
        const cls = `sc-${s.c}`;
        if (s.t === 'r')
          return <rect key={i} className={cls} x={s.x} y={s.y} width={s.w} height={s.h} />;
        if (s.t === 'c') return <circle key={i} className={cls} cx={s.x} cy={s.y} r={s.r} />;
        return <path key={i} className={cls} d={s.d} />;
      })}
    </svg>
  );
}
