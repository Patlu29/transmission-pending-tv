/**
 * Small monoline icons for the dock keys (design-spec-2050 section 6): original, decorative
 * (`aria-hidden`), about 100 bytes each. The text label is always present beside them.
 */
const PATHS: Record<string, string> = {
  power: 'M12 3v8M7 6.5a7 7 0 1 0 10 0',
  calm: 'M4 12c3-5 5 5 8 0s5 5 8 0',
  guide: 'M5 6h14M5 12h14M5 18h9',
  room: 'M4 18V8l8-4 8 4v10M9 18v-5h6v5',
  colour: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 4v16',
  sound: 'M5 10v4h3l4 3V7l-4 3H5zM16 9a4 4 0 0 1 0 6',
  roomsound: 'M4 14c2-6 4 6 6 0s4 6 6 0 2 3 4 0',
  text: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6',
  skip: 'M6 6l8 6-8 6zM17 6v12',
  pause: 'M8 6v12M16 6v12',
  play: 'M8 5l11 7-11 7z',
  replay: 'M5 12a7 7 0 1 0 2-5M5 5v4h4',
  prev: 'M14 6l-6 6 6 6',
  next: 'M10 6l6 6-6 6',
  index: 'M5 6h14M5 12h14M5 18h14',
  auto: 'M12 6v6l4 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  chprev: 'M6 12l6-6v12zM17 6v12',
  chnext: 'M18 12l-6-6v12zM7 6v12',
  look: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  focus: 'M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4',
  stop: 'M7 7h10v10H7z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  keys: 'M4 8h16v9H4zM7 11h.01M11 11h.01M15 11h.01M8 14h8',
  solid: 'M5 5h14v14H5zM5 12h14',
};

export function KeyIcon({ name }: { name: string }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg className="key__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}
