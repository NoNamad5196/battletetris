import { getCountdownLabel } from '../game/game';
import type { GameState } from '../game/types';
import { formatTime } from './PlayerPanel';
import styles from './GameOverlay.module.css';

interface GameOverlayProps {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverlay({ state, onRestart, onMenu }: GameOverlayProps) {
  if (state.phase === 'countdown') {
    return (
      <div className={styles.overlay} aria-live="polite">
        <strong className={styles.countdown}>{getCountdownLabel(state)}</strong>
      </div>
    );
  }

  if (state.phase === 'paused') {
    return (
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          <h2>Paused</h2>
          <div className={styles.actions}>
            <button type="button" onClick={onRestart}>Restart</button>
            <button type="button" onClick={onMenu}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'finished') {
    const player = state.players[0];

    return (
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          <p className={styles.kicker}>{state.finishedReason}</p>
          <h2>{state.winner ? `Player ${state.winner} wins` : state.mode === 'single-sprint' ? 'Sprint complete' : 'Run finished'}</h2>
          {player ? (
            <dl className={styles.results}>
              <div>
                <dt>Score</dt>
                <dd>{player.score.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Lines</dt>
                <dd>{player.lines}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(state.elapsedMs)}</dd>
              </div>
            </dl>
          ) : null}
          <div className={styles.actions}>
            <button type="button" onClick={onRestart}>Restart</button>
            <button type="button" onClick={onMenu}>Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
