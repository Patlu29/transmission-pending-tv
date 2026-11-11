import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useUiStore, type PanelId } from '@/state/uiStore';

interface SidePanelProps {
  id: PanelId;
  title: string;
  titleId: string;
  className?: string;
  /** Selector inside the panel to focus on open (default: the heading). */
  initialFocus?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
}

/**
 * A panel at the left edge (guide, room picker), at most 560 px wide, above the dock. It is not
 * modal. Opening moves focus into it; closing returns focus to the opener; Escape closes it. If it
 * would overlap the player, the player is paused and hidden while it is open (PlayerHost).
 */
export function SidePanel({
  id,
  title,
  titleId,
  className,
  initialFocus,
  onKeyDown,
  children,
}: SidePanelProps) {
  const open = useUiStore((s) => s.panel === id);
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = ref.current;
    const target = initialFocus ? el?.querySelector<HTMLElement>(initialFocus) : null;
    (target ?? el?.querySelector<HTMLElement>('[data-initial-focus]'))?.focus();
    return () => {
      const back = opener.current;
      opener.current = null;
      // Return focus to the opener, or to the Guide key if it has gone.
      if (back?.isConnected) back.focus();
      else document.querySelector<HTMLElement>('.dock [data-key="guide"]')?.focus();
    };
  }, [open, initialFocus]);

  if (!open) return null;
  return (
    <section
      ref={ref}
      className={`panel ${className ?? ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.preventDefault();
          useUiStore.getState().closePanel(id);
          return;
        }
        onKeyDown?.(e);
      }}
    >
      <header className="panel__head">
        <h2 id={titleId} tabIndex={-1} data-initial-focus>
          {title}
        </h2>
        <button type="button" className="key" onClick={() => useUiStore.getState().closePanel(id)}>
          Close
        </button>
      </header>
      {children}
    </section>
  );
}
