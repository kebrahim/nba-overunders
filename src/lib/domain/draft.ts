// Snake draft math shared between the draft board UI and the
// /api/draft/pick route. Picks are 1-indexed overall (pick_number in the
// draft_picks table); draft_sessions.current_pick_index is 0-indexed and
// counts how many picks have been made so far.

export const PLAYER_COUNT = 5;
export const TOTAL_ROUNDS = 6;
export const TOTAL_PICKS = PLAYER_COUNT * TOTAL_ROUNDS;

/** 1-indexed round number for a given 1-indexed overall pick number. */
export function roundForPick(pickNumber: number, playerCount = PLAYER_COUNT): number {
  return Math.ceil(pickNumber / playerCount);
}

/** Index into the snake_order array of the player who owns this pick. */
export function playerIndexForPick(pickNumber: number, playerCount = PLAYER_COUNT): number {
  const round = roundForPick(pickNumber, playerCount);
  const positionInRound = (pickNumber - 1) % playerCount;
  const roundIsOdd = round % 2 === 1;
  return roundIsOdd ? positionInRound : playerCount - 1 - positionInRound;
}

/** The user id on the clock, given the session's snake order and progress. */
export function userIdOnTheClock(
  snakeOrder: string[],
  currentPickIndex: number,
): string | null {
  if (currentPickIndex >= snakeOrder.length * TOTAL_ROUNDS) return null;
  const pickNumber = currentPickIndex + 1;
  const playerIndex = playerIndexForPick(pickNumber, snakeOrder.length);
  return snakeOrder[playerIndex] ?? null;
}

export function isDraftComplete(currentPickIndex: number, playerCount = PLAYER_COUNT): boolean {
  return currentPickIndex >= playerCount * TOTAL_ROUNDS;
}

/** Fisher-Yates shuffle for generating a random snake order at draft start. */
export function shuffledOrder<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
