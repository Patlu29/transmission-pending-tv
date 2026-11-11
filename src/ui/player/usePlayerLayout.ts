import { useViewport } from '@/hooks/useViewport';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUiStore } from '@/state/uiStore';
import { panelCoversPlayer, resolveLayout, type ResolvedLayout } from './layout';

/** The layout the player layer is using right now. Shared with the HUD and tests. */
export function usePlayerLayout(): { layout: ResolvedLayout; covered: boolean } {
  const viewport = useViewport();
  const corners = usePlayerStore((s) => s.corners);
  const scenePlacement = usePlayerStore((s) => s.scenePlacement);
  const pose = useEnvironmentStore((s) => s.pose);
  const userFocus = useEnvironmentStore((s) => s.userFocus);
  const mode = useDisplayStore((s) => s.renderMode);
  const panel = useUiStore((s) => s.panel);
  const layout = resolveLayout({
    viewport: { width: viewport.w, height: viewport.h },
    corners,
    scenePlacement,
    pose,
    phone: mode === '3d-screen',
    mode2d: mode === '2d',
    userFocus,
  });
  const covered = panelCoversPlayer(panel, layout, { width: viewport.w, height: viewport.h });
  return { layout, covered };
}
