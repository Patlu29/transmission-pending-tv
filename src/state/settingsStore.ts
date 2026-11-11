import { create } from 'zustand';
import { readPref, writePref } from './sessionPrefs.ts';

/**
 * v2 viewer options (visit only). `colour` is the Colour/B&W room option (default B&W): it drives one
 * CSS greyscale filter on the canvas element and, in the TV room, the warm tint. Use `isColourActive`
 * (src/state/derived.ts) for what the room should actually show.
 */
export type ColourOption = 'bw' | 'colour';

interface SettingsState {
  colour: ColourOption;
  /** Optional synthesised room sound (V2-FR-37). Off by default; audible only while the video is muted. */
  roomSound: boolean;
  /** The first-play notice was accepted this visit (consent step before any YouTube request). */
  noticeAccepted: boolean;
  setColour(value: ColourOption): void;
  toggleColour(): void;
  toggleRoomSound(): void;
  acceptNotice(): void;
}

const storedColour = (): ColourOption => (readPref('colour') === 'colour' ? 'colour' : 'bw');

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  colour: typeof window === 'undefined' ? 'bw' : storedColour(),
  roomSound: false,
  noticeAccepted: typeof window === 'undefined' ? false : readPref('notice') === '1',
  setColour(value) {
    writePref('colour', value === 'colour' ? 'colour' : null);
    set({ colour: value });
  },
  toggleColour: () => get().setColour(get().colour === 'colour' ? 'bw' : 'colour'),
  toggleRoomSound: () => set((s) => ({ roomSound: !s.roomSound })),
  acceptNotice() {
    writePref('notice', '1');
    set({ noticeAccepted: true });
  },
}));
