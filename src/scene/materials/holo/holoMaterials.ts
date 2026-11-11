import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
} from 'three';
import { HOLO_COLOURS, HOLO_LAYOUT } from './layout.ts';

export interface HoloMaterials {
  ceramic: MeshStandardMaterial;
  satin: MeshStandardMaterial;
  graphite: MeshStandardMaterial;
  plate: MeshStandardMaterial;
  smoked: MeshStandardMaterial;
  ring: MeshBasicMaterial;
  edge: MeshBasicMaterial;
  halo: ShaderMaterial;
}

const HALO_VERT = /* glsl */ `
varying vec2 vXY;
void main() { vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Outward glow of at most 8 px (about 0.008 m on the 1.15 m rect), alpha under the 0.35 ceiling, steady.
const HALO_FRAG = /* glsl */ `
varying vec2 vXY;
uniform vec2 uHalf; uniform float uFall; uniform float uAlpha; uniform vec3 uColour;
void main() {
  vec2 q = abs(vXY) - uHalf;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float a = (1.0 - smoothstep(0.0, uFall, d)); a = a * a * step(0.0, d) * uAlpha;
  gl_FragColor = vec4(uColour, a);
}
`;

/** Pearl ceramic, satin bevel, graphite puck, smoked glass, lit ring and edge. Materials are shared across meshes. */
export function createHoloMaterials(): HoloMaterials {
  const s = HOLO_LAYOUT.screen;
  return {
    ceramic: new MeshStandardMaterial({
      name: 'PearlCeramic',
      color: HOLO_COLOURS.ceramic,
      roughness: 0.35,
      metalness: 0,
    }),
    satin: new MeshStandardMaterial({
      name: 'SatinBevel',
      color: HOLO_COLOURS.satin,
      roughness: 0.28,
      metalness: 0.7,
    }),
    graphite: new MeshStandardMaterial({
      name: 'GraphitePuck',
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.5,
      metalness: 0,
    }),
    plate: new MeshStandardMaterial({
      name: 'PuckTop',
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.1,
    }),
    smoked: new MeshStandardMaterial({
      name: 'SmokedGlass',
      color: HOLO_COLOURS.smoked,
      roughness: 0.08,
      metalness: 0,
    }),
    ring: new MeshBasicMaterial({ name: 'RingLight', vertexColors: true, toneMapped: false }),
    edge: new MeshBasicMaterial({
      name: 'EdgeLight',
      color: new Color(HOLO_COLOURS.lumen),
      toneMapped: false,
    }),
    halo: new ShaderMaterial({
      name: 'EdgeHalo',
      uniforms: {
        uHalf: { value: [s.width / 2 + 0.0022, s.height / 2 + 0.0022] },
        uFall: { value: 0.008 },
        uAlpha: { value: 0.3 },
        uColour: { value: new Color(HOLO_COLOURS.lumen) },
      },
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      toneMapped: false,
    }),
  };
}

/** Edge light strength: 1 = steady, up to 1.4 for the channel-change pulse (design-spec-2050 3.2). */
export function setEdgeBoost(m: HoloMaterials, boost: number): void {
  const b = Math.min(1.4, Math.max(0, boost));
  m.edge.color.set(HOLO_COLOURS.lumen).multiplyScalar(b);
  m.halo.uniforms.uAlpha!.value = Math.min(0.35, 0.3 * b);
}
