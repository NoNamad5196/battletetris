import { useCallback, useEffect, useRef, useState } from 'react';
import { ARR_MS, DAS_MS, SOFT_DROP_REPEAT_MS } from '../game/constants';
import {
  DEFAULT_CONTROL_SETTINGS,
  getProfilesForMode,
  normalizeControlSettings,
  updateBinding,
  type ControlAction,
  type ControlProfileTarget,
  type ControlSettings
} from '../game/controls';
import { applyGameAction, createMenuState, tickGame, type GameAction } from '../game/game';
import type { GameMode, PlayerId } from '../game/types';

type RepeatAction = Extract<ControlAction, 'moveLeft' | 'moveRight' | 'softDrop'>;

interface HeldKey {
  playerId: PlayerId;
  action: RepeatAction;
  pressedAt: number;
  lastRepeatAt: number;
}

const STORAGE_KEY = 'battle-tetris-controls-v1';
const REPEAT_ACTIONS = new Set<ControlAction>(['moveLeft', 'moveRight', 'softDrop']);

export function useTetrisGame() {
  const [state, setState] = useState(createMenuState);
  const [controlSettings, setControlSettings] = useState(loadControlSettings);
  const heldKeys = useRef(new Map<string, HeldKey>());
  const rafId = useRef<number | null>(null);

  const dispatch = useCallback((action: GameAction) => {
    setState((current) => applyGameAction(current, action, Math.random));
  }, []);

  const changeBinding = useCallback((target: ControlProfileTarget, action: ControlAction, index: number, code: string | null) => {
    setControlSettings((current) => {
      const next = updateBinding(current, target, action, index, code);
      saveControlSettings(next);
      return next;
    });
  }, []);

  const resetControls = useCallback(() => {
    setControlSettings(DEFAULT_CONTROL_SETTINGS);
    saveControlSettings(DEFAULT_CONTROL_SETTINGS);
  }, []);

  const startMode = useCallback((mode: GameMode) => {
    heldKeys.current.clear();
    dispatch({ type: 'start', mode });
  }, [dispatch]);

  const restart = useCallback(() => {
    heldKeys.current.clear();
    dispatch({ type: 'restart' });
  }, [dispatch]);

  const backToMenu = useCallback(() => {
    heldKeys.current.clear();
    dispatch({ type: 'backToMenu' });
  }, [dispatch]);

  useEffect(() => {
    let lastTime = performance.now();

    const step = (time: number) => {
      const deltaMs = Math.min(50, time - lastTime);
      lastTime = time;

      processHeldKeys(time, heldKeys.current, dispatch);
      setState((current) => tickGame(current, deltaMs, Math.random));
      rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (state.phase !== 'playing') {
      heldKeys.current.clear();
    }
  }, [state.phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (!event.repeat) {
          dispatch({ type: 'togglePause' });
        }
        return;
      }

      const control = getControlForCode(event.code, state.mode, controlSettings);

      if (!control) {
        return;
      }

      event.preventDefault();

      if (REPEAT_ACTIONS.has(control.action)) {
        if (!heldKeys.current.has(event.code)) {
          heldKeys.current.set(event.code, {
            playerId: control.playerId,
            action: control.action as RepeatAction,
            pressedAt: performance.now(),
            lastRepeatAt: performance.now()
          });
          dispatch(toGameAction(control.playerId, control.action));
        }
        return;
      }

      if (!event.repeat) {
        dispatch(toGameAction(control.playerId, control.action));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.code);
    };

    const onBlur = () => {
      heldKeys.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [controlSettings, dispatch, state.mode]);

  return {
    state,
    controlSettings,
    changeBinding,
    resetControls,
    startMode,
    restart,
    backToMenu
  };
}

function processHeldKeys(time: number, heldKeys: Map<string, HeldKey>, dispatch: (action: GameAction) => void) {
  for (const held of heldKeys.values()) {
    if (held.action === 'softDrop') {
      if (time - held.lastRepeatAt >= SOFT_DROP_REPEAT_MS) {
        held.lastRepeatAt = time;
        dispatch(toGameAction(held.playerId, held.action));
      }
      continue;
    }

    if (time - held.pressedAt >= DAS_MS && time - held.lastRepeatAt >= ARR_MS) {
      held.lastRepeatAt = time;
      dispatch(toGameAction(held.playerId, held.action));
    }
  }
}

function getControlForCode(code: string, mode: GameMode | null, settings: ControlSettings): { playerId: PlayerId; action: ControlAction } | null {
  for (const { playerId, profile } of getProfilesForMode(settings, mode)) {
    for (const [action, bindings] of Object.entries(profile) as Array<[ControlAction, string[]]>) {
      if (bindings.includes(code)) {
        return { playerId, action };
      }
    }
  }

  return null;
}

function toGameAction(playerId: PlayerId, action: ControlAction): GameAction {
  if (action === 'moveLeft') {
    return { type: 'move', playerId, dx: -1 };
  }

  if (action === 'moveRight') {
    return { type: 'move', playerId, dx: 1 };
  }

  if (action === 'softDrop') {
    return { type: 'softDrop', playerId };
  }

  if (action === 'rotateClockwise') {
    return { type: 'rotate', playerId, direction: 'cw' };
  }

  if (action === 'rotateCounterClockwise') {
    return { type: 'rotate', playerId, direction: 'ccw' };
  }

  if (action === 'hardDrop') {
    return { type: 'hardDrop', playerId };
  }

  return { type: 'hold', playerId };
}

function loadControlSettings(): ControlSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeControlSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeControlSettings(null);
  }
}

function saveControlSettings(settings: ControlSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
