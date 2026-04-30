import { BOARD_HEIGHT, BOARD_WIDTH } from './constants';
import type { Board, BoardCell, CellKind, Piece, Point, RenderBoard, Rng } from './types';
import { getPieceCells } from './tetrominoes';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<BoardCell>(BOARD_WIDTH).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isInsideBoard(point: Point): boolean {
  return point.x >= 0 && point.x < BOARD_WIDTH && point.y < BOARD_HEIGHT;
}

export function isBlocked(board: Board, point: Point): boolean {
  if (point.y < 0) {
    return false;
  }

  if (!isInsideBoard(point)) {
    return true;
  }

  return board[point.y][point.x] !== null;
}

export function isValidPiece(board: Board, piece: Piece): boolean {
  return getPieceCells(piece).every((cell) => !isBlocked(board, cell));
}

export function mergePiece(board: Board, piece: Piece): Board {
  const next = cloneBoard(board);

  for (const cell of getPieceCells(piece)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
      next[cell.y][cell.x] = piece.kind;
    }
  }

  return next;
}

export function clearFullLines(board: Board): { board: Board; linesCleared: number } {
  const remainingRows = board.filter((row) => !row.every(Boolean));
  const linesCleared = BOARD_HEIGHT - remainingRows.length;
  const emptyRows = Array.from({ length: linesCleared }, () => Array<BoardCell>(BOARD_WIDTH).fill(null));

  return {
    board: [...emptyRows, ...remainingRows],
    linesCleared
  };
}

export function isPerfectClear(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell === null));
}

export function getGhostPiece(board: Board, piece: Piece): Piece {
  let ghost = { ...piece };

  while (isValidPiece(board, { ...ghost, y: ghost.y + 1 })) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }

  return ghost;
}

export function buildRenderBoard(board: Board, active: Piece | null): RenderBoard {
  const render: RenderBoard = board.map((row) => row.map((kind) => (kind ? { kind } : null)));

  if (!active) {
    return render;
  }

  const ghost = getGhostPiece(board, active);

  for (const cell of getPieceCells(ghost)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH && !render[cell.y][cell.x]) {
      render[cell.y][cell.x] = { kind: active.kind, ghost: true };
    }
  }

  for (const cell of getPieceCells(active)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT && cell.x >= 0 && cell.x < BOARD_WIDTH) {
      render[cell.y][cell.x] = { kind: active.kind, active: true };
    }
  }

  return render;
}

export function addGarbageRows(board: Board, lines: number, rng: Rng = Math.random): { board: Board; toppedOut: boolean } {
  if (lines <= 0) {
    return { board, toppedOut: false };
  }

  const next = cloneBoard(board);
  const removed = next.splice(0, lines);
  const toppedOut = removed.some((row) => row.some(Boolean));

  for (let i = 0; i < lines; i += 1) {
    const hole = Math.floor(rng() * BOARD_WIDTH);
    next.push(
      Array.from({ length: BOARD_WIDTH }, (_, index): CellKind | null => (index === hole ? null : 'G'))
    );
  }

  return { board: next, toppedOut };
}

export function hasDangerStack(board: Board): boolean {
  return board.slice(0, 5).some((row) => row.some(Boolean));
}
