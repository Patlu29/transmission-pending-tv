import {
  Color,
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

const WARM_WOOD = new Color('#ffb070');
const WHITE = new Color('#ffffff');

/** Colour-era tint for the cabinet (design-spec-v2 5.1): 0 = v1 greys, 1 = warm walnut. Only for live channels with Colour on. */
export function applyTvTint(materials: TvMaterials, tint: number): void {
  materials.wood.color.lerpColors(WHITE, WARM_WOOD, Math.min(1, Math.max(0, tint)));
}
