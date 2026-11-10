/** Pre-renders a 128 px greyscale noise tile for the 2D screen (R = G = B, zero-mean spread). */
export function installNoiseTile(): void {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const g = Math.floor(Math.random() * 256);
    image.data[i] = g;
    image.data[i + 1] = g;
    image.data[i + 2] = g;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  document.documentElement.style.setProperty(
    '--noise-tile',
    `url(${canvas.toDataURL('image/png')})`,
  );
}
