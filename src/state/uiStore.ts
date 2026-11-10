import { create } from 'zustand';

/** Keys the dock can be asked to focus (design-spec 6.4, 6.5). */
export type FocusTarget = 'power' | 'skip' | 'pause' | 'replay' | 'next';

interface UiState {
  /** Transcript dialog ("Read full text"). */
  transcriptOpen: boolean;
  /** The single polite live region's text (design-spec 9.4). */
  liveMessage: string;
  /** Request to move focus; the dock watches `nonce`. */
  focusRequest: { target: FocusTarget; nonce: number } | null;
  openTranscript(): void;
  closeTranscript(): void;
  announce(message: string): void;
  requestFocus(target: FocusTarget): void;
}

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
let announceFlip = false;

export const useUiStore = create<UiState>()((set) => ({
  transcriptOpen: false,
  liveMessage: '',
  focusRequest: null,
  openTranscript: () => set({ transcriptOpen: true }),
  closeTranscript: () => set({ transcriptOpen: false }),
  announce(message) {
    // A trailing zero-width space makes a repeated message count as a change.
    announceFlip = !announceFlip;
    set({ liveMessage: announceFlip ? message : message + ZERO_WIDTH_SPACE });
  },
  requestFocus: (target) =>
    set((s) => ({ focusRequest: { target, nonce: (s.focusRequest?.nonce ?? 0) + 1 } })),
}));
