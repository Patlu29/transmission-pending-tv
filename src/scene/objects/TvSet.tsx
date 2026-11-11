// The TV set: the technical-artist's procedural TvBody with the CRT material on the glass.
// Units are cabinet widths; origin is the screen centre, glass edge at z = 0.
// Knob picking is in KnobLayer (it finds the nodes `knob-power`, `knob-channel`, `knob-volume`).
import { useEffect, useRef } from 'react';
import { useCrtMaterial } from '../integration/useCrtMaterial';
import { TvBody, type TvNodes } from '../materials';

/** Channel 0: v1's set with the CRT material (teletext, haunt) on the dome glass. */
export function TvSet() {
  const material = useCrtMaterial(4 / 3, 0.04); // domed glass: 0.04 (technical-artist)
  return (
    <TvBody>
      <primitive object={material} attach="material" />
    </TvBody>
  );
}

/**
 * YouTube channels (design-spec-v2 5.1): the CRT glass is off. The dome mesh is hidden and the screen
 * anchor's flat black 4:3 face sits in the bezel opening at the glass plane, so no CRT effect
 * (scanlines, curvature, glow, haunt) ever touches the player rect.
 */
export function TvSetLive({ tint = 0 }: { tint?: number }) {
  const nodes = useRef<TvNodes | null>(null);
  useEffect(() => {
    const dome = nodes.current?.screen;
    if (dome) dome.visible = false;
    return () => {
      if (dome) dome.visible = true;
    };
  }, []);
  return (
    <TvBody nodesRef={nodes} tint={tint}>
      <meshBasicMaterial color="#000000" />
    </TvBody>
  );
}
