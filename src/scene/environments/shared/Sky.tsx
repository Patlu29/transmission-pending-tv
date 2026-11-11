/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively by design */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { RoomClock } from './clock.ts';

interface SkyProps {
  /** Colours, bottom to top: horizon light, horizon glow, mid, zenith. */
  horizon: string;
  glow: string;
  mid: string;
  zenith: string;
  /** Elevation (sin of the angle) where the glow band is centred, and its half width. */
  glowAt?: number;
  glowWidth?: number;
  /** Lower hemisphere colour (below the horizon). */
  below?: string;
  radius?: number;
}

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFragment = /* glsl */ `
uniform vec3 uHorizon; uniform vec3 uGlow; uniform vec3 uMid; uniform vec3 uZenith; uniform vec3 uBelow;
uniform float uGlowAt; uniform float uGlowW;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 up = mix(uHorizon, uMid, smoothstep(0.0, 0.35, h));
  up = mix(up, uZenith, smoothstep(0.25, 0.9, h));
  float g = exp(-pow((h - uGlowAt) / uGlowW, 2.0));
  up = mix(up, uGlow, g * 0.85);
  vec3 col = h < 0.0 ? mix(uHorizon, uBelow, smoothstep(0.0, -0.3, h)) : up;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/** Background gradient sphere that follows the camera (so it is infinitely far). Never carries video. */
export function GradientSky(p: SkyProps) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uHorizon: { value: new Color(p.horizon) },
          uGlow: { value: new Color(p.glow) },
          uMid: { value: new Color(p.mid) },
          uZenith: { value: new Color(p.zenith) },
          uBelow: { value: new Color(p.below ?? p.mid) },
          uGlowAt: { value: p.glowAt ?? 0.03 },
          uGlowW: { value: p.glowWidth ?? 0.14 },
        },
      }),
    // colours are static for the life of the room
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} renderOrder={-100} frustumCulled={false} material={material}>
      <sphereGeometry args={[p.radius ?? 1500, 24, 16]} />
    </mesh>
  );
}

const starVertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime; uniform float uSize; uniform float uHz; uniform float uAmp;
varying float vA;
void main() {
  float tw = 1.0 - uAmp * (0.5 + 0.5 * sin(6.2832 * uHz * (0.3 + aSeed.y * 0.9) * uTime + aSeed.x * 6.28));
  vA = tw * (0.55 + 0.45 * aSeed.z);
  gl_PointSize = uSize * (0.7 + aSeed.z * 0.9);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const starFragment = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, r) * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;

/**
 * A star field on a sphere shell, twinkling at 0.3 to 1.2 Hz and at most `amp` alpha, staggered so no large
 * area changes together. One draw call.
 */
export function Stars({
  clock,
  count,
  minY = 0.04,
  pixelRatio = 1,
  amp = 0.1,
  color = '#ffffff',
  seed = 7,
}: {
  clock: MutableRefObject<RoomClock>;
  count: number;
  minY?: number;
  pixelRatio?: number;
  amp?: number;
  color?: string;
  seed?: number;
}) {
  const group = useRef<Group>(null);
  const { geometry, material } = useMemo(() => {
    let s = seed;
    const r = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = minY + r() * (1 - minY);
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * rr * 1400, y * 1400, Math.sin(a) * rr * 1400], i * 3);
      sd.set([r(), r(), r()], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new Float32BufferAttribute(sd, 3));
    const m = new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 2.4 * pixelRatio },
        uHz: { value: 1 },
        uAmp: { value: amp },
        uColor: { value: new Color(color) },
      },
    });
    return { geometry: g, material: m };
  }, [count, minY, pixelRatio, amp, color, seed]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ camera }) => {
    material.uniforms.uTime!.value = clock.current.t;
    group.current?.position.copy(camera.position);
  });
  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-90} />
    </group>
  );
}
