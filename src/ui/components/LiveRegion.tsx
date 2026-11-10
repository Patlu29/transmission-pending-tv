import { useUiStore } from '@/state/uiStore';

/** The one polite live region: status changes only, never per-line text (US-10). */
export function LiveRegion() {
  const message = useUiStore((s) => s.liveMessage);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
