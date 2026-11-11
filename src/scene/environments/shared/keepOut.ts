import { sharedRoomUniforms } from './roomUniforms.ts';

/**
 * Shared keep-out uniforms (design-spec-v2 5.0). `value` = (minX, minY, maxX, maxY) in CSS px from the
 * stage's top-left: the projected player rect plus the 24 px halo. "None" is the technical-artist's -1e5 box (see clearKeepOut).
 * Set by the projector on settle and resize. Moving ambient sprites multiply their alpha by
 * `keepOutFade()` so they fade out before they could touch the zone.
 */
export const keepOutUniform = sharedRoomUniforms.uKeepOut;
/** (stage width CSS px, stage height CSS px, device pixel ratio). Updated by EnvironmentCamera. */
export const viewportUniform = sharedRoomUniforms.uView;

export const KEEPOUT_UNIFORMS_GLSL = /* glsl */ `
uniform vec4 uKeepOut;
uniform vec3 uViewport;
float keepOutFade() {
  if (uKeepOut.z <= uKeepOut.x) return 1.0;
  vec2 p = vec2(gl_FragCoord.x, uViewport.y * uViewport.z - gl_FragCoord.y) / uViewport.z;
  float dx = max(max(uKeepOut.x - p.x, p.x - uKeepOut.z), 0.0);
  float dy = max(max(uKeepOut.y - p.y, p.y - uKeepOut.w), 0.0);
  return smoothstep(0.0, 40.0, length(vec2(dx, dy)));
}
`;

export const keepOutUniforms = () => ({ uKeepOut: keepOutUniform, uViewport: viewportUniform });
