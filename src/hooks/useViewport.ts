import { useEffect, useState } from 'react';

export interface Viewport {
  w: number;
  h: number;
  dpr: number;
}

const read = (): Viewport => ({
  w: window.innerWidth,
  h: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
});

/** Viewport size, debounced 150 ms after the first read. */
export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(read);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = read();
        setVp((p) => (p.w === next.w && p.h === next.h && p.dpr === next.dpr ? p : next));
      }, 150);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return vp;
}
