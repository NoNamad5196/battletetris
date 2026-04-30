import { useEffect, useState } from 'react';
import {
  ACTION_LABELS,
  CONTROL_ACTIONS,
  MAX_KEYS_PER_ACTION,
  formatDetailedKeyCode,
  getProfile,
  type ControlAction,
  type ControlProfileTarget,
  type ControlSettings
} from '../game/controls';
import styles from './ControlSettingsPanel.module.css';

interface ControlSettingsPanelProps {
  settings: ControlSettings;
  onChangeBinding: (target: ControlProfileTarget, action: ControlAction, index: number, code: string | null) => void;
  onReset: () => void;
}

interface PendingBinding {
  target: ControlProfileTarget;
  action: ControlAction;
  index: number;
}

const PROFILES: Array<{ title: string; subtitle: string; target: ControlProfileTarget }> = [
  {
    title: '싱글',
    subtitle: '기본값: 방향키, Shift/C 홀드, Ctrl/X 반시계 회전',
    target: { mode: 'single', playerId: 1 }
  },
  {
    title: '대전 P1',
    subtitle: '기본값: WASD, W/E 회전, Q 홀드',
    target: { mode: 'battle', playerId: 1 }
  },
  {
    title: '대전 P2',
    subtitle: '기본값: 방향키, 오른쪽 Ctrl 반시계 회전, R 홀드',
    target: { mode: 'battle', playerId: 2 }
  }
];

export function ControlSettingsPanel({ settings, onChangeBinding, onReset }: ControlSettingsPanelProps) {
  const [pending, setPending] = useState<PendingBinding | null>(null);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.code === 'Escape') {
        setPending(null);
        return;
      }

      if (event.code === 'Backspace' || event.code === 'Delete') {
        onChangeBinding(pending.target, pending.action, pending.index, null);
        setPending(null);
        return;
      }

      onChangeBinding(pending.target, pending.action, pending.index, event.code);
      setPending(null);
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [onChangeBinding, pending]);

  return (
    <section className={styles.panel} aria-label="조작 설정">
      <div className={styles.header}>
        <div>
          <h2>조작 설정</h2>
          <p>키 버튼을 누른 뒤 새 키를 입력하세요. 추가 키는 Backspace로 지울 수 있습니다.</p>
        </div>
        <button type="button" onClick={onReset} className={styles.resetButton}>
          기본값 복원
        </button>
      </div>

      <div className={styles.profileGrid}>
        {PROFILES.map((profileInfo) => {
          const profile = getProfile(settings, profileInfo.target);

          return (
            <article
              key={`${profileInfo.target.mode}-${profileInfo.target.playerId}`}
              className={styles.profile}
              data-testid={`control-profile-${profileInfo.target.mode}-${profileInfo.target.playerId}`}
            >
              <div className={styles.profileHeader}>
                <h3>{profileInfo.title}</h3>
                <p>{profileInfo.subtitle}</p>
              </div>

              <div className={styles.bindings}>
                {CONTROL_ACTIONS.map((action) => {
                  const bindings = profile[action];
                  const slots = bindings.length < MAX_KEYS_PER_ACTION ? [...bindings, ''] : bindings;

                  return (
                    <div key={action} className={styles.bindingRow}>
                      <span className={styles.actionLabel}>{ACTION_LABELS[action]}</span>
                      <div className={styles.keyList}>
                        {slots.map((code, index) => {
                          const isPending =
                            pending?.target.mode === profileInfo.target.mode &&
                            pending.target.playerId === profileInfo.target.playerId &&
                            pending.action === action &&
                            pending.index === index;

                          return (
                            <button
                              key={`${action}-${index}-${code || 'add'}`}
                              type="button"
                              data-testid={`binding-${profileInfo.target.mode}-${profileInfo.target.playerId}-${action}-${index}`}
                              className={[styles.keyButton, isPending ? styles.pending : '', code ? '' : styles.addButton]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => setPending({ target: profileInfo.target, action, index })}
                            >
                              {isPending ? '키 입력' : code ? formatDetailedKeyCode(code) : '+'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
