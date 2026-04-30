import { LINE_SCORES, PERFECT_CLEAR_SCORE } from './constants';
import type { TSpinKind } from './types';

export interface ScoreInput {
  linesCleared: number;
  tSpin: TSpinKind;
  previousCombo: number;
  previousBackToBack: boolean;
  perfectClear: boolean;
}

export interface ScoreResult {
  points: number;
  combo: number;
  backToBack: boolean;
  attack: number;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const { linesCleared, tSpin, previousCombo, previousBackToBack, perfectClear } = input;
  const cleared = linesCleared > 0;
  const b2bEligible = linesCleared === 4 || (tSpin !== 'none' && cleared);
  const combo = cleared ? previousCombo + 1 : -1;
  let points = LINE_SCORES[linesCleared] ?? 0;

  if (tSpin === 'full' && cleared) {
    points *= 2;
  }

  if (tSpin === 'mini' && cleared) {
    points *= 0.5;
  }

  if (b2bEligible && previousBackToBack) {
    points *= 1.5;
  }

  if (cleared && combo > 0) {
    points += combo * 50;
  }

  if (perfectClear) {
    points += PERFECT_CLEAR_SCORE;
  }

  let attack = linesCleared >= 2 ? linesCleared - 1 : 0;

  if (perfectClear) {
    attack += 10;
  }

  return {
    points: Math.floor(points),
    combo,
    backToBack: b2bEligible ? true : cleared ? false : previousBackToBack,
    attack
  };
}
