import { useEffect } from 'react';
import { useViewport } from '@/hooks/useViewport';
import { useDisplayStore } from '@/state/displayStore';
import { clearScreenSize, setScreenSize } from '@/ui/teletext/screen';

const MAX_PIXELS = 2048;

function cssPx(name: string, fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/** Reads env(safe-area-inset-*) through a probe element. */
function safeInsets() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Tells the rasteriser how big the screen is on the display (design-spec 3
 * and 5). 3d-set: min(0.56 vw, 0.82 vh) wide, 4:3, drawn at 960 x 720.
 * 3d-screen: the viewport minus the dock and bezel; the canvas element of the
 * scene host is placed exactly there (displayStore.screenRect).
 */
export function ScreenSizer() {
  const mode = useDisplayStore((s) => s.renderMode);
  const vp = useViewport();

  useEffect(() => {
    const display = useDisplayStore.getState();
    if (mode === '2d') {
      clearScreenSize();
      display.setScreenRect(null);
      return;
    }
    if (mode === '3d-set') {
      const cssW = Math.min(0.56 * vp.w, 0.82 * vp.h);
      setScreenSize({ cssW, cssH: cssW * 0.75, pixelW: 960, pixelH: 720 });
      display.setScreenRect(null);
      return;
    }
    const bezel = cssPx('--bezel-thin', 8);
    const dock = cssPx('--dock-size', 64);
    const inset = safeInsets();
    const landscape = vp.h < 500 && vp.w > vp.h;
    const rect = {
      x: inset.left + bezel,
      y: inset.top + bezel,
      w: Math.max(1, vp.w - inset.left - inset.right - 2 * bezel - (landscape ? dock : 0)),
      h: Math.max(1, vp.h - inset.top - inset.bottom - 2 * bezel - (landscape ? 0 : dock)),
    };
    const scale = Math.min(vp.dpr, MAX_PIXELS / Math.max(rect.w, rect.h));
    setScreenSize({ cssW: rect.w, cssH: rect.h, pixelW: rect.w * scale, pixelH: rect.h * scale });
    display.setScreenRect(rect);
  }, [mode, vp.w, vp.h, vp.dpr]);

  return null;
}
