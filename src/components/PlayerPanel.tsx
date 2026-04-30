import { getPreviewQueue } from '../game/player';
import type { PlayerState } from '../game/types';
import { MiniPiece } from './MiniPiece';
import styles from './PlayerPanel.module.css';

interface PlayerPanelProps {
  player: PlayerState;
  showGarbage?: boolean;
  elapsedMs?: number;
  sprintTarget?: number;
}

export function PlayerPanel({ player, showGarbage = false, elapsedMs, sprintTarget }: PlayerPanelProps) {
  const previews = getPreviewQueue(player);

  return (
    <aside className={styles.panel}>
      <div className={styles.section}>
        <span className={styles.label}>Hold</span>
        <MiniPiece kind={player.hold} label="Hold piece" />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Next</span>
        <div className={styles.nextList}>
          {previews.map((kind, index) => (
            <MiniPiece key={`${kind}-${index}`} kind={kind} label={`Next ${index + 1}`} />
          ))}
        </div>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>Score</dt>
          <dd>{player.score.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{player.level}</dd>
        </div>
        <div>
          <dt>Lines</dt>
          <dd>{sprintTarget ? `${Math.min(player.lines, sprintTarget)} / ${sprintTarget}` : player.lines}</dd>
        </div>
        <div>
          <dt>Combo</dt>
          <dd>{Math.max(0, player.combo)}</dd>
        </div>
        {showGarbage ? (
          <div>
            <dt>Garbage</dt>
            <dd>{player.pendingGarbage}</dd>
          </div>
        ) : null}
        {elapsedMs !== undefined ? (
          <div>
            <dt>Time</dt>
            <dd>{formatTime(elapsedMs)}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}
