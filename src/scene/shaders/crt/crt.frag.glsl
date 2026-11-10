// CRT screen fragment shader (WebGL2 / GLSL ES 3.00 through three's conversion).
//
// Greyscale by construction: every term is a scalar luminance and the output is
// vec3(l), so R = G = B exactly. Texture is sampled with colorSpace = sRGB (linear
// in the shader); the output goes through three's colour-space chunk, which applies
// the same curve to all three channels. Use NoToneMapping or NeutralToneMapping.
//
// Timelines follow docs/design-spec.md sections 6.1, 7.2 and 7.3.
precision highp float;

uniform sampler2D uMap;        // teletext canvas (CanvasTexture, sRGB, mipmapped)
uniform float uTime;           // seconds; advances always, noise is frozen by uCalm
uniform float uWarmup;         // 0..1 over the 2.2 s warm-up (0 = set off)
uniform float uCollapse;       // 0..1 over the power-off collapse (0 = not collapsing)
uniform float uCalm;           // 1 = calm / reduced motion: frozen noise, no bar, no jitter
uniform float uPixelRatio;     // device pixels per CSS px
uniform float uAspect;         // glass width / height (4/3 for the set)
uniform float uBrightness;     // 0..1 picture gain (0.4 for the dim loading card)
uniform float uBar;            // 0..1 rolling hum bar strength
uniform float uBurst;          // 0..1 channel-change burst (mean rise at most 0.10)
uniform float uNoiseHz;        // noise updates per second (clamped to 24)
uniform float uNoiseAmp;       // peak of the zero-mean grain, linear luminance
uniform float uGrainPx;        // grain cell size in CSS px (2 or more)
uniform float uCurvature;      // barrel strength
uniform float uScanlines;      // scanline count over the glass height
uniform float uScanStrength;   // darkest scanline reduction, 0..1
uniform float uVignette;       // corner darkening, 0..1
uniform float uGlow;           // phosphor glow gain
uniform float uGlowLod;        // mip level used as the glow blur
uniform float uCorner;         // corner radius as a fraction of the glass width
uniform float uStaticLevel;    // warm-up static luminance gain (mean = level x 0.5)
uniform float uReflection;     // faint window reflection while the set is off
uniform float uJitter;         // 0..1 horizontal jitter enable

varying vec2 vUv;

#include <tonemapping_pars_fragment>

const float WARMUP_SECONDS = 2.2;
const float BAR_PERIOD = 6.0;       // seconds per pass (design-spec 7.3)
const float BAR_HEIGHT = 0.18;      // 18 per cent of the screen
const float BAR_DELTA = 0.025;      // luminance delta, under the 0.04 limit
const float GLOW_CAP = 0.025;       // glow can lift the dark ground by this much at most
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Elliptical beam spot: bright core with a small halo. Radii in CSS px.
float beam(vec2 dCss, vec2 radii) {
  vec2 q = dCss / max(radii, vec2(0.5));
  float e = length(q);
  float core = 1.0 - smoothstep(0.7, 1.0, e);
  float halo = exp(-e * e * 0.25) * 0.35;
  return min(core + halo, 1.0);
}

void main() {
  // Derivatives first, in uniform control flow.
  vec2 uvPerPx = max(fwidth(vUv) * uPixelRatio, vec2(1e-6));
  vec2 cssPerUv = 1.0 / uvPerPx;
  float scanPitchPx = 1.0 / (max(fwidth(vUv.y), 1e-6) * uScanlines);

  vec2 d = (vUv - 0.5) * 2.0;                  // -1..1 over the glass
  vec2 dCss = (vUv - 0.5) * cssPerUv;          // CSS px from the glass centre
  float calm = step(0.5, uCalm);
  float motion = 1.0 - calm;

  // Rounded glass outline in screen space.
  vec2 dA = d * vec2(uAspect, 1.0);
  float radius = uCorner * 2.0 * uAspect;
  vec2 qc = abs(dA) - vec2(uAspect, 1.0) + radius;
  float sdf = length(max(qc, 0.0)) + min(max(qc.x, qc.y), 0.0) - radius;
  float outline = 1.0 - smoothstep(-fwidth(sdf) * 1.5, 0.0, sdf);

  // Timeline state.
  float t = uWarmup * WARMUP_SECONDS;
  float collapsing = step(0.0001, uCollapse);
  float u = uCollapse;
  float a = clamp(u / 0.55, 0.0, 1.0);                       // squash phase
  float fade = 1.0 - smoothstep(0.0, 0.5, u);                // noise, bar, static leave first

  // Collapse squashes the raster vertically around the centre.
  float squash = 1.0 - pow(a, 2.2) * (1.0 - min(2.0 / cssPerUv.y, 1.0));
  squash = mix(1.0, squash, collapsing);
  vec2 dr = vec2(d.x, d.y / squash);

  // Barrel distortion, normalised so the middle of each edge stays on the edge.
  float k = uCurvature;
  vec2 ds = dr * (1.0 + k * dot(dr, dr)) / (1.0 + k);
  vec2 uvC = ds * 0.5 + 0.5;
  float inTex = step(0.0, uvC.x) * step(uvC.x, 1.0) * step(0.0, uvC.y) * step(uvC.y, 1.0);
  inTex *= step(abs(d.y), squash);

  // Horizontal jitter: at most 0.5 CSS px, 80 ms, once every 2.5 s, one band of rows.
  float jPhase = fract(uTime / 2.5) * 2.5;
  float jEvent = floor(uTime / 2.5);
  float jBandY = hash12(vec2(jEvent, 3.7));
  float jOn = step(jPhase, 0.08) * step(abs(vUv.y - jBandY), 0.05);
  uvC.x += 0.5 * uvPerPx.x * jOn * uJitter * motion * step(1.0, uWarmup) * (1.0 - collapsing);

  // Picture and phosphor glow.
  float pic = dot(texture2D(uMap, uvC).rgb, LUMA);
  float glow = dot(textureLod(uMap, uvC, uGlowLod).rgb, LUMA);

  // Scanlines (faded out when the pitch drops under about 2 device px, to avoid moire).
  float scan = 0.5 + 0.5 * cos(6.2831853 * vUv.y * uScanlines);
  float scanFade = smoothstep(1.5, 3.5, scanPitchPx);
  float scanDark = uScanStrength * scan * scanFade;

  float vig = 1.0 - uVignette * smoothstep(0.9, 1.6, length(d));

  float flicker = 1.0 + 0.005 * sin(6.2831853 * 1.3 * uTime) * motion;   // 0.5 per cent, 1.3 Hz
  float glowAdd = min(glow * uGlow * flicker, GLOW_CAP);
  float img = (pic * uBrightness * (1.0 - scanDark) + glowAdd * uBrightness) * vig * inTex;

  // Rolling hum bar, after warm-up only, 6 s per pass, off in calm mode.
  float barCentre = 1.0 + BAR_HEIGHT * 0.5 - fract(uTime / BAR_PERIOD) * (1.0 + BAR_HEIGHT);
  float bar = 1.0 - smoothstep(0.0, BAR_HEIGHT * 0.5, abs(vUv.y - barCentre));
  bar *= BAR_DELTA * uBar * motion * smoothstep(2.0, 2.2, t) * fade;

  // Noise cell in screen space so the grain is at least uGrainPx CSS px, whatever the angle.
  vec2 cell = floor(gl_FragCoord.xy / (max(uGrainPx, 2.0) * uPixelRatio));
  float frame = floor(uTime * min(uNoiseHz, 24.0)) * (1.0 - calm);
  float nl = hash12(cell + vec2(frame * 37.0, frame * 17.0) + vec2(11.0, 29.0));   // mean 0.5

  // ---- Warm-up ----
  float c = smoothstep(1.5, 2.2, t);                           // static -> picture cross-fade
  float imgGain = mix(c * (0.3 + 0.7 * c), 1.0, collapsing);
  float staticOpacity = 0.6 * smoothstep(1.0, 1.5, t) * (1.0 - c * c);
  float revealR = (t - 1.0) / 0.5 * 1.25;
  float staticMask = 1.0 - smoothstep(revealR - 0.15, revealR, length(d) / 1.4142);
  float staticLum = nl * uStaticLevel * staticOpacity * staticMask * vig * inTex;

  float e1 = 1.0 - pow(1.0 - clamp(t / 0.3, 0.0, 1.0), 2.0);   // line grows, ease out
  float e2 = smoothstep(0.0, 1.0, clamp((t - 0.3) / 0.4, 0.0, 1.0));
  float warmRx = mix(e1 * cssPerUv.x * 0.5, 5.0, e2);
  float warmRy = mix(1.0, 5.0, e2);
  float dotFade = 1.0 - smoothstep(1.0, 1.5, t);
  float afterglow = 0.12 * (1.0 - e2) * smoothstep(0.3, 0.32, t)
      * (1.0 - smoothstep(0.0, 1.5, abs(dCss.y)));
  float warmBeam = (0.9 * beam(dCss, vec2(warmRx, warmRy)) + afterglow) * dotFade;
  warmBeam *= step(0.0001, uWarmup);

  // ---- Power-off collapse ----
  float b = smoothstep(0.0, 1.0, clamp((u - 0.55) / 0.25, 0.0, 1.0));
  float cdot = smoothstep(0.0, 1.0, clamp((u - 0.8) / 0.2, 0.0, 1.0));
  float colRx = mix(cssPerUv.x * 0.5, 5.0, b);
  float colRy = mix(1.0, 4.0, b);
  float colInt = 0.9 * smoothstep(0.5, 1.0, a) * (1.0 - cdot);
  float colBeam = colInt * beam(dCss, vec2(colRx, colRy)) * collapsing;
  float imgCollapse = img * (1.0 + 0.5 * a * a * a) * (1.0 - smoothstep(0.8, 1.0, a));

  float picture = mix(img * imgGain, imgCollapse, collapsing);
  float beamLum = mix(warmBeam, colBeam, collapsing);

  // Powered amount, used to hide the dark-glass reflection while the picture is up.
  float powered = mix(smoothstep(0.0, 0.05, uWarmup), 1.0 - smoothstep(0.85, 1.0, u), collapsing);
  vec2 rp = vec2(vUv.x + 0.15 * vUv.y, vUv.y);
  float pane = smoothstep(0.0, 0.03, rp.x - 0.18) * (1.0 - smoothstep(0.0, 0.03, rp.x - 0.5))
             * smoothstep(0.0, 0.03, rp.y - 0.4) * (1.0 - smoothstep(0.0, 0.03, rp.y - 0.88));
  float pane2 = smoothstep(0.0, 0.03, rp.x - 0.56) * (1.0 - smoothstep(0.0, 0.03, rp.x - 0.88))
              * smoothstep(0.0, 0.03, rp.y - 0.4) * (1.0 - smoothstep(0.0, 0.03, rp.y - 0.88));
  float reflection = uReflection * max(pane, pane2) * (1.0 - powered) * vig * inTex;

  // Zero-mean grain over the settled picture (fades with the warm-up and the collapse).
  float grainOn = smoothstep(1.5, 2.2, t) * fade * step(0.0001, uWarmup);
  float grain = (nl - 0.5) * 2.0 * uNoiseAmp * grainOn * outline;
  float burst = uBurst * 0.10 * nl * 2.0 * motion * grainOn * outline;

  float lum = picture + staticLum * fade + bar * powered + grain + burst + reflection;
  lum = max(lum, beamLum * outline);
  lum = clamp(lum, 0.0, 1.0) * outline;

  gl_FragColor = vec4(vec3(lum), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
