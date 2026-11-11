// Holo screen vertex shader. `vView` is the camera's offset from the fragment in the mesh's local space, used for the
// small view-dependent offset of the background light-field layer. Face-on it is a constant.
varying vec2 vUv;
varying vec3 vView;

void main() {
  vUv = uv;
  vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  vView = camLocal - position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
