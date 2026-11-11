import type { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { PlaneGeometry, type Mesh } from 'three';
import { buildHoloGeometries } from './holoGeometry.ts';
import { createHoloMaterials, setEdgeBoost } from './holoMaterials.ts';
import { HOLO_LAYOUT } from './layout.ts';

/** The named nodes the scene uses for picking and for the screen material (same names as the 1970s `TvNodes`). */
export interface HoloNodes {
  screen: Mesh;
  'knob-power': Mesh;
  'knob-channel': Mesh;
  'knob-volume': Mesh;
}
export type TvNodes = HoloNodes;

export interface KnobHandlers {
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}

export interface HoloDisplayProps extends Omit<ThreeElements['group'], 'children' | 'ref'> {
  /** The screen material (for example the holo material). Attached to the `screen` mesh. Default: dark smoked glass. */
  children?: ReactNode;
  /** Ring rotation about its own axis, radians. Positive turns anticlockwise seen from above. */
  powerAngle?: number;
  channelAngle?: number;
  volumeAngle?: number;
  /** Pointer handlers per control (picking). The ring mesh itself is the event target. */
  powerHandlers?: KnobHandlers;
  channelHandlers?: KnobHandlers;
  volumeHandlers?: KnobHandlers;
  /** Edge light strength, 1 steady, up to 1.4 for the 300 ms channel-change pulse. Set each frame if animating. */
  edgeBoost?: number;
  /** Filled after mount with the four named meshes. */
  nodesRef?: RefObject<HoloNodes | null>;
}

/**
 * The Lumen pane: a frameless 16:9 glass pane (pearl ceramic border, a 2 px edge light) hovering over a graphite puck
 * with two light rings and a power dimple. Built in code, no file to download. Origin is the centre of the player rect,
 * +z towards the viewer; sizes in metres (see HOLO_LAYOUT). `HOLO_LAYOUT.screen.width` is the anchor's `widthM`.
 *
 * Nodes (all direct children of the root group): `screen` (the player rect), `knob-power` (dimple), `knob-channel`
 * (outer ring), `knob-volume` (inner ring), `cabinet` (puck body), `bezel` (ceramic border), `trim` (satin edge),
 * `control-plate` (puck top face), plus `glass-body`, `edge-light` and `edge-halo`. Ring and dimple nodes have their
 * local z axis pointing up, so setting `rotation.z` turns them.
 */
export function HoloDisplay({
  children,
  powerAngle = 0,
  channelAngle = 0,
  volumeAngle = 0,
  powerHandlers,
  channelHandlers,
  volumeHandlers,
  edgeBoost = 1,
  nodesRef,
  ...groupProps
}: HoloDisplayProps) {
  const geometries = useMemo(() => buildHoloGeometries(), []);
  const materials = useMemo(() => createHoloMaterials(), []);
  const haloGeo = useMemo(() => {
    const g = new PlaneGeometry(HOLO_LAYOUT.screen.width + 0.03, HOLO_LAYOUT.screen.height + 0.03);
    g.translate(0, 0, 0.0002);
    return g;
  }, []);
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      haloGeo.dispose();
    },
    [geometries, materials, haloGeo],
  );
  useEffect(() => {
    setEdgeBoost(materials, edgeBoost);
  }, [materials, edgeBoost]);

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

  const P = HOLO_LAYOUT.puck;
  const ringPos: [number, number, number] = [0, P.topY + 0.0008, P.cz];
  return (
    <group name="holo-display" {...groupProps}>
      <mesh name="glass-body" geometry={geometries.glassBody} material={materials.smoked} />
      <mesh name="bezel" geometry={geometries.bezel} material={materials.ceramic} />
      <mesh name="trim" geometry={geometries.trim} material={materials.satin} />
      <mesh name="screen" ref={screen} geometry={geometries.screen}>
        {children ?? <meshBasicMaterial color="#05070d" />}
      </mesh>
      <mesh name="edge-light" geometry={geometries.edgeLight} material={materials.edge} />
      <mesh name="edge-halo" geometry={haloGeo} material={materials.halo} renderOrder={2} />
      <mesh name="cabinet" geometry={geometries.puck} material={materials.graphite} />
      <mesh name="control-plate" geometry={geometries.controlPlate} material={materials.plate} />
      <mesh
        name="knob-channel"
        ref={channel}
        geometry={geometries.ringChannel}
        material={materials.ring}
        position={ringPos}
        rotation={[-Math.PI / 2, 0, channelAngle]}
        {...channelHandlers}
      />
      <mesh
        name="knob-volume"
        ref={volume}
        geometry={geometries.ringVolume}
        material={materials.ring}
        position={ringPos}
        rotation={[-Math.PI / 2, 0, volumeAngle]}
        {...volumeHandlers}
      />
      <mesh
        name="knob-power"
        ref={power}
        geometry={geometries.dimple}
        material={materials.ring}
        position={ringPos}
        rotation={[-Math.PI / 2, 0, powerAngle]}
        {...powerHandlers}
      />
    </group>
  );
}
