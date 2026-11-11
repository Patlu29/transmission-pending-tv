import { useEffect, useRef, type CSSProperties } from 'react';
import { useViewport } from '@/hooks/useViewport';
import { ENVIRONMENTS } from '@/scene/environments/registry';
import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUiStore } from '@/state/uiStore';
import { playerController } from './controller';
import { InfoRow, NoSignalCard, StillCard } from './Cards';
import { focusRect } from './layout';
import { usePlayerLayout } from './usePlayerLayout';

function rectStyle(r: { x: number; y: number; width: number; height: number }): CSSProperties {
  return { left: r.x, top: r.y, width: r.width, height: r.height };
}

/**
 * The one YouTube player for the whole visit, in a DOM layer ABOVE the canvas (ADR 0011).
 *
 * Rules kept here: the holder (the iframe's only parent) is positioned with plain left, top, width
 * and height; no transform, filter, opacity, mask or blend is ever set on it or its ancestors;
 * the iframe is never moved; a channel change reuses the player; channel 0 and Stop destroy it.
 * The player is hidden and paused (never covered) while a panel, the browse pose or an unsettled
 * layout would overlap it.
 */
export function PlayerHost() {
  const holderRef = useRef<HTMLDivElement>(null);
  const pausedByUs = useRef(false);
  const current = useChannelStore((s) => s.current);
  const started = useChannelStore((s) => s.started);
  const phase = usePlayerStore((s) => s.phase);
  const error = usePlayerStore((s) => s.error);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const envId = useEnvironmentStore((s) => s.id);
  const viewport = useViewport();
  const { layout, covered } = usePlayerLayout();

  useEffect(() => {
    playerController.attach(holderRef.current);
    return () => playerController.attach(null);
  }, []);

  // Start, change or remove the video. The player (and the YouTube script) exist only after a pick.
  const videoId = current?.videoId ?? null;
  const title = current?.name ?? '';
  useEffect(() => {
    if (!videoId) playerController.destroy();
    else if (started) void playerController.play(videoId, title, calm);
  }, [videoId, title, started, calm]);

  const visible = !!current && started && layout.kind !== 'hidden' && !covered && !error;

  // Never play while hidden; resume only what we paused.
  useEffect(() => {
    playerController.setHidden(!visible);
    if (!visible && phase === 'playing') {
      pausedByUs.current = true;
      playerController.pause();
    } else if (visible && phase === 'paused' && pausedByUs.current) {
      pausedByUs.current = false;
      playerController.resume();
    }
  }, [visible, phase]);

  const rect =
    layout.kind === 'hidden'
      ? focusRect({ width: viewport.w, height: viewport.h }).rect
      : layout.rect;
  const showCards = !!current && layout.kind !== 'hidden' && !covered;
  const shown = layout.kind === 'hidden' || covered ? null : layout;

  return (
    <div className="player-layer" data-layout={layout.kind} data-room={envId}>
      {current && (
        <a
          className="player-skip key"
          href="#dock"
          onClick={(e) => {
            e.preventDefault();
            useUiStore.getState().requestFocus('guide');
          }}
        >
          Skip to controls
        </a>
      )}
      <div
        ref={holderRef}
        className="player-holder"
        data-visible={visible}
        style={{ ...rectStyle(rect), visibility: visible ? 'visible' : 'hidden' }}
      />
      {showCards && current && !started && <StillCard channel={current} style={rectStyle(rect)} />}
      {showCards && error && (
        <NoSignalCard error={error} channel={current} style={rectStyle(rect)} />
      )}
      {shown && current && <InfoRow channel={current} info={shown.info} layout={shown} />}
      <span className="sr-only">{ENVIRONMENTS[envId].label}</span>
    </div>
  );
}
