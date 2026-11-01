export const HOW_TO_PLAY_KEY = 'silhoudex:v1:seen-how-to-play';

/** True once the player has closed the how-to-play card. If storage is blocked, it shows each visit. */
export function hasSeenHowToPlay(): boolean {
  try {
    return localStorage.getItem(HOW_TO_PLAY_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHowToPlaySeen(): void {
  try {
    localStorage.setItem(HOW_TO_PLAY_KEY, '1');
  } catch {
    // Without storage the card simply shows again next time.
  }
}
