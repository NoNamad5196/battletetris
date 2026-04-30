import { TETROMINO_KINDS } from './constants';
import type { Rng, TetrominoKind } from './types';

export function createBag(rng: Rng = Math.random): TetrominoKind[] {
  const bag = [...TETROMINO_KINDS];

  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  return bag;
}

export function ensureQueue(queue: TetrominoKind[], rng: Rng = Math.random): TetrominoKind[] {
  const next = [...queue];

  while (next.length < 7) {
    next.push(...createBag(rng));
  }

  return next;
}
