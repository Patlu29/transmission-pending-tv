/**
 * The Holo room (design-spec-2050 3.1, "Room"): a frosted back-lit wall panel, a faint floor with a soft reflection of
 * the pane's light, a light cushion under the puck, an overhead ring light with an additive cone, dust in the cone, and
 * the Occupant's shadow behind the frosted wall. Additive cone and glow meshes only; no post-processing, no ray-marching.
 * Replaces the 1970s `RoomPieces`. Units and origin as `HoloDisplay` (metres, origin at the player rect centre).
 *
 * Room light: the wall back-light and the overhead ring follow `uniforms.uRoomLight.value`, which the scene sets each
 * frame to `1 - dim x 0.65` (the haunt `dim` cue). The pane's own light is untouched. Cones, glow and dust fade by
 * `uKeepOut`, so nothing is drawn inside the player rect plus its 24 px halo.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import {
  Color,
  DoubleSide,
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  MeshBasicMaterial,
} from 'three';
import { HOLO_COLOURS, HOLO_LAYOUT } from './layout.ts';
import { drawOccupant } from './occupant2050.ts';
import { createHoloRoomUniforms, type HoloRoomUniforms } from './holoRoomUniforms.ts';
import {
  roomMaterial,
  rng,
  useRoomClock,
  useRoomUniforms,
  type RoomProps,
} from '../rooms/roomKit.ts';
import { Glow, PointSprites } from '../rooms/roomParts.tsx';
import { decalOpacity } from '../room/roomTextures.ts';

const QUAD_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vPos;
void main() { vUv = uv; vPos = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`;
// Frosted back-lit wall: dark ink with a soft panel lit from behind, static frosted grain, and a bright rim.
const WALL_FRAG = /* glsl */ `
varying vec2 vUv; varying vec3 vPos;
uniform float uRoomLight; uniform vec3 uBase; uniform vec3 uBack; uniform vec2 uPanel;
void main() {
  vec2 p = vPos.xy;
  vec2 q = abs(p) - uPanel;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float panel = 1.0 - smoothstep(-0.05, 0.02, d);
  float rim = exp(-pow((d + 0.01) / 0.012, 2.0));
  float centre = exp(-dot(p / vec2(1.3, 0.8), p / vec2(1.3, 0.8)));
  float frost = 0.5 + 0.5 * (fbm(p * 26.0) - 0.5) * 2.0;
  vec3 col = uBase * (0.6 + 0.4 * (1.0 - panel));
  col += uBack * panel * (0.6 + 1.1 * centre) * (0.85 + 0.15 * frost) * uRoomLight * mix(1.0, uSpill, 0.35);
  col += uBack * 0.9 * rim * uRoomLight * 0.6;
  gl_FragColor = vec4(col, 1.0);
}
`;
const FLOOR_FRAG = /* glsl */ `
varying vec2 vUv; varying vec3 vPos;
uniform float uRoomLight; uniform vec3 uBase;
void main() {
  float fade = smoothstep(1.2, -0.6, vPos.y);
  float edge = smoothstep(0.0, 1.0, vUv.y);
  vec3 col = uBase * (0.5 + 0.8 * edge) + vec3(0.02, 0.05, 0.08) * uRoomLight * fade;
  gl_FragColor = vec4(col, 1.0);
}
`;
const CONE_FRAG = /* glsl */ `
varying vec2 vUv; varying vec3 vPos;
uniform float uRoomLight; uniform vec3 uColour; uniform float uBase;
void main() {
  float along = vUv.y;                                  // 0 at the floor, 1 at the ring
  float soft = pow(along, 1.4) * (1.0 - 0.0);
  float a = soft * uBase * uRoomLight * mix(1.0, uSpill, 0.3) * keepFade();
  gl_FragColor = vec4(uColour, a);
}
`;

/** Soft silhouette texture for the shadow behind the frosted wall (white on opaque black, read as an alpha map). */
function createDecalTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const ctx = c.getContext('2d');
  if (ctx) {
    drawOccupant(ctx, 128, 192, { mode: 'silhouette' });
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 192);
  }
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

export function HoloRoom(
  props: Omit<RoomProps, 'uniforms'> & {
    uniforms?: HoloRoomUniforms;
    /** Opacity driver for the Occupant's shadow: `decalRef.current.opacity = decalOpacity(shadow)` each frame. */
    decalRef?: RefObject<MeshBasicMaterial | null>;
    /** Initial shadow 0..1 (use the ref for animation). */
    shadow?: number;
  },
) {
  const { calm, decalRef, shadow = 0, quality = 'high' } = props;
  const given = props.uniforms;
  const fallback = useMemo(() => (given ? null : createHoloRoomUniforms()), [given]);
  const u = (given ?? fallback) as HoloRoomUniforms;
  useRoomUniforms(u);
  useRoomClock(u, calm, 16);
  const floorY = HOLO_LAYOUT.shelfY;
  const wallZ = -0.9;

  const mats = useMemo(() => {
    const light = { uRoomLight: u.uRoomLight };
    const wall = roomMaterial(u, {
      vertex: QUAD_VERT,
      fragment: WALL_FRAG,
      transparent: false,
      depthWrite: true,
      uniforms: {
        ...light,
        uBase: { value: new Color(HOLO_COLOURS.wall) },
        uBack: { value: new Color(HOLO_COLOURS.wallBacklight) },
        uPanel: { value: [1.5, 0.85] },
      },
    });
    const floor = roomMaterial(u, {
      vertex: QUAD_VERT,
      fragment: FLOOR_FRAG,
      transparent: false,
      depthWrite: true,
      uniforms: { ...light, uBase: { value: new Color(HOLO_COLOURS.floor) } },
    });
    const cone = roomMaterial(u, {
      vertex: QUAD_VERT,
      fragment: CONE_FRAG,
      additive: true,
      side: DoubleSide as unknown as typeof DoubleSide,
      uniforms: { ...light, uColour: { value: new Color('#cfe8ff') }, uBase: { value: 0.07 } },
    });
    const ring = new MeshBasicMaterial({ color: '#e6f3ff', toneMapped: false });
    return { wall, floor, cone, ring };
  }, [u]);
  const decalMap = useMemo(() => createDecalTexture(), []);
  useEffect(
    () => () => {
      (Object.values(mats) as Array<{ dispose(): void }>).forEach((m) => m.dispose());
      decalMap.dispose();
    },
    [mats, decalMap],
  );
  // The ring light follows the room light (the dim cue); mutate through a helper so the lint rule stays quiet.
  useFrame(() => tintRing(mats.ring, u.uRoomLight.value));

  const dust = useMemo(() => {
    const r = rng(16);
    const n = quality === 'low' ? 14 : 30;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const ang = r() * Math.PI * 2;
      const rad = 0.55 + r() * 0.35;
      a.set(
        [Math.cos(ang) * rad, floorY + 0.2 + r() * 1.3, -0.2 + Math.sin(ang) * rad * 0.8],
        i * 3,
      );
    }
    return a;
  }, [floorY, quality]);

  return (
    <group name="holo-room">
      <ambientLight intensity={0.25} color="#8fa2c0" />
      <mesh position={[0, 0.35, wallZ]} material={mats.wall} renderOrder={-10}>
        <planeGeometry args={[7, 3.8]} />
      </mesh>
      <mesh
        position={[0, floorY, -0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={mats.floor}
        renderOrder={-9}
      >
        <planeGeometry args={[7, 3.4]} />
      </mesh>
      {/* light cushion under the puck, and a soft reflection of the pane's light on the floor */}
      <Glow
        u={u}
        position={[0, floorY + 0.002, HOLO_LAYOUT.puck.cz]}
        size={[0.9, 0.62]}
        colour="#8fe3ff"
        base={0.32}
        fade={false}
        renderOrder={-5}
      />
      <mesh position={[0, floorY + 0.003, 0.35]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-4}>
        <planeGeometry args={[1.1, 0.7]} />
        <meshBasicMaterial
          color="#8fe3ff"
          transparent
          opacity={0.04}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* overhead ring light and its cone (additive, keep-out faded) */}
      <mesh position={[0, 1.55, -0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.ring}>
        <torusGeometry args={[0.5, 0.012, 8, 72]} />
      </mesh>
      <mesh position={[0, (1.55 + floorY) / 2, -0.2]} material={mats.cone} renderOrder={4}>
        <cylinderGeometry args={[0.5, 0.95, 1.55 - floorY, 48, 1, true]} />
      </mesh>
      <PointSprites
        uniforms={u}
        positions={dust}
        colour="#cfe8ff"
        size={[1.5, 3]}
        alpha={0.55}
        velocity={[0.0, -0.004, 0]}
        wrap={[0.04, 0.12, 0.04]}
        hideInCalm
        additive
        renderOrder={9}
      />
      {/* the Occupant's shadow behind the frosted wall: alpha at most 0.10, static, never over the pane */}
      <mesh position={[-1.6, 0.35, wallZ + 0.004]} renderOrder={-6}>
        <planeGeometry args={[1.1, 1.65]} />
        <meshBasicMaterial
          ref={decalRef}
          color="#000000"
          alphaMap={decalMap}
          transparent
          opacity={decalOpacity(shadow)}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function tintRing(m: MeshBasicMaterial, light: number): void {
  m.color.set('#e6f3ff').multiplyScalar(0.35 + 0.65 * light);
}
