import type { GameMode, PlayerId } from './types';

export type ControlAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'hardDrop'
  | 'hold';

export type ControlProfile = Record<ControlAction, string[]>;

export interface ControlSettings {
  single: ControlProfile;
  battle: Record<PlayerId, ControlProfile>;
}

export interface ControlProfileTarget {
  mode: 'single' | 'battle';
  playerId: PlayerId;
}

export const CONTROL_ACTIONS: ControlAction[] = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'rotateClockwise',
  'rotateCounterClockwise',
  'hardDrop',
  'hold'
];

export const ACTION_LABELS: Record<ControlAction, string> = {
  moveLeft: '왼쪽 이동',
  moveRight: '오른쪽 이동',
  softDrop: '소프트 드롭',
  rotateClockwise: '시계 회전',
  rotateCounterClockwise: '반시계 회전',
  hardDrop: '하드 드롭',
  hold: '홀드'
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  single: {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    rotateClockwise: ['ArrowUp', 'KeyZ'],
    rotateCounterClockwise: ['ControlLeft', 'ControlRight', 'KeyX'],
    hardDrop: ['Space'],
    hold: ['ShiftLeft', 'ShiftRight', 'KeyC']
  },
  battle: {
    1: {
      moveLeft: ['KeyA'],
      moveRight: ['KeyD'],
      softDrop: ['KeyS'],
      rotateClockwise: ['KeyW'],
      rotateCounterClockwise: ['KeyE'],
      hardDrop: ['Space'],
      hold: ['KeyQ']
    },
    2: {
      moveLeft: ['ArrowLeft'],
      moveRight: ['ArrowRight'],
      softDrop: ['ArrowDown'],
      rotateClockwise: ['ArrowUp'],
      rotateCounterClockwise: ['ControlRight'],
      hardDrop: ['Enter'],
      hold: ['KeyR']
    }
  }
};

export const MAX_KEYS_PER_ACTION = 3;

export function getProfilesForMode(settings: ControlSettings, mode: GameMode | null): Array<{ playerId: PlayerId; profile: ControlProfile }> {
  if (mode === 'battle') {
    return [
      { playerId: 1, profile: settings.battle[1] },
      { playerId: 2, profile: settings.battle[2] }
    ];
  }

  if (mode === 'single-marathon' || mode === 'single-sprint') {
    return [{ playerId: 1, profile: settings.single }];
  }

  return [];
}

export function getProfile(settings: ControlSettings, target: ControlProfileTarget): ControlProfile {
  return target.mode === 'single' ? settings.single : settings.battle[target.playerId];
}

export function updateBinding(
  settings: ControlSettings,
  target: ControlProfileTarget,
  action: ControlAction,
  index: number,
  code: string | null
): ControlSettings {
  const next = cloneControlSettings(settings);
  const profile = getMutableProfile(next, target);

  if (!code) {
    if (profile[action].length <= 1) {
      return next;
    }

    profile[action] = profile[action].filter((_, existingIndex) => existingIndex !== index);
    return next;
  }

  for (const actionName of CONTROL_ACTIONS) {
    profile[actionName] = profile[actionName].filter((existingCode) => existingCode !== code);
  }

  const current = profile[action].slice(0, MAX_KEYS_PER_ACTION);
  current[index] = code;
  profile[action] = compactBindings(current).slice(0, MAX_KEYS_PER_ACTION);

  return next;
}

export function normalizeControlSettings(value: unknown): ControlSettings {
  if (!isRecord(value)) {
    return cloneControlSettings(DEFAULT_CONTROL_SETTINGS);
  }

  return {
    single: normalizeProfile(value.single, DEFAULT_CONTROL_SETTINGS.single),
    battle: {
      1: normalizeProfile(isRecord(value.battle) ? value.battle[1] : undefined, DEFAULT_CONTROL_SETTINGS.battle[1]),
      2: normalizeProfile(isRecord(value.battle) ? value.battle[2] : undefined, DEFAULT_CONTROL_SETTINGS.battle[2])
    }
  };
}

export function cloneControlSettings(settings: ControlSettings): ControlSettings {
  return {
    single: cloneProfile(settings.single),
    battle: {
      1: cloneProfile(settings.battle[1]),
      2: cloneProfile(settings.battle[2])
    }
  };
}

export function formatKeyCode(code: string): string {
  if (code === 'Space') {
    return 'Space';
  }

  if (code === 'Enter') {
    return 'Enter';
  }

  if (code === 'Escape') {
    return 'Esc';
  }

  if (code.startsWith('Arrow')) {
    return code.replace('Arrow', '');
  }

  if (code.startsWith('Key')) {
    return code.replace('Key', '');
  }

  if (code.startsWith('Digit')) {
    return code.replace('Digit', '');
  }

  if (code === 'ShiftLeft' || code === 'ShiftRight') {
    return 'Shift';
  }

  if (code === 'ControlLeft' || code === 'ControlRight') {
    return 'Ctrl';
  }

  if (code === 'AltLeft' || code === 'AltRight') {
    return 'Alt';
  }

  return code.replace(/Left$|Right$/, '');
}

export function formatDetailedKeyCode(code: string): string {
  if (code === 'ShiftLeft') {
    return 'L Shift';
  }

  if (code === 'ShiftRight') {
    return 'R Shift';
  }

  if (code === 'ControlLeft') {
    return 'L Ctrl';
  }

  if (code === 'ControlRight') {
    return 'R Ctrl';
  }

  if (code === 'AltLeft') {
    return 'L Alt';
  }

  if (code === 'AltRight') {
    return 'R Alt';
  }

  return formatKeyCode(code);
}

export function summarizeProfile(profile: ControlProfile): string {
  return [
    `${formatKeyCode(profile.moveLeft[0])}/${formatKeyCode(profile.moveRight[0])} 이동`,
    `${formatCompactBindings(profile.rotateClockwise)} 시계`,
    `${formatCompactBindings(profile.rotateCounterClockwise)} 반시계`,
    `${formatCompactBindings(profile.hardDrop)} 하드드롭`,
    `${formatCompactBindings(profile.hold)} 홀드`
  ].join(' | ');
}

function getMutableProfile(settings: ControlSettings, target: ControlProfileTarget): ControlProfile {
  return target.mode === 'single' ? settings.single : settings.battle[target.playerId];
}

function normalizeProfile(value: unknown, fallback: ControlProfile): ControlProfile {
  const source = isRecord(value) ? value : {};

  return CONTROL_ACTIONS.reduce((profile, action) => {
    const bindings = Array.isArray(source[action])
      ? source[action].filter((code): code is string => typeof code === 'string')
      : fallback[action];

    profile[action] = compactBindings(bindings).slice(0, MAX_KEYS_PER_ACTION);

    if (profile[action].length === 0) {
      profile[action] = [...fallback[action]];
    }

    return profile;
  }, {} as ControlProfile);
}

function cloneProfile(profile: ControlProfile): ControlProfile {
  return CONTROL_ACTIONS.reduce((next, action) => {
    next[action] = [...profile[action]];
    return next;
  }, {} as ControlProfile);
}

function compactBindings(bindings: string[]): string[] {
  return [...new Set(bindings.filter(Boolean))];
}

function formatCompactBindings(bindings: string[]): string {
  return [...new Set(bindings.map(formatKeyCode))].join('/');
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}
