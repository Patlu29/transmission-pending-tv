import sources from '../content/guide-sources.json';

/**
 * privacy.html is static, but two sentences depend on the guide data (design-spec v2 6.3):
 * the Doordarshan and Sansad TV note shows only while those entries are enabled, and the NASA
 * credit only if NASA is listed. Same-origin module (the CSP blocks inline scripts).
 */
const enabled = sources.channels.filter((c) => c.enabled);
document
  .getElementById('via-embed')
  ?.toggleAttribute('hidden', !enabled.some((c) => /^(DD |Sansad)/.test(c.name)));
document
  .getElementById('nasa')
  ?.toggleAttribute('hidden', !enabled.some((c) => /nasa/i.test(c.name)));
