import { create } from 'zustand';

/** Keys the dock can be asked to focus (design-spec 6.4, 6.5; v2 1.12). */
export type FocusTarget = 'power' | 'skip' | 'pause' | 'replay' | 'next' | 'guide' | 'stage';

/** v2 panels and dialogs. At most one is open at a time (the topmost wins on Escape). */
export type PanelId = 'guide' | 'picker' | 'credits' | 'keys' | 'notice';

interface UiState {
  /** Transcript dialog ("Read full text"). */
  transcriptOpen: boolean;
  /** The single polite live region's text (design-spec 9.4). */
  liveMessage: string;
  /** Request to move focus; the dock watches `nonce`. */
  focusRequest: { target: FocusTarget; nonce: number } | null;
  /** The open v2 panel, if any. */
  panel: PanelId | null;
  /** Bumped to ask the guide to focus its paste field (key V). */
  pasteNonce: number;
  openTranscript(): void;
  closeTranscript(): void;
  announce(message: string): void;
  requestFocus(target: FocusTarget): void;
  openPanel(panel: PanelId): void;
  /** Closes `panel` if it is the open one (or any panel when omitted). */
  closePanel(panel?: PanelId): void;
  openPaste(): void;
}

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
let announceFlip = false;

export const useUiStore = create<UiState>()((set) => ({
  transcriptOpen: false,
  liveMessage: '',
  focusRequest: null,
  panel: null,
  pasteNonce: 0,
  openTranscript: () => set({ transcriptOpen: true }),
  closeTranscript: () => set({ transcriptOpen: false }),
  announce(message) {
    // A trailing zero-width space makes a repeated message count as a change.
    announceFlip = !announceFlip;
    set({ liveMessage: announceFlip ? message : message + ZERO_WIDTH_SPACE });
  },
  requestFocus: (target) =>
    set((s) => ({ focusRequest: { target, nonce: (s.focusRequest?.nonce ?? 0) + 1 } })),
  openPanel: (panel) => set({ panel }),
  closePanel: (panel) => set((s) => (panel && s.panel !== panel ? s : { panel: null })),
  openPaste: () => set((s) => ({ panel: 'guide', pasteNonce: s.pasteNonce + 1 })),
}));
