// 3d-screen quad. The CRT material comes from integration/useCrtMaterial.ts.
import { useEffect, useMemo } from 'react';
import { PlaneGeometry } from 'three';
import { useCrtMaterial } from '../integration/useCrtMaterial';

interface Props {
  width: number;
  height: number;
}

/** 3d-screen quad: flat, so the shader curves the picture harder (0.08). */
export function ScreenSurface({ width, height }: Props) {
  const material = useCrtMaterial(width / height, 0.08);
  const geometry = useMemo(() => new PlaneGeometry(width, height, 1, 1), [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="screen" geometry={geometry} material={material} />;
}
