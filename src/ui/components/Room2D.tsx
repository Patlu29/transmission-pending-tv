import { useViewport } from '@/hooks/useViewport';
import type { Frame } from '@/ui/teletext/frame';
import { useChannelStore } from '@/state/channelStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { focusRect } from '@/ui/player/layout';
import { FooterLinks } from './FooterLinks';
import { Screen2D, TestCardCanvas } from './Screen2D';

const IDLE_CARD: NonNullable<Frame['card']> = { sub: 'STAND BY', loadingPercent: null, dim: false };

/**
 * `2d` mode (no WebGL). The TV room on channel 0 keeps v1's CSS CRT screen. Every other case is a
 * plain page: a CSS "skin" for the room (decoration only; a sibling of the player, never its
 * ancestor), the idle card when nothing is chosen, and a real footer (design-spec v2 2.5).
 */
export function Room2D() {
  const env = useEnvironmentStore((s) => s.id);
  const live = useChannelStore((s) => s.current);
  const viewport = useViewport();
  if (env === 'tv-room' && !live) return <Screen2D />;
  const idle = focusRect({ width: viewport.w, height: viewport.h }).rect;
  return (
    <div className="skin2d" data-room={env} aria-hidden={live ? 'true' : undefined}>
      {!live && (
        <div
          className="skin2d__idle"
          style={{ left: idle.x, top: idle.y, width: idle.width, height: idle.height }}
        >
          <TestCardCanvas width={idle.width} height={idle.height} card={IDLE_CARD} />
        </div>
      )}
      <footer className="skin2d__footer">
        <FooterLinks />
      </footer>
    </div>
  );
}
