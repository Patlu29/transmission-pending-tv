import { useDisplayStore } from '@/state/displayStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';

/** Site name (the page h1) and the Reset view key. */
export function Hud() {
  const mode = useDisplayStore((s) => s.renderMode);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const off = useDisplayStore((s) => s.cameraOffWatch);
  const status = useIntroStore((s) => s.status);
  const powered = isPoweredStatus(status);
  // 3d-set always shows the name; elsewhere it is visually hidden after power-on.
  const nameVisible = mode === '3d-set' || !powered;
  const showReset = mode === '3d-set' && !calm && powered && off;
  return (
    <div className="hud">
      <h1 className={`hud__name${nameVisible ? '' : ' sr-only'}`}>Transmission Pending</h1>
      {showReset && (
        <button
          type="button"
          className="key hud__reset"
          data-key="reset"
          onClick={() => useDisplayStore.getState().requestResetView()}
        >
          Reset view
        </button>
      )}
    </div>
  );
}
