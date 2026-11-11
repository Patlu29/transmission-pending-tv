import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { facts, intro } from '@/facts';
import { drawTestCard } from '@/scene/materials/testcard/drawTestCard';
import { useFrameInput } from '@/hooks/useFrameInput';
import { useDisplayStore } from '@/state/displayStore';
import { useHauntStore } from '@/state/hauntStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';
import { COLLAPSE_2D_MS, HAUNT_TEXT_REDRAW_HZ, SCREEN_FADE_MS } from '@/state/timing';
import { performEmptyTap, performTap } from '@/ui/actions';
import { bleedLook, trembleOffset } from '@/ui/teletext/effects';
import { glyphMetrics, resetFontMetrics } from '@/ui/teletext/font';
import { buildFrame, type Frame, type FrameInput, type Run } from '@/ui/teletext/frame';
import { computeGrid, type GridSpec } from '@/ui/teletext/grid';
import { findHit } from '@/ui/teletext/hit';
import { readPalette } from '@/ui/teletext/palette';
import { Haunt2D } from './Ghost2D';

const CROSSFADE_MS = SCREEN_FADE_MS;

function TestCardCanvas({
  width,
  height,
  card,
}: {
  width: number;
  height: number;
  card: NonNullable<Frame['card']>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const draw = () => {
      drawTestCard(ctx, c.width, c.height, {
        loadingPercent: card.loadingPercent,
        subCaption: card.sub,
      });
      if (card.dim) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = readPalette().bg;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.restore();
      }
    };
    draw();
    document.fonts?.addEventListener('loadingdone', draw);
    return () => document.fonts?.removeEventListener('loadingdone', draw);
  }, [width, height, card.sub, card.loadingPercent, card.dim]);
  return (
    <canvas
      ref={ref}
      className="screen2d__card"
      width={Math.max(1, Math.round(width * dpr))}
      height={Math.max(1, Math.round(height * dpr))}
    />
  );
}

function RowText({
  runs,
  row,
  frame,
  grid,
}: {
  runs: Run[];
  row: number;
  frame: Frame;
  grid: GridSpec;
}) {
  const fx = frame.fx;
  const shake = fx && fx.kind === 'tremble' && fx.rows.includes(row) ? fx : null;
  const parts: ReactNode[] = [];
  let col = 0;
  runs.forEach((run, i) => {
    if (run.col > col) parts.push(' '.repeat(run.col - col));
    parts.push(
      <span key={i} className={`tt tt--${run.kind}`}>
        {shake
          ? [...run.text].map((ch, k) => {
              const [dx, dy] = trembleOffset(
                shake.seed,
                row,
                run.col + k,
                shake.elapsedMs,
                shake.durMs,
                shake.amp,
              );
              return (
                <span
                  key={k}
                  className="tt__glyph"
                  style={{ transform: `translate(${dx * grid.fontPx}px, ${dy * grid.fontPx}px)` }}
                >
                  {ch}
                </span>
              );
            })
          : run.text}
      </span>,
    );
    col = run.col + run.text.length;
  });
  return <>{parts}</>;
}

/**
 * The visible screen in 2D mode: the frame model as DOM, with the technical-artist's
 * crt2d overlay (scanlines, vignette, noise), the haunted-text effects, the ghost layer,
 * the picture roll and the edge dim. aria-hidden: the visually hidden Transcript is the text
 * of record, so facts here are plain spans (no data-fact) to avoid duplicates.
 */
export function Screen2D() {
  const ref = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [fontTick, setFontTick] = useState(0);
  const input = useFrameInput();
  const grid = useDisplayStore((s) => s.grid);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const status = useIntroStore((s) => s.status);
  const rolling = useHauntStore((s) => s.roll.active);
  const [lastStatus, setLastStatus] = useState(status);
  const [collapsing, setCollapsing] = useState(false);
  const [leaving, setLeaving] = useState<Array<{ key: number; frame: Frame }>>([]);
  const leaveKey = useRef(0);
  const lastFrame = useRef<Frame | null>(null);
  const prevPowered = useRef(isPoweredStatus(status));
  const blocks = useRef<Array<HTMLDivElement | null>>([]);
  const bar = useRef<HTMLDivElement>(null);

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

  // Re-measure the glyph advance once the faces have loaded.
  useEffect(() => {
    const onFonts = () => {
      resetFontMetrics();
      setFontTick((n) => n + 1);
    };
    document.fonts?.addEventListener('loadingdone', onFonts);
    return () => document.fonts?.removeEventListener('loadingdone', onFonts);
  }, []);

  // Power-off: keep the last picture on screen while the CSS collapse plays.
  useEffect(() => {
    const powered = isPoweredStatus(status);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevPowered.current && !powered && !calm) {
      timer = setTimeout(() => setCollapsing(false), COLLAPSE_2D_MS);
      setCollapsing(true);
    }
    prevPowered.current = powered;
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Picture roll: translate the screen contents by one wrap, sine in-out (design-spec 16.6.1).
  useEffect(() => {
    if (!rolling || calm) return;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      if (t - last < 1000 / HAUNT_TEXT_REDRAW_HZ) return;
      last = t;
      const { roll } = useHauntStore.getState();
      const h = ref.current?.clientHeight ?? 0;
      const x = Math.min(1, (performance.now() - roll.startedAt) / (roll.dur * 1000));
      const settle = 0.4 / roll.dur;
      const p = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, x / (1 - settle)));
      const offset = (p >= 0.999 ? 0 : p) * h;
      blocks.current[0]?.style.setProperty('transform', `translateY(${offset}px)`);
      blocks.current[1]?.style.setProperty('transform', `translateY(${offset - h}px)`);
      bar.current?.style.setProperty('top', `${offset}px`);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rolling, calm]);

  // Remember the last powered status so the collapse can keep showing that picture.
  if (isPoweredStatus(status) && lastStatus !== status) setLastStatus(status);
  const shown: FrameInput = collapsing ? { ...input, status: lastStatus, blank: false } : input;
  const frame = buildFrame(shown, grid, { intro, facts });
  const metrics = glyphMetrics(grid, readPalette().fontTeletext);
  void fontTick;

  // A cut between screens cross-fades: the previous screen stays on top and fades out (design-spec 7.1).
  useEffect(() => {
    const prev = lastFrame.current;
    if (!prev || prev.id === frame.id) return;
    // Several fades can overlap (Replay: diary, black, first page); each layer fades on its own.
    const key = ++leaveKey.current;
    setLeaving((l) => [...l, { key, frame: prev }]);
    setTimeout(() => setLeaving((l) => l.filter((x) => x.key !== key)), CROSSFADE_MS + 30);
  }, [frame.id]);
  useEffect(() => {
    lastFrame.current = frame;
  });

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPoweredStatus(status)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const action = findHit(frame, grid, x, y);
    if (action) performTap(action);
    else performEmptyTap(x / rect.width);
  };

  const content = (f: Frame, index: number | null, leaving = false) => {
    const bleed = f.fx && f.fx.kind === 'bleed' ? f.fx : null;
    const look = bleed ? bleedLook(bleed.elapsedMs, bleed.durMs) : null;
    return (
      <div
        className={`screen2d__content${leaving ? ' screen2d__content--leaving' : ''}`}
        ref={index === null ? undefined : (el) => void (blocks.current[index] = el)}
      >
        {f.mode === 'card' && f.card && dims.w > 0 && (
          <TestCardCanvas width={dims.w} height={dims.h} card={f.card} />
        )}
        {f.mode === 'page' && (
          <div
            className="screen2d__grid crt2d__glow"
            style={{
              left: grid.originX,
              top: grid.originY,
              fontSize: metrics.drawPx,
              letterSpacing: metrics.letterSpacingPx,
              lineHeight: `${grid.rowH}px`,
            }}
          >
            {f.runs.map((runs, r) => (
              <div className="tt-row" key={r} style={{ height: grid.rowH }}>
                <RowText runs={runs} row={r} frame={f} grid={grid} />
              </div>
            ))}
            {bleed &&
              look &&
              bleed.streaks.map((s) => (
                <div
                  key={`${s.row}:${s.col}`}
                  className="screen2d__streak"
                  style={{
                    left: (s.col + 0.5) * grid.cellW - grid.cellW * 0.125,
                    top: s.row * grid.rowH,
                    width: grid.cellW * 0.25,
                    height: grid.rowH * look.length,
                    opacity: look.alpha,
                  }}
                />
              ))}
          </div>
        )}
      </div>
    );
  };

  const animation = collapsing
    ? 'is-collapsing'
    : status === 'warming' && !calm
      ? 'is-warming'
      : '';
  const off = status === 'ready' || status === 'off';
  return (
    <div className="screen2d-wrap">
      <div
        ref={ref}
        className={`screen2d crt2d ${frame.mode === 'card' ? 'crt2d--idle' : 'crt2d--text'} ${animation}${off ? ' is-off' : ''}`}
        data-calm={calm}
        aria-hidden="true"
        onClick={onClick}
        data-screen="2d"
      >
        {content(frame, 0)}
        {rolling && !calm && content(frame, 1)}
        {leaving.map((l) => (
          <Fragment key={l.key}>{content(l.frame, null, true)}</Fragment>
        ))}
        {rolling && !calm && <div className="screen2d__rollbar" ref={bar} />}
        {dims.w > 0 && <Haunt2D width={dims.w} height={dims.h} grid={grid} frame={frame} />}
      </div>
    </div>
  );
}
