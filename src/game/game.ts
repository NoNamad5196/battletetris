import { COUNTDOWN_LABELS, COUNTDOWN_STEP_MS, gravityForLevel } from './constants';
import { hasDangerStack } from './board';
import {
  applyPendingGarbage,
  cancelGarbage,
  createPlayer,
  finalizePlayerAfterLock,
  hardDropPlayer,
  holdPlayer,
  isSprintComplete,
  movePlayer,
  rotatePlayer,
  tickPlayerGravity
} from './player';
import type { GameMode, GameState, LockResult, PlayerId, PlayerState, Rng } from './types';

export type GameAction =
  | { type: 'start'; mode: GameMode }
  | { type: 'backToMenu' }
  | { type: 'restart' }
  | { type: 'togglePause' }
  | { type: 'move'; playerId: PlayerId; dx: -1 | 1 }
  | { type: 'softDrop'; playerId: PlayerId }
  | { type: 'rotate'; playerId: PlayerId; direction: 'cw' | 'ccw' }
  | { type: 'hardDrop'; playerId: PlayerId }
  | { type: 'hold'; playerId: PlayerId };

export function createMenuState(): GameState {
  return {
    mode: null,
    phase: 'menu',
    players: [],
    countdownIndex: 0,
    countdownElapsedMs: 0,
    elapsedMs: 0,
    winner: null,
    finishedReason: null
  };
}

export function createGameState(mode: GameMode, rng: Rng = Math.random): GameState {
  return {
    mode,
    phase: 'countdown',
    players: mode === 'battle' ? [createPlayer(1, rng), createPlayer(2, rng)] : [createPlayer(1, rng)],
    countdownIndex: 0,
    countdownElapsedMs: 0,
    elapsedMs: 0,
    winner: null,
    finishedReason: null
  };
}

export function getCountdownLabel(state: GameState): string | null {
  if (state.phase !== 'countdown') {
    return null;
  }

  return COUNTDOWN_LABELS[state.countdownIndex] ?? null;
}

export function applyGameAction(state: GameState, action: GameAction, rng: Rng = Math.random): GameState {
  if (action.type === 'start') {
    return createGameState(action.mode, rng);
  }

  if (action.type === 'backToMenu') {
    return createMenuState();
  }

  if (action.type === 'restart') {
    return state.mode ? createGameState(state.mode, rng) : createMenuState();
  }

  if (action.type === 'togglePause') {
    if (state.phase === 'playing') {
      return { ...state, phase: 'paused' };
    }

    if (state.phase === 'paused') {
      return { ...state, phase: 'playing' };
    }

    return state;
  }

  if (state.phase !== 'playing') {
    return state;
  }

  const playerIndex = state.players.findIndex((player) => player.id === action.playerId);

  if (playerIndex === -1) {
    return state;
  }

  const players = [...state.players];
  let lockResult: LockResult | null = null;

  if (action.type === 'move') {
    players[playerIndex] = movePlayer(players[playerIndex], action.dx, 0);
  }

  if (action.type === 'softDrop') {
    players[playerIndex] = movePlayer(players[playerIndex], 0, 1);
  }

  if (action.type === 'rotate') {
    players[playerIndex] = rotatePlayer(players[playerIndex], action.direction);
  }

  if (action.type === 'hold') {
    players[playerIndex] = holdPlayer(players[playerIndex], rng);
  }

  if (action.type === 'hardDrop') {
    const dropped = hardDropPlayer(players[playerIndex], rng);
    players[playerIndex] = dropped.player;
    lockResult = dropped.result;
  }

  let nextState = { ...state, players };

  if (lockResult?.locked) {
    nextState = resolveLock(nextState, playerIndex, lockResult, rng);
  }

  return finishIfNeeded(nextState);
}

export function tickGame(state: GameState, deltaMs: number, rng: Rng = Math.random): GameState {
  if (state.phase === 'countdown') {
    const countdownElapsedMs = state.countdownElapsedMs + deltaMs;

    if (countdownElapsedMs >= COUNTDOWN_STEP_MS) {
      const countdownIndex = state.countdownIndex + 1;

      if (countdownIndex >= COUNTDOWN_LABELS.length) {
        return {
          ...state,
          phase: 'playing',
          countdownIndex: 0,
          countdownElapsedMs: 0
        };
      }

      return {
        ...state,
        countdownIndex,
        countdownElapsedMs: countdownElapsedMs - COUNTDOWN_STEP_MS
      };
    }

    return { ...state, countdownElapsedMs };
  }

  if (state.phase !== 'playing') {
    return state;
  }

  let nextState: GameState = {
    ...state,
    elapsedMs: state.elapsedMs + deltaMs,
    players: [...state.players]
  };

  for (let i = 0; i < nextState.players.length; i += 1) {
    const player = nextState.players[i];
    const ticked = tickPlayerGravity(player, deltaMs, gravityForLevel(player.level), rng);
    nextState.players[i] = ticked.player;

    if (ticked.result.locked) {
      nextState = resolveLock(nextState, i, ticked.result, rng);
    }
  }

  return finishIfNeeded(nextState);
}

export function playerIsDanger(player: PlayerState): boolean {
  return hasDangerStack(player.board);
}

function resolveLock(state: GameState, playerIndex: number, result: LockResult, rng: Rng): GameState {
  const players = [...state.players];
  let player = players[playerIndex];

  if (state.mode === 'battle') {
    const canceled = cancelGarbage(player, result.attack);
    player = canceled.player;
    let attack = canceled.attack;

    if (result.linesCleared === 0) {
      player = applyPendingGarbage(player, rng);
    }

    player = finalizePlayerAfterLock(player, result, rng);
    players[playerIndex] = player;

    if (attack > 0) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponent = players[opponentIndex];
      players[opponentIndex] = {
        ...opponent,
        pendingGarbage: opponent.pendingGarbage + attack
      };
    }

    return { ...state, players };
  }

  player = finalizePlayerAfterLock(player, result, rng);
  players[playerIndex] = player;

  return { ...state, players };
}

function finishIfNeeded(state: GameState): GameState {
  if (state.phase === 'finished') {
    return state;
  }

  if (state.mode === 'battle') {
    const loser = state.players.find((player) => player.gameOver);

    if (loser) {
      const winner = loser.id === 1 ? 2 : 1;
      return {
        ...state,
        phase: 'finished',
        winner,
        finishedReason: `Player ${winner} wins`
      };
    }
  }

  if (state.mode === 'single-marathon') {
    const player = state.players[0];

    if (player?.gameOver) {
      return {
        ...state,
        phase: 'finished',
        finishedReason: 'Game over'
      };
    }
  }

  if (state.mode === 'single-sprint') {
    const player = state.players[0];

    if (player?.gameOver) {
      return {
        ...state,
        phase: 'finished',
        finishedReason: 'Game over'
      };
    }

    if (player && isSprintComplete(player)) {
      return {
        ...state,
        phase: 'finished',
        finishedReason: '40 lines cleared'
      };
    }
  }

  return state;
}
