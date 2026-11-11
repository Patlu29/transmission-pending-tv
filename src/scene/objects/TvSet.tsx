// The Holo room's device (the `tv-room` id stays internal): channel 0 shows the holo material on the pane's glass;
// live channels show a dark pane behind the player. Picking and the ring animation are in ControlRings.
import { useHoloMaterial } from '../integration/useHoloMaterial';
import { HoloDisplay } from './HoloDisplay';

/** Channel 0: the picture (teletext card, calibration field, haunt) on a flat 16:9 pane (no curvature). */
export function TvSet() {
  const material = useHoloMaterial(16 / 9, 0);
  return (
    <HoloDisplay>
      <primitive object={material} attach="material" />
    </HoloDisplay>
  );
}

/**
 * Live channels (design-spec-2050 3.2): the glass is dark behind the player, there is no haunt or holo
 * material on the player area, and the edge light pulses once for 300 ms on a channel change (`burst`).
 */
export function TvSetLive({ burst = 0 }: { burst?: number }) {
  return (
    <HoloDisplay burst={burst}>
      <meshBasicMaterial color="#000000" />
    </HoloDisplay>
  );
}
