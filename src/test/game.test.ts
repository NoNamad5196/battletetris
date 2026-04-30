import { describe, expect, it } from 'vitest';
import { createBag } from '../game/bag';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../game/constants';
import { DEFAULT_CONTROL_SETTINGS, formatDetailedKeyCode, formatKeyCode, summarizeProfile, updateBinding } from '../game/controls';
import { createGameState, applyGameAction, tickGame } from '../game/game';
import { createEmptyBoard } from '../game/board';
import { calculateScore } from '../game/scoring';
import { createPlayer, holdPlayer, lockCurrentPiece, rotatePlayer, withBoard } from '../game/player';
import type { Board, Piece, PlayerState } from '../game/types';

describe('7-bag randomizer', () => {
  it('contains each tetromino exactly once in a bag', () => {
    const bag = createBag(() => 0.42);

    expect(bag).toHaveLength(7);
    expect([...bag].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });
});

describe('SRS rotation', () => {
  it('uses wall kick tests when a direct rotation is blocked', () => {
    const board = createEmptyBoard();
    board[0][4] = 'G';
    const player = createTestPlayer({
      board,
      active: { kind: 'T', rotation: 0, x: 3, y: 0 }
    });

    const rotated = rotatePlayer(player);

    expect(rotated.active).toMatchObject({ kind: 'T', rotation: 1, x: 2, y: 0 });
  });

  it('supports counter-clockwise rotation', () => {
    const player = createTestPlayer({
      active: { kind: 'T', rotation: 0, x: 3, y: 0 }
    });

    const rotated = rotatePlayer(player, 'ccw');

    expect(rotated.active).toMatchObject({ kind: 'T', rotation: 3, x: 3, y: 0 });
  });
});

describe('control settings', () => {
  it('uses arrow-first single player defaults with Z/X/C aliases', () => {
    expect(DEFAULT_CONTROL_SETTINGS.single.moveLeft).toEqual(['ArrowLeft']);
    expect(DEFAULT_CONTROL_SETTINGS.single.rotateClockwise).toEqual(['ArrowUp', 'KeyZ']);
    expect(DEFAULT_CONTROL_SETTINGS.single.rotateCounterClockwise).toEqual(['ControlLeft', 'ControlRight', 'KeyX']);
    expect(DEFAULT_CONTROL_SETTINGS.single.hardDrop).toEqual(['Space']);
    expect(DEFAULT_CONTROL_SETTINGS.single.hold).toEqual(['ShiftLeft', 'ShiftRight', 'KeyC']);
  });

  it('rebinds keys and removes duplicates within the same profile', () => {
    const updated = updateBinding(
      DEFAULT_CONTROL_SETTINGS,
      { mode: 'single', playerId: 1 },
      'hold',
      0,
      'ArrowLeft'
    );

    expect(updated.single.hold).toContain('ArrowLeft');
    expect(updated.single.moveLeft).not.toContain('ArrowLeft');
  });

  it('formats control codes for display', () => {
    expect(formatKeyCode('ArrowUp')).toBe('Up');
    expect(formatKeyCode('KeyZ')).toBe('Z');
    expect(formatKeyCode('ControlLeft')).toBe('Ctrl');
    expect(formatDetailedKeyCode('ControlLeft')).toBe('L Ctrl');
    expect(summarizeProfile(DEFAULT_CONTROL_SETTINGS.single)).toContain('Ctrl/X 반시계');
    expect(summarizeProfile(DEFAULT_CONTROL_SETTINGS.single)).toContain('Shift/C 홀드');
  });
});

describe('hold', () => {
  it('allows hold once per active piece', () => {
    const player = createPlayer(1, () => 0);

    const held = holdPlayer(player, () => 0);
    const secondHold = holdPlayer(held, () => 0);

    expect(held.hold).toBe(player.active?.kind);
    expect(held.canHold).toBe(false);
    expect(secondHold).toBe(held);
  });
});

describe('scoring', () => {
  it('scores line clears, back-to-back, combo, T-Spin, and perfect clear bonuses', () => {
    expect(
      calculateScore({
        linesCleared: 4,
        tSpin: 'none',
        previousCombo: -1,
        previousBackToBack: false,
        perfectClear: false
      })
    ).toMatchObject({ points: 800, combo: 0, backToBack: true, attack: 3 });

    expect(
      calculateScore({
        linesCleared: 4,
        tSpin: 'none',
        previousCombo: 0,
        previousBackToBack: true,
        perfectClear: false
      })
    ).toMatchObject({ points: 1250, combo: 1, backToBack: true, attack: 3 });

    expect(
      calculateScore({
        linesCleared: 2,
        tSpin: 'full',
        previousCombo: -1,
        previousBackToBack: false,
        perfectClear: true
      })
    ).toMatchObject({ points: 4100, attack: 11 });
  });

  it('updates score and level after a lock line clear', () => {
    const board = createEmptyBoard();
    board[BOARD_HEIGHT - 1] = filledRow(4);
    const active: Piece = { kind: 'I', rotation: 1, x: 2, y: BOARD_HEIGHT - 4 };
    const player = createTestPlayer({ board, active });

    const locked = lockCurrentPiece(player);

    expect(locked.result.linesCleared).toBe(1);
    expect(locked.player.score).toBe(100);
    expect(locked.player.lines).toBe(1);
    expect(locked.player.level).toBe(1);
  });
});

describe('battle garbage', () => {
  it('cancels pending garbage with outgoing attack before sending to the opponent', () => {
    const state = createGameState('battle', () => 0);
    const board = createEmptyBoard();
    board[BOARD_HEIGHT - 1] = filledRow(4);
    board[BOARD_HEIGHT - 2] = filledRow(4);
    const active: Piece = { kind: 'I', rotation: 1, x: 2, y: BOARD_HEIGHT - 4 };
    const playerOne = createTestPlayer({
      ...state.players[0],
      board,
      active,
      pendingGarbage: 1
    });

    const nextState = applyGameAction(
      {
        ...state,
        phase: 'playing',
        players: [playerOne, state.players[1]]
      },
      { type: 'hardDrop', playerId: 1 },
      () => 0
    );

    expect(nextState.players[0].pendingGarbage).toBe(0);
    expect(nextState.players[1].pendingGarbage).toBe(0);
  });
});

describe('single modes', () => {
  it('finishes sprint mode at 40 lines', () => {
    const state = createGameState('single-sprint', () => 0);
    const nextState = tickGame(
      {
        ...state,
        phase: 'playing',
        players: [{ ...state.players[0], lines: 40 }]
      },
      0,
      () => 0
    );

    expect(nextState.phase).toBe('finished');
    expect(nextState.finishedReason).toBe('40 lines cleared');
  });

  it('finishes marathon mode on top-out', () => {
    const state = createGameState('single-marathon', () => 0);
    const nextState = tickGame(
      {
        ...state,
        phase: 'playing',
        players: [{ ...state.players[0], gameOver: true }]
      },
      0,
      () => 0
    );

    expect(nextState.phase).toBe('finished');
    expect(nextState.finishedReason).toBe('Game over');
  });
});

function createTestPlayer(overrides: Partial<PlayerState> & { active?: Piece | null; board?: Board } = {}): PlayerState {
  const player = createPlayer(1, () => 0);
  return {
    ...withBoard(player, overrides.board ?? createEmptyBoard()),
    ...overrides,
    queue: overrides.queue ?? ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  };
}

function filledRow(holeX?: number) {
  return Array.from({ length: BOARD_WIDTH }, (_, index) => (index === holeX ? null : 'G'));
}
