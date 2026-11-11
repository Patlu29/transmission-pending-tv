import { ENVIRONMENTS } from '@/scene/environments/registry';
import { useChannelStore } from '@/state/channelStore';
import { useDisplayStore } from '@/state/displayStore';
import { useEnvironmentStore } from '@/state/environmentStore';
import { isPoweredStatus, useIntroStore } from '@/state/introStore';

/** Site name (the page h1), the room and channel readout, and the Reset view key. */
export function Hud() {
  const mode = useDisplayStore((s) => s.renderMode);
  const calm = useDisplayStore((s) => s.reducedMotion);
  const off = useDisplayStore((s) => s.cameraOffWatch);
  const status = useIntroStore((s) => s.status);
  const envId = useEnvironmentStore((s) => s.id);
  const loading = useEnvironmentStore((s) => s.loading);
  const live = useChannelStore((s) => s.current);
  const digits = useChannelStore((s) => s.digits);
  const powered = isPoweredStatus(status);
  // 3d-set always shows the name; elsewhere it is visually hidden after power-on.
  const nameVisible = mode === '3d-set' || (!powered && !live);
  const showReset = mode === '3d-set' && !calm && powered && off;
  const room = ENVIRONMENTS[envId].label;
  return (
    <div className="hud">
      <h1 className={`hud__name${nameVisible ? '' : ' sr-only'}`}>Transmission Pending</h1>
      {(live || digits) && (
        <p className="hud__plate" aria-hidden="true">
          {digits
            ? `CH ${digits.padEnd(2, '_')}`
            : live?.number === null
              ? 'YOUR LINK'
              : `CH ${live?.number}  ${live?.name.toUpperCase()}`}
        </p>
      )}
      {(envId !== 'tv-room' || live) && (
        <p className="hud__room" aria-hidden="true">
          {room}
        </p>
      )}
      {envId !== 'tv-room' && !live && <p className="hud__idle">No channel. Open the guide.</p>}
      {loading && (
        <p className="hud__plate hud__plate--loading" aria-hidden="true">
          Loading {ENVIRONMENTS[loading.id].label}... {Math.round(loading.progress * 100)}%
        </p>
      )}
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
