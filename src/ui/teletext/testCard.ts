import type { Palette } from './palette';

/**
 * Original test card (design-spec 11): generic test geometry in a 1000 x 750
 * space. No broadcaster logo, name or layout. Greyscale only.
 */
export interface TestCardOptions {
  /** Second caption line: STAND BY, TUNING... NN% or NO SIGNAL. */
  sub: string;
  /** Loading: dimmed to 40 per cent. */
  dim: boolean;
}

const grey = (level: number) => {
  const g = Math.round(level * 255);
  return `rgb(${g} ${g} ${g})`;
};

export function drawTestCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: Palette,
  o: TestCardOptions,
) {
  const tt = (i: number) => p.tt[i] ?? p.bg;
  ctx.save();
  ctx.fillStyle = tt(1);
  ctx.fillRect(0, 0, width, height);

  const s = Math.min(width / 1000, height / 750);
  ctx.translate((width - 1000 * s) / 2, (height - 750 * s) / 2);
  ctx.scale(s, s);

  // 1 Field hairline grid, 20 x 15
  ctx.strokeStyle = tt(3);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 50, 0);
    ctx.lineTo(i * 50, 750);
    ctx.stroke();
  }
  for (let i = 0; i <= 15; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 50);
    ctx.lineTo(1000, i * 50);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 2 Double rule frame, square corners
  ctx.strokeStyle = tt(6);
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, 952, 702);
  ctx.strokeStyle = tt(3);
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, 932, 682);

  // 10 Corner marks (quarter circles)
  const caps: Array<[number, number, number, number]> = [
    [34, 34, 0, 2],
    [966, 34, 0.5, 4],
    [966, 716, 1, 5],
    [34, 716, 1.5, 6],
  ];
  caps.forEach(([cx, cy, quarter, token]) => {
    ctx.fillStyle = tt(token);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 60, quarter * Math.PI, (quarter + 0.5) * Math.PI);
    ctx.closePath();
    ctx.fill();
  });

  // 7 Grey scale strip: nine blocks, black to white
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = grey(i / 8);
    ctx.fillRect(150 + (i * 700) / 9, 48, 700 / 9 + 0.5, 70);
  }

  // 8 Ramp with a line at each tenth
  const ramp = ctx.createLinearGradient(150, 0, 850, 0);
  ramp.addColorStop(0, grey(0));
  ramp.addColorStop(1, grey(1));
  ctx.fillStyle = ramp;
  ctx.fillRect(150, 660, 700, 50);
  ctx.strokeStyle = tt(2);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(150 + i * 70, 660);
    ctx.lineTo(150 + i * 70, 710);
    ctx.stroke();
  }

  // 9 Wedges: five groups of bars narrowing from 12 to 1 unit
  const widths = [12, 8, 5, 3, 1.5];
  for (const [x0, x1] of [
    [48, 130],
    [870, 952],
  ] as const) {
    ctx.fillStyle = tt(0);
    ctx.fillRect(x0, 160, x1 - x0, 430);
    ctx.fillStyle = tt(7);
    widths.forEach((w, g) => {
      const top = 160 + g * 86;
      for (let y = 0; y < 86; y += w * 2) ctx.fillRect(x0, top + y, x1 - x0, Math.min(w, 86 - y));
    });
  }

  // 3 Main circle
  ctx.fillStyle = tt(1);
  ctx.strokeStyle = tt(7);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(500, 360, 215, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5 Ring steps, radius 112 to 202
  const ringGreys = [1, 2, 4, 5, 6];
  ringGreys.forEach((g, k) => {
    ctx.strokeStyle = tt(g);
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(500, 360, 121 + k * 18, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 4 Siren: 12-sector pie, hub
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = tt(i % 2 === 0 ? 0 : 7);
    ctx.beginPath();
    ctx.moveTo(500, 360);
    ctx.arc(500, 360, 100, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = tt(2);
  ctx.beginPath();
  ctx.arc(500, 360, 12, 0, Math.PI * 2);
  ctx.fill();

  // 6 Cross with centring ticks
  ctx.strokeStyle = tt(6);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, 360);
  ctx.lineTo(966, 360);
  ctx.moveTo(500, 34);
  ctx.lineTo(500, 716);
  for (let x = 100; x < 1000; x += 50) {
    ctx.moveTo(x, 354);
    ctx.lineTo(x, 366);
  }
  for (let y = 60; y < 720; y += 50) {
    ctx.moveTo(494, y);
    ctx.lineTo(506, y);
  }
  ctx.stroke();

  // 11 and 12 Caption plate, drawn on top of the circle
  ctx.fillStyle = tt(0);
  ctx.fillRect(290, 564, 420, 84);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tt(7);
  ctx.font = `600 32px ${p.fontDisplay}`;
  ctx.fillText('TRANSMISSION PENDING', 500, 585);
  ctx.fillStyle = tt(3);
  ctx.fillRect(300, 604, 400, 2);
  ctx.fillStyle = tt(5);
  ctx.font = `22px ${p.fontTeletext}`;
  ctx.fillText(o.sub, 500, 628);
  ctx.restore();

  if (o.dim) {
    // 40 per cent brightness: a black veil at 60 per cent.
    ctx.fillStyle = tt(0);
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }
}
