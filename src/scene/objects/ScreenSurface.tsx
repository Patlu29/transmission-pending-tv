/* eslint-disable react-hooks/immutability -- R3F materials are mutated imperatively by design */
// INTEGRATION SEAM 4 of 4: the CRT screen surface.
//
// Uses the technical-artist's CRT material (src/scene/shaders/crt/createCrtMaterial.ts)
// with the teletext CanvasTexture. Each frame the shared `screenState`
// (src/scene/integration/screenState.ts) is copied into its uniforms. Geometry,
// UVs and placement live here.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { PlaneGeometry } from 'three';
import { screenState } from '../integration/screenState';
import { useScreenTexture } from '../integration/useScreenTexture';
import { createCrtScreenMaterial } from '../shaders/crt/createCrtMaterial';

interface Props {
  width: number;
  height: number;
  /** Depth of the glass dome in world units. 0 = flat quad, where the shader curves the picture more. */
  bulge?: number;
}

export function ScreenSurface({ width, height, bulge = 0 }: Props) {
  const map = useScreenTexture();
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(
    () =>
      createCrtScreenMaterial(null, {
        uAspect: width / height,
        uCurvature: bulge > 0 ? 0.04 : 0.08,
      }),
    [width, height, bulge],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uMap.value = map;
    invalidate();
  }, [material, map, invalidate]);

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(width, height, bulge > 0 ? 32 : 1, bulge > 0 ? 24 : 1);
    if (bulge > 0) {
      const pos = g.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i) / (width / 2);
        const ny = pos.getY(i) / (height / 2);
        pos.setZ(i, bulge * (0.25 + 0.5 * (1 - nx * nx * 0.5) * (1 - ny * ny * 0.5)));
      }
      g.computeVertexNormals();
    }
    return g;
  }, [width, height, bulge]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = screenState.time;
    u.uWarmup.value = screenState.warmup;
    u.uCollapse.value = screenState.collapse;
    u.uCalm.value = screenState.reduced ? 1 : 0;
    u.uJitter.value = screenState.reduced ? 0 : 1;
    u.uBrightness.value = screenState.brightness;
    u.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return <mesh name="screen" geometry={geometry} material={material} />;
}
