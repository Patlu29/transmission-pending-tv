// The TV set: the technical-artist's procedural TvBody with the CRT material on the glass.
// Units are cabinet widths; origin is the screen centre, glass edge at z = 0.
// Knob picking is in KnobLayer (it finds the nodes `knob-power`, `knob-channel`, `knob-volume`).
import { useCrtMaterial } from '../integration/useCrtMaterial';
import { TvBody } from '../materials';

export function TvSet() {
  const material = useCrtMaterial(4 / 3, 0.04); // domed glass: 0.04 (technical-artist)
  return (
    <TvBody>
      <primitive object={material} attach="material" />
    </TvBody>
  );
}
