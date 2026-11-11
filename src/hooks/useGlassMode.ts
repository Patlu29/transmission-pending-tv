import { useEffect } from 'react';
import { computeGlassSolid } from '@/state/glassRule';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * Solid panels (T50-6, T50-7, design-spec-2050 1.5 and 6.3): sets `data-glass="solid"` on <html>
 * (every translucent surface becomes opaque, no blur) when any of these holds:
 *   - the viewer's "Solid panels" option,
 *   - `prefers-reduced-transparency: reduce` or `prefers-contrast: more`,
 *   - `backdrop-filter` is unsupported,
 *   - the scene's AdaptiveDpr stepped down (`html[data-dpr-stepped='true']`).
 * Also sets `data-colour="mono"` for Monochrome. Returns nothing; read `isGlassSolid()` for tests.
 */
export function supportsBackdropFilter(): boolean {
  try {
    return (
      CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
    );
  } catch {
    return false;
  }
}

export function useGlassMode(): void {
  const manual = useSettingsStore((s) => s.solidPanels);
  const colour = useSettingsStore((s) => s.colour);

  useEffect(() => {
    document.documentElement.dataset.colour = colour === 'colour' ? 'colour' : 'mono';
  }, [colour]);

  useEffect(() => {
    const root = document.documentElement;
    const rt = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const pc = window.matchMedia('(prefers-contrast: more)');
    const apply = () => {
      const solid = computeGlassSolid({
        manual,
        reducedTransparency: rt.matches,
        contrastMore: pc.matches,
        backdropSupported: supportsBackdropFilter(),
        dprStepped: root.dataset.dprStepped === 'true',
      });
      if (solid) root.dataset.glass = 'solid';
      else delete root.dataset.glass;
    };
    apply();
    rt.addEventListener('change', apply);
    pc.addEventListener('change', apply);
    // AdaptiveDpr sets html[data-dpr-stepped] once it has stepped down.
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ['data-dpr-stepped'] });
    return () => {
      rt.removeEventListener('change', apply);
      pc.removeEventListener('change', apply);
      mo.disconnect();
    };
  }, [manual]);
}
