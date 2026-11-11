/**
 * Content Security Policy and referrer policy for the static site. Owner: architect.
 * ADR 0011 §6. GitHub Pages cannot set headers, so vite.config.ts injects the CSP as a <meta> tag
 * into BUILT pages only: the Vite dev server needs inline scripts and <style> tags for HMR.
 * The referrer meta tag is static in index.html (it is harmless in dev).
 *
 * Why each third-party source exists (nothing else may be added without an ADR):
 *   script-src https://www.youtube.com         YouTube IFrame API loader and widget script (after a pick only)
 *   frame-src  https://www.youtube-nocookie.com the player (privacy-enhanced mode)
 *   'wasm-unsafe-eval'                          WebAssembly decoders (Draco, Meshopt, KTX2) for v2
 *                                               environment assets; allows Wasm compilation, not JS eval.
 *                                               Decoders must be self-hosted (no CDN).
 * Not available in a meta CSP: frame-ancestors, report-uri, sandbox (accepted for a static site).
 */

export const REFERRER_POLICY = 'strict-origin-when-cross-origin';

export const CSP_DIRECTIVES: Readonly<Record<string, readonly string[]>> = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://www.youtube.com'],
  'frame-src': ['https://www.youtube-nocookie.com'],
  'connect-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'font-src': ["'self'"],
  'style-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'none'"],
};

export const CONTENT_SECURITY_POLICY = Object.entries(CSP_DIRECTIVES)
  .map(([name, values]) => `${name} ${values.join(' ')}`)
  .join('; ');
