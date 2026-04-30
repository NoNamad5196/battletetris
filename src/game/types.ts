export type GameMode = 'single-marathon' | 'single-sprint' | 'battle';

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'paused' | 'finished';

export type TetrominoKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Rotation = 0 | 1 | 2 | 3;

export type CellKind = TetrominoKind | 'G';

export type BoardCell = CellKind | null;

export type Board = BoardCell[][];

export type PlayerId = 1 | 2;

export interface Point {
  x: number;
  y: number;
}

export interface Piece {
  kind: TetrominoKind;
  rotation: Rotation;
  x: number;
  y: number;
}

export type TSpinKind = 'none' | 'mini' | 'full';

export interface PlayerState {
  id: PlayerId;
  board: Board;
  active: Piece | null;
  hold: TetrominoKind | null;
  canHold: boolean;
  queue: TetrominoKind[];
  score: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
  pendingGarbage: number;
  gameOver: boolean;
  lastMoveWasRotate: boolean;
  lockElapsedMs: number;
  lockResets: number;
  gravityElapsedMs: number;
}

export interface LockResult {
  locked: boolean;
  linesCleared: number;
  attack: number;
  perfectClear: boolean;
  tSpin: TSpinKind;
}

export interface GameState {
  mode: GameMode | null;
  phase: GamePhase;
  players: PlayerState[];
  countdownIndex: number;
  countdownElapsedMs: number;
  elapsedMs: number;
  winner: PlayerId | null;
  finishedReason: string | null;
}

export interface RenderCell {
  kind: CellKind;
  ghost?: boolean;
  active?: boolean;
}

export type RenderBoard = (RenderCell | null)[][];

export type Rng = () => number;
