import type { TetrominoKind } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const PREVIEW_COUNT = 3;
export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const DAS_MS = 167;
export const ARR_MS = 33;
export const SOFT_DROP_REPEAT_MS = 35;
export const COUNTDOWN_LABELS = ['3', '2', '1', 'GO!'] as const;
export const COUNTDOWN_STEP_MS = 700;
export const SPRINT_TARGET_LINES = 40;
export const DANGER_ROW = 5;
export const PERFECT_CLEAR_SCORE = 3500;

export const TETROMINO_KINDS: TetrominoKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const LINE_SCORES: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800
};

export function gravityForLevel(level: number): number {
  return Math.max(80, 800 - (level - 1) * 55);
}
