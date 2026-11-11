import { useEffect, useState } from 'react';
import { useDisplayStore } from '@/state/displayStore';

const DISMISS_AFTER_MS = 8000;

/** 2D notice (spec 3.4) and the asset-failure alert with Retry and Use plain version (spec 8). */
export function Notices() {
  const mode = useDisplayStore((s) => s.renderMode);
  const reason = useDisplayStore((s) => s.fallbackReason);
  const failed = useDisplayStore((s) => s.assetFailed);
  const message = useDisplayStore((s) => s.loadError);
  const [dismissed, setDismissed] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);

  const showNotice = mode === '2d' && reason !== null && reason !== 'user' && !dismissed;

  useEffect(() => {
    if (!showNotice) return;
    const t = setTimeout(() => setCanDismiss(true), DISMISS_AFTER_MS);
    return () => clearTimeout(t);
  }, [showNotice]);

  return (
    <>
      {failed && mode !== '2d' && (
        <div className="notice notice--error" role="alert">
          <p>{message ?? "The display's picture did not arrive."}</p>
          <div className="notice__keys">
            <button
              type="button"
              className="key"
              onClick={() => useDisplayStore.getState().retryScene()}
            >
              Retry
            </button>
            <button
              type="button"
              className="key"
              onClick={() => useDisplayStore.getState().choosePlainVersion()}
            >
              Use plain version
            </button>
          </div>
        </div>
      )}
      {showNotice && (
        <div className="notice" role="status">
          <p>
            3D is not available here, so you are getting the plain version. Everything else is the
            same.
          </p>
          {canDismiss && (
            <button type="button" className="key" onClick={() => setDismissed(true)}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </>
  );
}
