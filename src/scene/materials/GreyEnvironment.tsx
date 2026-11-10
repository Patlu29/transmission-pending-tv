import { Environment, Lightformer } from '@react-three/drei';

export interface GreyEnvironmentProps {
  /** Overall environment intensity. Design-spec 10.3 asks for low: default 0.35. */
  intensity?: number;
  /** Cube resolution in pixels. Default 64 (tiny, the picture is mostly shadow). */
  resolution?: number;
}

/**
 * Tiny greyscale studio built from white Lightformers (no HDR file to download), so the brushed metal,
 * knob caps and wood clear coat have something to reflect. One soft window shape high on the left, a low
 * grey fill, and a dim strip on the right. Does not draw a background.
 */
export function GreyEnvironment({ intensity = 0.35, resolution = 64 }: GreyEnvironmentProps) {
  return (
    <Environment resolution={resolution} background={false} environmentIntensity={intensity}>
      <color attach="background" args={['#000000']} />
      <Lightformer
        form="rect"
        intensity={3}
        color="#ffffff"
        position={[-4, 3, 3]}
        scale={[3, 2, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={0.6}
        color="#ffffff"
        position={[0, 4, -2]}
        scale={[8, 1, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={0.4}
        color="#ffffff"
        position={[5, 0, 2]}
        scale={[1, 4, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="ring"
        intensity={0.15}
        color="#ffffff"
        position={[0, -3, 3]}
        scale={4}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}
