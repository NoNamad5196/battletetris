import { buildRenderBoard, hasDangerStack } from '../game/board';
import type { PlayerState, RenderCell } from '../game/types';
import styles from './BoardView.module.css';

interface BoardViewProps {
  player: PlayerState;
  title: string;
  compact?: boolean;
}

export function BoardView({ player, title, compact = false }: BoardViewProps) {
  const board = buildRenderBoard(player.board, player.active);
  const danger = hasDangerStack(player.board);

  return (
    <section className={[styles.boardShell, danger ? styles.danger : '', compact ? styles.compact : ''].filter(Boolean).join(' ')}>
      <div className={styles.boardHeader}>
        <h2>{title}</h2>
        <span>{player.gameOver ? 'OUT' : 'LIVE'}</span>
      </div>
      <div className={styles.board}>
        {board.flatMap((row, y) =>
          row.map((cell, x) => <span key={`${x}-${y}`} className={cellClass(cell)} />)
        )}
      </div>
    </section>
  );
}

function cellClass(cell: RenderCell | null): string {
  if (!cell) {
    return styles.cell;
  }

  return [
    styles.cell,
    styles.filled,
    styles[`kind${cell.kind}`],
    cell.ghost ? styles.ghost : '',
    cell.active ? styles.active : ''
  ]
    .filter(Boolean)
    .join(' ');
}
