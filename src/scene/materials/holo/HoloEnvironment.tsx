import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  Scene,
} from 'three';

export interface HoloEnvironmentProps {
  /** Overall environment intensity. Default 0.5. */
  intensity?: number;
  /** Source size hint in pixels. three rounds the PMREM source up to 256. Default 64. */
  resolution?: number;
}

type Former = {
  form: 'rect' | 'ring';
  colour: string;
  intensity: number;
  position: [number, number, number];
  scale: [number, number, number];
};

// A cool studio: a lumen key panel high on the left, a violet haze strip on the right, a soft overhead ring, a faint
// ember fill from below. All coloured lights are pastel and low, there is no saturated red.
const FORMERS: readonly Former[] = [
  { form: 'rect', colour: '#bfefff', intensity: 3, position: [-4, 3, 3], scale: [3, 2, 1] },
  { form: 'rect', colour: '#b9a4ff', intensity: 0.7, position: [5, 1, 1], scale: [1, 4, 1] },
  { form: 'ring', colour: '#e6f3ff', intensity: 1.2, position: [0, 5, 0], scale: [5, 5, 5] },
  { form: 'rect', colour: '#ffc58a', intensity: 0.25, position: [0, -3, 3], scale: [6, 1, 1] },
];

/**
 * Coloured studio reflections for the ceramic, satin bevel and puck (no HDR file). Replaces `GreyEnvironment` with the same
 * dispose-safe approach: three's PMREMGenerator directly, everything disposed on unmount (drei's `Environment` leaked
 * its PMREM target every time the room was re-entered). Does not draw a background.
 */
export function HoloEnvironment({ intensity = 0.5, resolution = 64 }: HoloEnvironmentProps) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const virtual = new Scene();
    virtual.background = new Color('#02040a');
    const disposables: Array<{ dispose(): void }> = [];
    for (const f of FORMERS) {
      const geometry =
        f.form === 'ring' ? new RingGeometry(0.25, 0.5, 64) : new PlaneGeometry(1, 1);
      const material = new MeshBasicMaterial({
        color: f.colour,
        side: DoubleSide,
        toneMapped: false,
      });
      material.color.multiplyScalar(f.intensity);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(...f.position);
      mesh.scale.set(...f.scale);
      mesh.lookAt(0, 0, 0);
      virtual.add(mesh);
      disposables.push(geometry, material);
    }
    const generator = new PMREMGenerator(gl);
    const target = generator.fromScene(virtual, 0, 0.1, 1000, { size: resolution });
    generator.dispose();
    const { scene } = get();
    const oldEnvironment = scene.environment;
    const oldIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => {
      scene.environment = oldEnvironment;
      scene.environmentIntensity = oldIntensity;
      target.dispose();
      disposables.forEach((d) => d.dispose());
    };
  }, [gl, get, invalidate, intensity, resolution]);

  return null;
}
