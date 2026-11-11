// Holo screen fragment shader (WebGL2 / GLSL ES 3.00 through three's conversion). Replaces the CRT shader behind the
// same uniform contract (ADR 0012). Timelines follow docs/design-spec-2050.md 3.3 (materialise 2.2 s, fold 0.55 s),
// 4.1 and 4.2 (slip, the Occupant). Output is colour; uMono = 1 greys it and drops the colour fringe.
//
// Texture is sampled with colorSpace = sRGB (linear here) and the output goes through three's colour-space chunk.
// Use NeutralToneMapping (recommended) or NoToneMapping.
precision highp float;

uniform sampler2D uMap;        // light-field text canvas (CanvasTexture, sRGB, mipmapped)
uniform float uTime;           // seconds
uniform float uWarmup;         // 0..1 over 2.2 s: materialise (0 = dark)
uniform float uCollapse;       // 0..1 over COLLAPSE_SECONDS (1.0 s): fold away (0 = not folding)
uniform float uCalm;           // 1 = frozen grain, no band, no ghost, no slip, no shimmer
uniform float uPixelRatio;     // device pixels per CSS px
uniform float uAspect;         // glass width / height (16/9)
uniform float uBrightness;     // 0..1 picture gain (0.4 for the loading pattern)
uniform float uBar;            // 0..1 scan band
uniform float uBurst;          // 0..1 channel-change interference (mean rise at most 0.10)
uniform float uNoiseHz;        // grain updates per second (clamped to 24)
uniform float uNoiseAmp;       // peak of the zero-mean light-field grain, linear
uniform float uGrainPx;        // grain cell in CSS px (2 or more)
uniform float uVignette;       // edge falloff, 0..1
uniform float uGlow;           // glow gain of the background layer
uniform float uGlowLod;        // mip level for the background layer
uniform float uCorner;         // corner radius, fraction of glass width
uniform float uReflection;     // faint soft reflection while off
uniform float uEdge;           // 1 = draw the 2 px edge light inside the glass (3d-screen, 2d); 0 when the model has its own
uniform float uMono;           // 1 = Monochrome: grey output, no fringe
uniform sampler2D uGhostMap;   // Occupant sprite (R tone, A coverage), drawOccupant 256 x 384
uniform float uGhost;
uniform float uGhostNear;
uniform float uGhostSeed;
uniform float uGhostTextCap;
uniform float uGhostPeak;
uniform float uRoll;           // 0 none, 0..1 phase through one display slip
uniform float uHauntVignette;
// Retired from the CRT contract, kept declared so the seam compiles: curvature, scanlines, static, jitter.
uniform float uCurvature;
uniform float uScanlines;
uniform float uScanStrength;
uniform float uStaticLevel;
uniform float uJitter;

varying vec2 vUv;
varying vec3 vView;

const float BLOOM_SECONDS = 2.2;
const float BAR_PERIOD = 6.0;
const float BAR_HEIGHT = 0.18;
const float BAR_DELTA = 0.02;
const float GHOST_AREA_GAIN = 1.4;
const float TEXT_CAP_SCALE = 0.9;
const float GLOW_CAP = 0.03;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Mirrors rollOffset() in createHoloMaterial.ts.
float rollOffset(float p) {
  if (p <= 0.0) return 0.0;
  float main = 5.0 / 6.0;
  if (p < main) return 0.5 - 0.5 * cos(3.14159265 * p / main);
  float r = (p - main) / (1.0 - main);
  return 1.0 + 0.03 * sin(3.14159265 * r) * (1.0 - r);
}

void main() {
  vec2 uvPerPx = max(fwidth(vUv) * uPixelRatio, vec2(1e-6));
  vec2 cssPerUv = 1.0 / uvPerPx;
  vec2 d = (vUv - 0.5) * 2.0;
  vec2 dCss = (vUv - 0.5) * cssPerUv;
  float calm = step(0.5, uCalm);
  float motion = 1.0 - calm;
  vec3 LUMEN = lin(vec3(0.561, 0.890, 1.0));       // #8fe3ff
  vec3 LUMEN_B = lin(vec3(0.749, 0.937, 1.0));     // #bfefff
  vec3 HAZE = lin(vec3(0.725, 0.643, 1.0));        // #b9a4ff
  vec3 GHOST = lin(vec3(0.812, 0.918, 1.0));       // #cfeaff

  // Rounded glass outline (signed distance in half-height units, negative inside).
  vec2 dA = d * vec2(uAspect, 1.0);
  float radius = uCorner * 2.0 * uAspect;
  vec2 qc = abs(dA) - vec2(uAspect, 1.0) + radius;
  float sdf = length(max(qc, 0.0)) + min(max(qc.x, qc.y), 0.0) - radius;
  float outline = 1.0 - smoothstep(-fwidth(sdf) * 1.5, 0.0, sdf);
  float insideCss = -sdf * 0.5 * cssPerUv.y;      // CSS px inside the edge

  float t = uWarmup * BLOOM_SECONDS;
  float collapsing = step(0.0001, uCollapse);
  float u = uCollapse;
  float fold = mix(0.0, 1.0, collapsing);

  // ---- slip: the picture layer wraps, the background layer lags 12 per cent behind ----
  float ro = rollOffset(uRoll) * motion * (1.0 - collapsing);
  vec2 par = vView.xy / max(vView.z, 0.2) * 0.006 * motion;
  vec2 uvF = vUv;
  vec2 uvB = vUv + par;
  if (ro > 0.0) {
    uvF.y = fract(vUv.y + ro);
    uvB.y = fract(vUv.y + ro * 0.88 + par.y);
  }

  // ---- materialise / fold parameters ----
  float seedI = smoothstep(0.0, 0.4, t) * (1.0 - smoothstep(1.1, 1.6, t));            // seed of light
  float hairE = smoothstep(0.4, 0.8, t);                                              // lines grow to the bounds
  float hairI = smoothstep(0.4, 0.5, t) * (1.0 - smoothstep(1.4, 1.9, t));
  float traceP = smoothstep(0.8, 1.1, t);                                             // outline traces round
  float revealR = clamp((t - 1.1) / 0.7, 0.0, 1.0) * 1.25;
  float fillGain = t < 1.8 ? 0.7 * smoothstep(1.1, 1.8, t) : mix(0.7, 1.0, smoothstep(1.8, 2.2, t));
  float blurLod = t < 1.8 ? mix(4.0, 1.0, smoothstep(1.1, 1.8, t)) : mix(1.0, 0.0, smoothstep(1.8, 2.2, t));
  float edgeAmt = max(traceP * 0.6, smoothstep(1.8, 2.2, t));
  float sharpen = smoothstep(1.4, 2.0, t);
  float shrinkR = mix(2.15, 0.0, smoothstep(0.02, 0.97, u));   // 2.15 = 1.25 plus the 0.9 edge softness, so the field starts whole
  float seedF = 1.0 - smoothstep(0.75, 1.0, u);
  float hairF = 1.0 - smoothstep(0.75, 0.95, u);
  if (collapsing > 0.5) {
    seedI = seedF;
    hairE = 1.0;
    hairI = hairF * smoothstep(0.15, 0.5, u);
    traceP = 1.0;
    revealR = shrinkR;
    fillGain = 1.0 - 0.2 * smoothstep(0.0, 0.3, u) - 0.5 * smoothstep(0.2, 0.9, u);
    blurLod = 3.0 * smoothstep(0.0, 0.3, u);
    edgeAmt = hairF;
    sharpen = 1.0;
  }

  float rn = length(d) / 1.4142;
  float fillMask = 1.0 - smoothstep(revealR - mix(0.2, 0.9, collapsing), revealR, rn);
  float filling = (t >= 1.1 || collapsing > 0.5) ? 1.0 : 0.0;
  fillMask *= filling;

  // ---- picture: the text canvas, blurred while it forms ----
  vec2 dx = dFdx(vUv) * exp2(blurLod);
  vec2 dy = dFdy(vUv) * exp2(blurLod);
  vec3 pic = textureGrad(uMap, uvF, dx, dy).rgb;
  pic = mix(pic, vec3(dot(pic, LUMA)), uMono);
  vec3 glowC = textureLod(uMap, uvB, uGlowLod).rgb;
  float glowL = dot(glowC, LUMA);
  vec3 glow = min(glowL * uGlow, GLOW_CAP) * mix(LUMEN * 0.9 + vec3(0.1), vec3(1.0), uMono);

  // ---- noise cell and grain ----
  vec2 cell = floor(gl_FragCoord.xy / (max(uGrainPx, 2.0) * uPixelRatio));
  float frame = floor(uTime * min(uNoiseHz, 24.0)) * (1.0 - calm);
  float nl = hash12(cell + vec2(frame * 37.0, frame * 17.0) + vec2(11.0, 29.0));

  // ---- the Occupant: 48 light slices condensing out of speckle ----
  vec3 ghostRGB = vec3(0.0);
  float ghostL = 0.0;
  if (uGhost > 0.0001 && calm < 0.5) {
    float ne = uGhostNear * uGhostNear * (3.0 - 2.0 * uGhostNear);
    float spriteH = mix(0.35, 0.95, ne) * (0.7 / 0.95) / 0.3229;
    vec2 headC = vec2(0.06 * sin(6.2831853 * uTime / 40.0) * uAspect, 0.5 - mix(0.62, 0.45, ne));
    vec2 pg = vec2((uvF.x - 0.5) * uAspect, uvF.y - 0.5);
    float syTop = 0.3125 - (pg.y - headC.y) / spriteH;
    float slice = floor(syTop * 48.0);
    float fr = fract(syTop * 48.0);
    float sy = (slice + 0.5) / 48.0;
    float shift = (vnoise(vec2(slice * 0.31 + uGhostSeed * 7.0, uTime * 0.2)) - 0.5) * 2.0 * 0.012;
    shift += 0.03 * exp(-pow((syTop - 0.508) / 0.02, 2.0));
    float sx = 0.5 + (pg.x - headC.x - shift * uAspect) / (spriteH * 0.66667);
    float fringePx = 0.0008 * (1.0 - uMono);
    float inside = step(0.0, sy) * step(sy, 1.0);
    vec2 sUvC = vec2(sx, 1.0 - sy);
    vec4 sprC = textureLod(uGhostMap, sUvC, 0.0);
    float fr1 = 0.0045;       // fringe in sprite uv, about 1 CSS px at the usual size
    float covL = textureLod(uGhostMap, vec2(sx + fr1, 1.0 - sy), 0.0).a;
    float covR = textureLod(uGhostMap, vec2(sx - fr1, 1.0 - sy), 0.0).a;
    float inX = step(0.0, sx) * step(sx, 1.0);
    float tone = sprC.r;
    float cover = sprC.a * inside * inX;
    // The seam parts into a slit from near 0.8, up to 8 units wide, brow to chin.
    float slitA = smoothstep(0.8, 1.0, uGhostNear);
    float slitW = mix(0.002, 0.0156, slitA);
    float inSeam = step(0.2, sy) * step(sy, 0.50);
    cover *= 1.0 - slitA * inSeam * (1.0 - smoothstep(slitW * 0.7, slitW, abs(sx - 0.5)));
    // Speckle emergence: two octaves, grain 2 to 4 px, re-seeded at 4 Hz at most.
    vec2 fc = gl_FragCoord.xy / uPixelRatio;
    float ph = floor(uTime * 4.0);
    float sp1 = hash12(floor(fc / 3.0) + vec2(ph * 13.0, uGhostSeed * 5.0));
    float sp2 = hash12(floor(fc / 2.0) + vec2(ph * 7.0 + 3.0, uGhostSeed * 9.0));
    float low = vnoise(uvF * vec2(9.0 * uAspect, 9.0) + vec2(uTime * 0.05, uGhostSeed * 3.1));
    float n = 0.45 * sp1 + 0.25 * sp2 + 0.3 * low;
    float want = uGhost * 1.2 * (0.55 + 0.45 * clamp(tone / 0.85, 0.0, 1.3));
    float vis = smoothstep(n - 0.12, n + 0.12, want);
    float rim = 1.0 + 0.7 * (1.0 - smoothstep(0.0, 0.09, fr));         // brighter top line of each slice
    float gap = 1.0 - 0.3 * smoothstep(0.88, 1.0, fr);
    ghostL = uGhostPeak * GHOST_AREA_GAIN * (1.0 - 0.45 * ne) * (tone / 0.85) * cover * vis * rim * gap;
    ghostL = min(ghostL, uGhostPeak);
    float textMask = smoothstep(0.0008, 0.01, dot(textureLod(uMap, uvF, 3.5).rgb, LUMA));
    ghostL = mix(ghostL, min(ghostL, uGhostTextCap * TEXT_CAP_SCALE), textMask);
    ghostRGB = GHOST * ghostL;
    // colour fringe: haze at the left edge, lumen at the right (35 per cent), none in Monochrome
    float fl = max(covL - sprC.a, 0.0) * inside * inX * vis * (1.0 - uMono);
    float frr = max(covR - sprC.a, 0.0) * inside * inX * vis * (1.0 - uMono);
    float edgeScale = min(uGhostPeak * GHOST_AREA_GAIN * (1.0 - 0.45 * ne) * 0.35, mix(0.2, uGhostTextCap * TEXT_CAP_SCALE, textMask));
    ghostRGB += (HAZE * fl + LUMEN * frr) * edgeScale;
    ghostRGB = mix(ghostRGB, vec3(dot(ghostRGB, LUMA)), uMono);
  }

  // ---- edge falloff: only outside the 0.92 safe area ----
  float hv = 1.0 - uHauntVignette * motion * smoothstep(0.92, 1.0, max(abs(d.x), abs(d.y)));
  float vig = 1.0 - uVignette * smoothstep(0.9, 1.6, length(d));

  // Picture layer: card + ghost behind it; the card is the text, so the ghost is added under it by luminance caps.
  vec3 img = (pic * fillGain * uBrightness + ghostRGB * uBrightness * smoothstep(1.6, 2.2, t) + glow * fillGain * uBrightness) * vig * hv;
  img *= fillMask;

  // ---- grain (zero mean) and fringe-like fill shimmer ----
  float grainOn = smoothstep(1.8, 2.2, t) * (1.0 - fold * smoothstep(0.0, 0.5, u)) * step(0.0001, uWarmup);
  vec3 grainTint = mix(vec3(0.8, 1.0, 1.0), vec3(1.0), uMono);
  vec3 grain = grainTint * (nl - 0.5) * 2.0 * uNoiseAmp * grainOn;
  float fringes = 0.5 + 0.5 * cos(rn * 70.0 - uTime * 0.0);
  vec3 fillGrain = LUMEN * 0.05 * (nl * 0.7 + fringes * 0.3) * (1.0 - sharpen) * fillMask * (1.0 - fold);
  fillGrain = mix(fillGrain, vec3(dot(fillGrain, LUMA)), uMono);
  vec3 burst = grainTint * uBurst * 0.10 * nl * 2.0 * motion * grainOn;

  // scan band: soft, 6 s per pass, after the bloom, off in Calm
  float barCentre = 1.0 + BAR_HEIGHT * 0.5 - fract(uTime / BAR_PERIOD) * (1.0 + BAR_HEIGHT);
  float band = 1.0 - smoothstep(0.0, BAR_HEIGHT * 0.5, abs(vUv.y - barCentre));
  vec3 bar = grainTint * band * BAR_DELTA * uBar * motion * smoothstep(2.0, 2.2, t) * (1.0 - fold * smoothstep(0.0, 0.5, u));

  // ---- seed, hairlines, outline ----
  float seed = (1.0 - smoothstep(5.0, 7.0, length(dCss))) + exp(-length(dCss) / 9.0) * 0.5;
  vec3 beam = LUMEN_B * seed * seedI * 0.9;
  float hx = (1.0 - smoothstep(0.5, 1.6, abs(dCss.y))) * step(abs(dCss.x), hairE * cssPerUv.x * 0.5);
  float hy = (1.0 - smoothstep(0.5, 1.6, abs(dCss.x))) * step(abs(dCss.y), hairE * cssPerUv.y * 0.5);
  beam += LUMEN * max(hx, hy) * hairI * 0.55;
  // edge light: 2 px just inside the glass, traces round from the line ends, glow of at most 8 px
  float ang = atan(dA.y, dA.x);
  float delta = abs(mod(ang + 0.7853982, 1.5707963) - 0.7853982);
  float traced = step(delta, traceP * 0.7853982 + 0.001);
  float line = (1.0 - smoothstep(0.6, 1.6, abs(insideCss - 1.0))) * step(0.0, insideCss);
  float edgeGlow = exp(-max(insideCss, 0.0) / 6.0) * 0.18 * step(0.0, insideCss);
  vec3 edge = LUMEN * (line * 0.8 + edgeGlow) * traced * edgeAmt * uEdge * (1.0 - 0.0);

  // off-state: smoked glass with a faint soft reflection
  float powered = max(step(0.0001, uWarmup), collapsing * (1.0 - smoothstep(0.85, 1.0, u)));
  vec2 rp = vec2(vUv.x + 0.2 * vUv.y, vUv.y);
  float pane = smoothstep(0.0, 0.08, rp.x - 0.2) * (1.0 - smoothstep(0.0, 0.08, rp.x - 0.55)) * smoothstep(0.0, 0.08, rp.y - 0.35) * (1.0 - smoothstep(0.0, 0.1, rp.y - 0.85));
  vec3 refl = LUMEN * uReflection * pane * (1.0 - powered);

  vec3 col = img + grain + fillGrain + burst + bar * fillMask + refl;
  col = max(col, vec3(0.0));
  col += beam + edge;
  col = mix(col, vec3(dot(col, LUMA)), uMono);
  col = clamp(col, 0.0, 1.0) * outline;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
