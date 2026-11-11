// 3d-screen quad. The CRT material comes from integration/useHoloMaterial.ts.
import { useEffect, useMemo } from 'react';
import { PlaneGeometry } from 'three';
import { useHoloMaterial } from '../integration/useHoloMaterial';

interface Props {
  width: number;
  height: number;
}

/** 3d-screen quad: flat, with the shader's own 2 px edge light. */
export function ScreenSurface({ width, height }: Props) {
  const material = useHoloMaterial(width / height, 1);
  const geometry = useMemo(() => new PlaneGeometry(width, height, 1, 1), [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="screen" geometry={geometry} material={material} />;
}
