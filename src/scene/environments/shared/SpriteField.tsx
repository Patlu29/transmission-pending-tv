/* eslint-disable react-hooks/immutability -- three.js materials are mutated imperatively by design */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type MutableRefObject } from 'react';
import {
  Color,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  type InstancedMesh,
} from 'three';
import type { RoomClock } from './clock.ts';
import { KEEPOUT_UNIFORMS_GLSL, keepOutUniforms } from './keepOut.ts';

export type SpriteKind = 'puff' | 'dot' | 'streak' | 'bird' | 'steam';

interface Props {
  clock: MutableRefObject<RoomClock>;
  count: number;
  seed?: number;
  /** Region in world metres. Instances drift and wrap inside it. */
  min: [number, number, number];
  max: [number, number, number];
  /** Drift in metres per second (wraps). */
  velocity?: [number, number, number];
  /** Quad size range, metres. */
  size: [number, number];
  kind: SpriteKind;
  colorA: string;
  colorB?: string;
  alpha: number;
  /** Fade out before the player rect plus halo (moving ambient sprites must). */
  keepOut?: boolean;
  /** Twinkle: 0 = none; else alpha dips by `amp` at about `hz`. */
  twinkle?: { hz: number; amp: number };
  renderOrder?: number;
  /** Quads stretch (scale y) for streaks and steam. */
  aspect?: number;
}

const vertex = /* glsl */ `
attribute vec3 aBase;
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uMin;
uniform vec3 uMax;
uniform vec3 uVel;
uniform vec2 uSize;
uniform float uAspect;
varying vec2 vUv;
varying vec4 vSeed;
varying float vEdge;
void main() {
  vec3 span = uMax - uMin;
  vec3 f = fract(aBase + uVel * uTime * aSeed.z / span);
  vec3 wp = uMin + f * span;
  float e = 1.0;
  if (abs(uVel.x) > 0.0) e *= smoothstep(0.0, 0.07, f.x) * (1.0 - smoothstep(0.93, 1.0, f.x));
  if (abs(uVel.y) > 0.0) e *= smoothstep(0.0, 0.1, f.y) * (1.0 - smoothstep(0.85, 1.0, f.y));
  if (abs(uVel.z) > 0.0) e *= smoothstep(0.0, 0.07, f.z) * (1.0 - smoothstep(0.93, 1.0, f.z));
  vEdge = e;
  vUv = uv;
  vSeed = aSeed;
  float s = mix(uSize.x, uSize.y, aSeed.x);
  vec4 mv = modelViewMatrix * vec4(wp, 1.0);
  mv.xy += position.xy * vec2(s, s * uAspect);
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uAlpha;
uniform float uTime;
uniform float uKind;
uniform vec2 uTwinkle;
uniform float uUseKeepOut;
varying vec2 vUv;
varying vec4 vSeed;
varying float vEdge;
${KEEPOUT_UNIFORMS_GLSL}
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float a;
  if (uKind < 0.5) { // puff
    float lump = 0.62 + 0.38 * sin(vUv.x * 9.0 + vSeed.y * 6.28) * sin(vUv.y * 7.0 + vSeed.y * 12.0);
    a = smoothstep(1.0, 0.15, r * (1.15 - 0.25 * lump));
    a *= a;
  } else if (uKind < 1.5) { // dot
    a = pow(max(1.0 - r, 0.0), 2.0);
  } else if (uKind < 2.5) { // streak
    a = smoothstep(0.5, 0.0, abs(p.x)) * smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  } else if (uKind < 3.5) { // bird: a V with a wing-beat
    float flap = 0.28 + 0.14 * sin(6.2832 * 1.5 * uTime + vSeed.y * 6.28);
    vec2 q = vec2(abs(p.x) * 2.0, p.y * 2.0);
    float d = abs(q.y - (0.0 - q.x * flap * 2.0) - 0.15 * 0.0);
    a = smoothstep(0.09, 0.02, d) * step(q.x, 0.95);
  } else { // steam: a soft rising wisp
    a = smoothstep(0.5, 0.0, abs(p.x) * (1.0 + vUv.y)) * smoothstep(0.0, 0.2, vUv.y) * (1.0 - vUv.y);
  }
  float tw = 1.0;
  if (uTwinkle.x > 0.0) tw = 1.0 - uTwinkle.y * (0.5 + 0.5 * sin(6.2832 * uTwinkle.x * (0.6 + vSeed.z * 0.8) * uTime + vSeed.y * 6.28));
  float k = uUseKeepOut > 0.5 ? keepOutFade() : 1.0;
  float alpha = a * uAlpha * vEdge * tw * k;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(mix(uColA, uColB, vSeed.w), alpha);
  #include <colorspace_fragment>
}`;

const KIND: Record<SpriteKind, number> = { puff: 0, dot: 1, streak: 2, bird: 3, steam: 4 };

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One instanced draw call of soft billboard sprites that drift and wrap inside a region, entirely in
 * the vertex shader (no CPU per sprite). PLACEHOLDER for the technical-artist's atlas-based sprites;
 * everything is procedural, so it costs no bytes.
 */
export function SpriteField(props: Props) {
  const {
    clock,
    count,
    seed = 1,
    min,
    max,
    velocity = [0, 0, 0],
    size,
    kind,
    colorA,
    colorB = colorA,
    alpha,
    keepOut = false,
    twinkle,
    renderOrder = 0,
    aspect = 1,
  } = props;
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());
  void pixelRatio;

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    const r = rng(seed);
    const base = new Float32Array(count * 3);
    const sd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      base[i * 3] = r();
      base[i * 3 + 1] = r();
      base[i * 3 + 2] = r();
      sd[i * 4] = r();
      sd[i * 4 + 1] = r();
      sd[i * 4 + 2] = 0.7 + r() * 0.6;
      sd[i * 4 + 3] = r();
    }
    g.setAttribute('aBase', new InstancedBufferAttribute(base, 3));
    g.setAttribute('aSeed', new InstancedBufferAttribute(sd, 4));
    return g;
  }, [count, seed]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uMin: { value: min },
          uMax: { value: max },
          uVel: { value: velocity },
          uSize: { value: size },
          uAspect: { value: aspect },
          uColA: { value: new Color(colorA) },
          uColB: { value: new Color(colorB) },
          uAlpha: { value: alpha },
          uKind: { value: KIND[kind] },
          uTwinkle: { value: twinkle ? [twinkle.hz, twinkle.amp] : [0, 0] },
          uUseKeepOut: { value: keepOut ? 1 : 0 },
          ...keepOutUniforms(),
        },
      }),
    // props are static for the life of the field
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(() => {
    material.uniforms.uTime!.value = clock.current.t;
  });

  return (
    <instancedMesh
      args={[geometry, material, count]}
      frustumCulled={false}
      renderOrder={renderOrder}
      onUpdate={(m: InstancedMesh) => {
        m.userData.ambient = true;
      }}
    />
  );
}
