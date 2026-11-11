/** Whether the room sound should be audible right now (V2-FR-37). Pure, used by the engine and tests. */
export function roomSoundAudible(input: {
  on: boolean;
  calm: boolean;
  videoPlaying: boolean;
  videoMuted: boolean;
}): boolean {
  return input.on && !input.calm && (!input.videoPlaying || input.videoMuted);
}
