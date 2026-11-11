import type { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import type { Mesh } from 'three';
import { TV_LAYOUT } from './layout.ts';
import { buildTvGeometries } from './tvGeometry.ts';
import { applyTvTint, createTvMaterials } from './tvMaterials.ts';
import { createPlateTexture, createWoodTexture } from './tvTextures.ts';

/** The four named nodes the scene uses for picking and for the screen material. */
export interface TvNodes {
  screen: Mesh;
  'knob-power': Mesh;
  'knob-channel': Mesh;
  'knob-volume': Mesh;
}

export interface KnobHandlers {
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}

export interface TvBodyProps extends Omit<ThreeElements['group'], 'children' | 'ref'> {
  /** Put the screen material here, for example `<CrtScreenMaterial .../>`. It is attached to the `screen` mesh. */
  children?: ReactNode;
  /** Knob rotation about its axis in radians (positive turns anticlockwise seen from the front). */
  powerAngle?: number;
  channelAngle?: number;
  volumeAngle?: number;
  /** Pointer handlers per knob (picking). The node itself is the picked object. */
  powerHandlers?: KnobHandlers;
  channelHandlers?: KnobHandlers;
  volumeHandlers?: KnobHandlers;
  /** Colour-era tint, 0 (v1 greys, default) to 1 (warm walnut). Pass 1 only with Colour on and a live channel, never on channel 0. */
  tint?: number;
  /** Filled after mount with the four named meshes. */
  nodesRef?: RefObject<TvNodes | null>;
}

/**
 * Mid-1970s wood-cabinet portable, greyscale, built entirely in code (no model file to download).
 * Origin is the centre of the screen glass, +z faces the viewer; see TV_LAYOUT for sizes (cabinet width = 1).
 *
 * Nodes (all direct children of the root group, named for picking): `screen`, `knob-power`,
 * `knob-channel`, `knob-volume`; plus `cabinet`, `bezel`, `trim`, `control-plate`.
 */
export function TvBody({
  children,
  powerAngle = 0,
  channelAngle = 0,
  volumeAngle = 0,
  powerHandlers,
  channelHandlers,
  volumeHandlers,
  nodesRef,
  tint = 0,
  ...groupProps
}: TvBodyProps) {
  const geometries = useMemo(() => buildTvGeometries(), []);
  const textures = useMemo(() => {
    const plate = createPlateTexture();
    return { wood: createWoodTexture(), plate: plate.texture };
  }, []);
  const materials = useMemo(() => createTvMaterials(textures.wood, textures.plate), [textures]);

  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      textures.wood.dispose();
      textures.plate.dispose();
    },
    [geometries, materials, textures],
  );

  useEffect(() => {
    applyTvTint(materials, tint);
  }, [materials, tint]);

  const screen = useRef<Mesh>(null);
  const power = useRef<Mesh>(null);
  const channel = useRef<Mesh>(null);
  const volume = useRef<Mesh>(null);
  useEffect(() => {
    if (!nodesRef || !screen.current || !power.current || !channel.current || !volume.current)
      return;
    nodesRef.current = {
      screen: screen.current,
      'knob-power': power.current,
      'knob-channel': channel.current,
      'knob-volume': volume.current,
    };
  }, [nodesRef]);

  const K = TV_LAYOUT.knobs;
  const ox = -TV_LAYOUT.screenCx;
  const kz = TV_LAYOUT.knobZ;
  return (
    <group name="tv-body" {...groupProps}>
      <mesh name="cabinet" geometry={geometries.cabinet} material={materials.wood} />
      <mesh name="bezel" geometry={geometries.bezel} material={materials.bezel} />
      <mesh name="trim" geometry={geometries.trim} material={materials.trim} />
      <mesh name="control-plate" geometry={geometries.plate} material={materials.plate} />
      <mesh name="screen" ref={screen} geometry={geometries.screen}>
        {children ?? <meshBasicMaterial color="#000000" />}
      </mesh>
      <mesh
        name="knob-channel"
        ref={channel}
        geometry={geometries.knobChannel}
        material={materials.knob}
        position={[K.channel.x + ox, K.channel.y, kz]}
        rotation={[0, 0, channelAngle]}
        {...channelHandlers}
      />
      <mesh
        name="knob-volume"
        ref={volume}
        geometry={geometries.knobVolume}
        material={materials.knob}
        position={[K.volume.x + ox, K.volume.y, kz]}
        rotation={[0, 0, volumeAngle]}
        {...volumeHandlers}
      />
      <mesh
        name="knob-power"
        ref={power}
        geometry={geometries.knobPower}
        material={materials.knob}
        position={[K.power.x + ox, K.power.y, kz]}
        rotation={[0, 0, powerAngle]}
        {...powerHandlers}
      />
    </group>
  );
}
