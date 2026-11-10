// CRT screen vertex shader. The `screen` mesh UVs run 0..1 over the 4:3 glass.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
