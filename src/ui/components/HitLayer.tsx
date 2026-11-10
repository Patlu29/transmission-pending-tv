import type { MouseEvent } from 'react';
import { facts, intro } from '@/facts';
import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { performEmptyTap, performTap } from '@/ui/actions';
import { buildFrame } from '@/ui/teletext/frame';
import { findHit } from '@/ui/teletext/hit';
import { currentFrameInput } from '@/ui/teletext/screen';

/**
 * Invisible tap layer over the canvas screen in 3d-screen (design-spec 9.4).
 * Rows are padded to 44 px in hit-testing. aria-hidden: the dock and the
 * transcript carry the same actions for keyboard and screen-reader users.
 */
export function HitLayer() {
  const rect = useDisplayStore((s) => s.screenRect);
  const powered = useIntroStore((s) => isPoweredStatus(s.status));
  if (!rect || !powered) return null;

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const grid = useDisplayStore.getState().grid;
    const frame = buildFrame(currentFrameInput(), grid, { intro, facts });
    const action = findHit(frame, grid, x, y);
    if (action) performTap(action);
    else performEmptyTap(x / box.width);
  };
  return (
    <div
      className="hitlayer"
      aria-hidden="true"
      onClick={onClick}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  );
}
