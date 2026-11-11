/**
 * Shared GLSL for the v2 rooms (design-spec-v2 5.0). Prepend `ROOM_GLSL` to a fragment shader (and the uniform
 * declarations to a vertex shader if it needs them). Uniform objects are shared by every room material, so one
 * clock update drives all of them.
 */
export const ROOM_GLSL = /* glsl */ `
uniform float uTime;      // seconds; held at a fixed frame in Calm
uniform float uCalm;      // 1 in Calm: frozen, and moving sprites are hidden
uniform float uSpill;     // generic light spill, 1 +- 13 per cent, components at 1.3 Hz or slower, 1 in Calm
uniform vec4 uKeepOut;    // player rect plus halo: x0, y0, x1, y1 in CSS px, top-left origin
uniform vec3 uView;       // canvas CSS width, CSS height, pixel ratio

float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }

// Alpha multiplier: 0 inside the keep-out rect, rising to 1 over 40 CSS px outside it.
float keepFade() {
  vec2 p = vec2(gl_FragCoord.x, uView.y * uView.z - gl_FragCoord.y) / uView.z;
  vec2 a = uKeepOut.xy - p;
  vec2 b = p - uKeepOut.zw;
  float d = length(max(max(a, b), 0.0));
  return smoothstep(0.0, 40.0, d);
}
`;

/** Declarations only, for vertex shaders. */
export const ROOM_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform float uCalm;
uniform float uSpill;
uniform vec4 uKeepOut;
uniform vec3 uView;
`;
