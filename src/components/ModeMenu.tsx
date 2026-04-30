import { useState } from 'react';
import {
  summarizeProfile,
  type ControlAction,
  type ControlProfileTarget,
  type ControlSettings
} from '../game/controls';
import type { GameMode } from '../game/types';
import { ControlSettingsPanel } from './ControlSettingsPanel';
import styles from './ModeMenu.module.css';

interface ModeMenuProps {
  controlSettings: ControlSettings;
  onChangeBinding: (target: ControlProfileTarget, action: ControlAction, index: number, code: string | null) => void;
  onResetControls: () => void;
  onStart: (mode: GameMode) => void;
}

export function ModeMenu({ controlSettings, onChangeBinding, onResetControls, onStart }: ModeMenuProps) {
  const [showControls, setShowControls] = useState(false);

  return (
    <main className={styles.menu}>
      <section className={styles.intro}>
        <p className={styles.kicker}>로컬 테트리스</p>
        <h1>배틀 테트리스</h1>
        <p className={styles.copy}>모드를 선택하고 한 키보드로 바로 플레이하세요.</p>
      </section>

      <section className={styles.modeGrid} aria-label="게임 모드">
        <button type="button" onClick={() => onStart('single-marathon')} className={styles.modeButton}>
          <span>싱글 마라톤</span>
          <small>최대한 오래 버티며 점수와 레벨을 올립니다</small>
        </button>
        <button type="button" onClick={() => onStart('single-sprint')} className={styles.modeButton}>
          <span>싱글 40라인 스프린트</span>
          <small>40줄 클리어 시간을 겨룹니다</small>
        </button>
        <button type="button" onClick={() => onStart('battle')} className={styles.modeButton}>
          <span>2인 대전</span>
          <small>두 플레이어가 방해줄을 주고받습니다</small>
        </button>
      </section>

      <section className={styles.keys}>
        <div>
          <strong>싱글</strong>
          <span>{summarizeProfile(controlSettings.single)}</span>
        </div>
        <div>
          <strong>대전 P1</strong>
          <span>{summarizeProfile(controlSettings.battle[1])}</span>
        </div>
        <div>
          <strong>대전 P2</strong>
          <span>{summarizeProfile(controlSettings.battle[2])}</span>
        </div>
      </section>

      <button type="button" className={styles.controlsToggle} onClick={() => setShowControls((visible) => !visible)}>
        {showControls ? '조작 설정 닫기' : '조작 설정'}
      </button>

      {showControls ? (
        <ControlSettingsPanel settings={controlSettings} onChangeBinding={onChangeBinding} onReset={onResetControls} />
      ) : null}
    </main>
  );
}
