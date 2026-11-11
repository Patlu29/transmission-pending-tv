/** When the site uses solid panels (T50-6, T50-7). Pure, used by useGlassMode and the tests. */
export function computeGlassSolid(input: {
  manual: boolean;
  reducedTransparency: boolean;
  contrastMore: boolean;
  backdropSupported: boolean;
  dprStepped: boolean;
}): boolean {
  return (
    input.manual ||
    input.reducedTransparency ||
    input.contrastMore ||
    !input.backdropSupported ||
    input.dprStepped
  );
}
