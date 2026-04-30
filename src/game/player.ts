import {
  BOARD_WIDTH,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  PREVIEW_COUNT,
  SPRINT_TARGET_LINES
} from './constants';
import { addGarbageRows, clearFullLines, cloneBoard, createEmptyBoard, isPerfectClear, isValidPiece, mergePiece } from './board';
import { ensureQueue } from './bag';
import { calculateScore } from './scoring';
import { getKickTests, getPieceCells, rotateClockwise, rotateCounterClockwise } from './tetrominoes';
import type { Board, LockResult, Piece, PlayerId, PlayerState, Rng, TSpinKind, TetrominoKind } from './types';

export const EMPTY_LOCK_RESULT: LockResult = {
  locked: false,
  linesCleared: 0,
  attack: 0,
  perfectClear: false,
  tSpin: 'none'
};

export function createPiece(kind: TetrominoKind): Piece {
  return {
    kind,
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2) - 2,
    y: 0
  };
}

export function createPlayer(id: PlayerId, rng: Rng = Math.random): PlayerState {
  const queue = ensureQueue([], rng);
  const [first, ...rest] = queue;
  const active = createPiece(first);
  const board = createEmptyBoard();

  return {
    id,
    board,
    active: isValidPiece(board, active) ? active : null,
    hold: null,
    canHold: true,
    queue: ensureQueue(rest, rng),
    score: 0,
    level: 1,
    lines: 0,
    combo: -1,
    backToBack: false,
    pendingGarbage: 0,
    gameOver: false,
    lastMoveWasRotate: false,
    lockElapsedMs: 0,
    lockResets: 0,
    gravityElapsedMs: 0
  };
}

export function getPreviewQueue(player: PlayerState): TetrominoKind[] {
  return player.queue.slice(0, PREVIEW_COUNT);
}

export function spawnNextPiece(player: PlayerState, rng: Rng = Math.random): PlayerState {
  const queue = ensureQueue(player.queue, rng);
  const [nextKind, ...rest] = queue;
  const active = createPiece(nextKind);
  const gameOver = !isValidPiece(player.board, active);

  return {
    ...player,
    active: gameOver ? null : active,
    queue: ensureQueue(rest, rng),
    canHold: true,
    gameOver,
    lastMoveWasRotate: false,
    lockElapsedMs: 0,
    lockResets: 0,
    gravityElapsedMs: 0
  };
}

export function movePlayer(player: PlayerState, dx: number, dy: number): PlayerState {
  if (!player.active || player.gameOver) {
    return player;
  }

  const moved = { ...player.active, x: player.active.x + dx, y: player.active.y + dy };

  if (!isValidPiece(player.board, moved)) {
    return player;
  }

  return applySuccessfulMotion(player, moved, false);
}

export function rotatePlayer(player: PlayerState, direction: 'cw' | 'ccw' = 'cw'): PlayerState {
  if (!player.active || player.gameOver) {
    return player;
  }

  const from = player.active.rotation;
  const to = direction === 'cw' ? rotateClockwise(from) : rotateCounterClockwise(from);

  for (const kick of getKickTests(player.active.kind, from, to)) {
    const rotated = {
      ...player.active,
      rotation: to,
      x: player.active.x + kick.x,
      y: player.active.y + kick.y
    };

    if (isValidPiece(player.board, rotated)) {
      return applySuccessfulMotion(player, rotated, true);
    }
  }

  return player;
}

export function hardDropPlayer(player: PlayerState, rng: Rng = Math.random): { player: PlayerState; result: LockResult } {
  if (!player.active || player.gameOver) {
    return { player, result: EMPTY_LOCK_RESULT };
  }

  let dropped = { ...player.active };

  while (isValidPiece(player.board, { ...dropped, y: dropped.y + 1 })) {
    dropped = { ...dropped, y: dropped.y + 1 };
  }

  return lockCurrentPiece({ ...player, active: dropped }, rng);
}

export function holdPlayer(player: PlayerState, rng: Rng = Math.random): PlayerState {
  if (!player.active || player.gameOver || !player.canHold) {
    return player;
  }

  const currentKind = player.active.kind;

  if (!player.hold) {
    const next = spawnNextPiece(
      {
        ...player,
        hold: currentKind,
        active: null,
        canHold: false
      },
      rng
    );

    return {
      ...next,
      canHold: false
    };
  }

  const swapped = createPiece(player.hold);
  const gameOver = !isValidPiece(player.board, swapped);

  return {
    ...player,
    active: gameOver ? null : swapped,
    hold: currentKind,
    canHold: false,
    gameOver,
    lastMoveWasRotate: false,
    lockElapsedMs: 0,
    lockResets: 0,
    gravityElapsedMs: 0
  };
}

export function tickPlayerGravity(player: PlayerState, deltaMs: number, gravityMs: number, rng: Rng = Math.random): { player: PlayerState; result: LockResult } {
  if (!player.active || player.gameOver) {
    return { player, result: EMPTY_LOCK_RESULT };
  }

  const grounded = !isValidPiece(player.board, { ...player.active, y: player.active.y + 1 });

  if (grounded) {
    const lockElapsedMs = player.lockElapsedMs + deltaMs;

    if (lockElapsedMs >= LOCK_DELAY_MS) {
      return lockCurrentPiece({ ...player, lockElapsedMs }, rng);
    }

    return { player: { ...player, lockElapsedMs }, result: EMPTY_LOCK_RESULT };
  }

  let active = player.active;
  let gravityElapsedMs = player.gravityElapsedMs + deltaMs;

  while (gravityElapsedMs >= gravityMs && isValidPiece(player.board, { ...active, y: active.y + 1 })) {
    active = { ...active, y: active.y + 1 };
    gravityElapsedMs -= gravityMs;
  }

  return {
    player: {
      ...player,
      active,
      gravityElapsedMs,
      lockElapsedMs: 0,
      lockResets: 0,
      lastMoveWasRotate: false
    },
    result: EMPTY_LOCK_RESULT
  };
}

export function lockCurrentPiece(player: PlayerState, _rng: Rng = Math.random): { player: PlayerState; result: LockResult } {
  if (!player.active) {
    return { player, result: EMPTY_LOCK_RESULT };
  }

  const active = player.active;
  const placedAboveBoard = getPieceCells(active).some((cell) => cell.y < 0);
  const merged = mergePiece(player.board, active);
  const tSpin = detectTSpin(merged, active, player.lastMoveWasRotate);
  const cleared = clearFullLines(merged);
  const perfectClear = cleared.linesCleared > 0 && isPerfectClear(cleared.board);
  const score = calculateScore({
    linesCleared: cleared.linesCleared,
    tSpin,
    previousCombo: player.combo,
    previousBackToBack: player.backToBack,
    perfectClear
  });
  const totalLines = player.lines + cleared.linesCleared;

  return {
    player: {
      ...player,
      board: cleared.board,
      active: null,
      score: player.score + score.points,
      lines: totalLines,
      level: Math.floor(totalLines / 10) + 1,
      combo: score.combo,
      backToBack: score.backToBack,
      gameOver: player.gameOver || placedAboveBoard,
      lastMoveWasRotate: false,
      lockElapsedMs: 0,
      lockResets: 0,
      gravityElapsedMs: 0
    },
    result: {
      locked: true,
      linesCleared: cleared.linesCleared,
      attack: score.attack,
      perfectClear,
      tSpin
    }
  };
}

export function finalizePlayerAfterLock(player: PlayerState, result: LockResult, rng: Rng = Math.random): PlayerState {
  if (!result.locked || player.gameOver) {
    return player;
  }

  return spawnNextPiece(player, rng);
}

export function applyPendingGarbage(player: PlayerState, rng: Rng = Math.random): PlayerState {
  if (player.pendingGarbage <= 0) {
    return player;
  }

  const garbage = addGarbageRows(player.board, player.pendingGarbage, rng);

  return {
    ...player,
    board: garbage.board,
    pendingGarbage: 0,
    gameOver: player.gameOver || garbage.toppedOut
  };
}

export function cancelGarbage(player: PlayerState, attack: number): { player: PlayerState; attack: number } {
  if (attack <= 0 || player.pendingGarbage <= 0) {
    return { player, attack };
  }

  const canceled = Math.min(attack, player.pendingGarbage);

  return {
    player: {
      ...player,
      pendingGarbage: player.pendingGarbage - canceled
    },
    attack: attack - canceled
  };
}

export function withBoard(player: PlayerState, board: Board): PlayerState {
  return {
    ...player,
    board: cloneBoard(board)
  };
}

export function isSprintComplete(player: PlayerState): boolean {
  return player.lines >= SPRINT_TARGET_LINES;
}

function applySuccessfulMotion(player: PlayerState, active: Piece, rotated: boolean): PlayerState {
  const grounded = !isValidPiece(player.board, { ...active, y: active.y + 1 });
  const canReset = grounded && player.lockResets < MAX_LOCK_RESETS;

  return {
    ...player,
    active,
    lastMoveWasRotate: rotated,
    lockElapsedMs: canReset ? 0 : player.lockElapsedMs,
    lockResets: canReset ? player.lockResets + 1 : player.lockResets
  };
}

function detectTSpin(board: Board, piece: Piece, lastMoveWasRotate: boolean): TSpinKind {
  if (piece.kind !== 'T' || !lastMoveWasRotate) {
    return 'none';
  }

  const center = { x: piece.x + 1, y: piece.y + 1 };
  const corners = [
    { x: center.x - 1, y: center.y - 1 },
    { x: center.x + 1, y: center.y - 1 },
    { x: center.x - 1, y: center.y + 1 },
    { x: center.x + 1, y: center.y + 1 }
  ];
  const blockedCorners = corners.filter((corner) => isCornerBlocked(board, corner)).length;

  if (blockedCorners < 3) {
    return 'none';
  }

  const frontCorners = getFrontCorners(center, piece.rotation);
  const blockedFrontCorners = frontCorners.filter((corner) => isCornerBlocked(board, corner)).length;

  return blockedFrontCorners >= 2 ? 'full' : 'mini';
}

function getFrontCorners(center: { x: number; y: number }, rotation: Piece['rotation']): { x: number; y: number }[] {
  if (rotation === 0) {
    return [
      { x: center.x - 1, y: center.y - 1 },
      { x: center.x + 1, y: center.y - 1 }
    ];
  }

  if (rotation === 1) {
    return [
      { x: center.x + 1, y: center.y - 1 },
      { x: center.x + 1, y: center.y + 1 }
    ];
  }

  if (rotation === 2) {
    return [
      { x: center.x - 1, y: center.y + 1 },
      { x: center.x + 1, y: center.y + 1 }
    ];
  }

  return [
    { x: center.x - 1, y: center.y - 1 },
    { x: center.x - 1, y: center.y + 1 }
  ];
}

function isCornerBlocked(board: Board, point: { x: number; y: number }): boolean {
  if (point.x < 0 || point.x >= BOARD_WIDTH || point.y < 0 || point.y >= board.length) {
    return true;
  }

  return board[point.y][point.x] !== null;
}
