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

export interface GreyEnvironmentProps {
  /** Overall environment intensity. Design-spec 10.3 asks for low: default 0.35. */
  intensity?: number;
  /** Source size hint in pixels. three rounds the PMREM source up to 256. Default 64. */
  resolution?: number;
}

type Former = {
  form: 'rect' | 'ring';
  intensity: number;
  position: [number, number, number];
  scale: [number, number, number];
};

// Same four shapes as before (they were drei Lightformers aimed at the origin).
const FORMERS: readonly Former[] = [
  { form: 'rect', intensity: 3, position: [-4, 3, 3], scale: [3, 2, 1] },
  { form: 'rect', intensity: 0.6, position: [0, 4, -2], scale: [8, 1, 1] },
  { form: 'rect', intensity: 0.4, position: [5, 0, 2], scale: [1, 4, 1] },
  { form: 'ring', intensity: 0.15, position: [0, -3, 3], scale: [4, 4, 4] },
];

/**
 * Tiny greyscale studio built from white light panels (no HDR file to download), so the brushed metal,
 * knob caps and wood clear coat have something to reflect. One soft window shape high on the left, a low
 * grey fill, and a dim strip on the right. Does not draw a background.
 *
 * Built with three's PMREMGenerator directly. drei's `Environment` leaked its PMREM target (36 framebuffers and a
 * texture every time the TV room was re-entered, because three never frees the PMREM of a render-target cube),
 * and importing it pulled loaders into the scene chunk. This disposes everything on unmount.
 */
export function GreyEnvironment({ intensity = 0.35, resolution = 64 }: GreyEnvironmentProps) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const virtual = new Scene();
    virtual.background = new Color('#000000');
    const disposables: Array<{ dispose(): void }> = [];
    for (const f of FORMERS) {
      const geometry =
        f.form === 'ring' ? new RingGeometry(0.25, 0.5, 64) : new PlaneGeometry(1, 1);
      const material = new MeshBasicMaterial({
        color: '#ffffff',
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
