import { create } from 'zustand';
import { readPref, writePref } from './sessionPrefs.ts';

/**
 * v2 viewer options (visit only). `colour` is the Colour / Monochrome option (2050 theme, default
 * Colour). 'bw' means Monochrome: one CSS greyscale filter on the canvas element and the 2D skins,
 * and `data-colour="mono"` on <html> greys the site's own accents. It never touches the YouTube player.
 */
export type ColourOption = 'bw' | 'colour';

interface SettingsState {
  colour: ColourOption;
  /** Optional synthesised room sound (V2-FR-37). Off by default; audible only while the video is muted. */
  roomSound: boolean;
  /** The viewer's "Solid panels" choice. The effective state also includes the automatic triggers (useGlassMode). */
  solidPanels: boolean;
  /** The first-play notice was accepted this visit (consent step before any YouTube request). */
  noticeAccepted: boolean;
  setColour(value: ColourOption): void;
  toggleColour(): void;
  toggleRoomSound(): void;
  toggleSolidPanels(): void;
  acceptNotice(): void;
}

// Colour is the default on every visit; only Monochrome is remembered.
const storedColour = (): ColourOption => (readPref('colour') === 'mono' ? 'bw' : 'colour');

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  colour: typeof window === 'undefined' ? 'colour' : storedColour(),
  solidPanels: typeof window === 'undefined' ? false : readPref('solid') === '1',
  roomSound: false,
  noticeAccepted: typeof window === 'undefined' ? false : readPref('notice') === '1',
  setColour(value) {
    writePref('colour', value === 'bw' ? 'mono' : null);
    set({ colour: value });
  },
  toggleColour: () => get().setColour(get().colour === 'colour' ? 'bw' : 'colour'),
  toggleSolidPanels() {
    const next = !get().solidPanels;
    writePref('solid', next ? '1' : null);
    set({ solidPanels: next });
  },
  toggleRoomSound: () => set((s) => ({ roomSound: !s.roomSound })),
  acceptNotice() {
    writePref('notice', '1');
    set({ noticeAccepted: true });
  },
}));
