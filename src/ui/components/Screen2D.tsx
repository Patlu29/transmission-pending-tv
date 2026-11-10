import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { facts, intro } from '@/facts';
import { useFrameInput } from '@/hooks/useFrameInput';
import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { COLLAPSE_MS } from '@/state/timing';
import { performEmptyTap, performTap } from '@/ui/actions';
import { buildFrame, type FrameInput, type Run } from '@/ui/teletext/frame';
import { computeGrid } from '@/ui/teletext/grid';
import { findHit } from '@/ui/teletext/hit';
import { drawTestCard } from '@/ui/teletext/testCard';
import { readPalette } from '@/ui/teletext/palette';

function TestCardCanvas({
  width,
  height,
  sub,
  dim,
}: {
  width: number;
  height: number;
  sub: string;
  dim: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const draw = () => drawTestCard(ctx, c.width, c.height, readPalette(), { sub, dim });
    draw();
    document.fonts?.addEventListener('loadingdone', draw);
    return () => document.fonts?.removeEventListener('loadingdone', draw);
  }, [width, height, sub, dim]);
  return (
    <canvas
      ref={ref}
      className="screen2d__card"
      width={Math.max(1, Math.round(width * dpr))}
      height={Math.max(1, Math.round(height * dpr))}
    />
  );
}

function RowText({ runs }: { runs: Run[] }) {
  const parts: React.ReactNode[] = [];
  let col = 0;
  runs.forEach((run, i) => {
    if (run.col > col) parts.push(' '.repeat(run.col - col));
    parts.push(
      <span key={i} className={`tt tt--${run.kind}`}>
        {run.text}
      </span>,
    );
    col = run.col + run.text.length;
  });
  return <>{parts}</>;
}

/**
 * The visible screen in 2D mode: the frame model as DOM, with CSS scanlines,
 * vignette and glow. aria-hidden: the visually hidden Transcript is the text
 * of record, so facts here are plain spans (no data-fact) to avoid duplicates.
 */
export function Screen2D() {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const input = useFrameInput();
  const grid = useDisplayStore((s) => s.grid);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const status = useIntroStore((s) => s.status);
  const [lastStatus, setLastStatus] = useState(status);
  const [collapsing, setCollapsing] = useState(false);
  const prevPowered = useRef(isPoweredStatus(status));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (dims.w > 0 && dims.h > 0) useDisplayStore.getState().setGrid(computeGrid(dims.w, dims.h));
  }, [dims.w, dims.h]);

  // Power-off: keep the last picture on screen while the CSS collapse plays.
  useEffect(() => {
    const powered = isPoweredStatus(status);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevPowered.current && !powered && !calm) {
      timer = setTimeout(() => setCollapsing(false), COLLAPSE_MS);
      setCollapsing(true);
    }
    prevPowered.current = powered;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Remember the last powered status so the collapse can keep showing that picture.
  if (isPoweredStatus(status) && lastStatus !== status) setLastStatus(status);
  const shown: FrameInput = collapsing ? { ...input, status: lastStatus, blank: false } : input;
  const frame = buildFrame(shown, grid, { intro, facts });

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPoweredStatus(status)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const action = findHit(frame, grid, x, y);
    if (action) performTap(action);
    else performEmptyTap(x / rect.width);
  };

  const animation = collapsing
    ? 'is-collapsing'
    : status === 'warming' && !calm
      ? 'is-warming'
      : '';
  return (
    <div className="screen2d-wrap">
      <div
        ref={ref}
        className={`screen2d ${animation}${status === 'ready' || status === 'off' ? ' is-off' : ''}`}
        aria-hidden="true"
        onClick={onClick}
        data-screen="2d"
      >
        {frame.mode === 'card' && frame.card && dims.w > 0 && (
          <TestCardCanvas
            width={dims.w}
            height={dims.h}
            sub={frame.card.sub}
            dim={frame.card.dim}
          />
        )}
        {frame.mode === 'page' && (
          <div
            className="screen2d__grid"
            style={{
              left: grid.originX,
              top: grid.originY,
              fontSize: grid.fontPx,
              lineHeight: `${grid.rowH}px`,
            }}
          >
            {frame.runs.map((runs, r) => (
              <div className="tt-row" key={r} style={{ height: grid.rowH }}>
                <RowText runs={runs} />
              </div>
            ))}
          </div>
        )}
        <div className="screen2d__noise" />
        <div className="screen2d__scan" />
      </div>
    </div>
  );
}
