import {
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type CanvasTexture,
  type Texture,
} from 'three';
import { TV_GREYS } from './layout.ts';

export interface TvMaterials {
  wood: MeshPhysicalMaterial;
  bezel: MeshStandardMaterial;
  trim: MeshStandardMaterial;
  knob: MeshStandardMaterial;
  plate: MeshStandardMaterial;
}

/**
 * Five greyscale materials (design-spec 10.2). All colours have R = G = B. The wood is the only physical
 * material (a slight clear coat). Metals need an environment map to read; use `GreyEnvironment`.
 */
export function createTvMaterials(woodMap: Texture, plateMap: CanvasTexture): TvMaterials {
  return {
    wood: new MeshPhysicalMaterial({
      name: 'WalnutGrey',
      map: woodMap,
      bumpMap: woodMap,
      bumpScale: 0.4,
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    }),
    bezel: new MeshStandardMaterial({
      name: 'BezelPlastic',
      color: TV_GREYS.bezel,
      roughness: 0.4,
      metalness: 0,
    }),
    trim: new MeshStandardMaterial({
      name: 'BrushedTrim',
      color: TV_GREYS.trim,
      roughness: 0.35,
      metalness: 1,
    }),
    knob: new MeshStandardMaterial({
      name: 'KnobCap',
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.3,
      metalness: 0,
    }),
    plate: new MeshStandardMaterial({
      name: 'ControlPlate',
      map: plateMap,
      roughness: 0.5,
      metalness: 0,
    }),
  };
}
