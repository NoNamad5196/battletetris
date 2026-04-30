import { SHAPES } from '../game/tetrominoes';
import type { TetrominoKind } from '../game/types';
import styles from './MiniPiece.module.css';

interface MiniPieceProps {
  kind: TetrominoKind | null;
  label?: string;
}

export function MiniPiece({ kind, label }: MiniPieceProps) {
  const cells = kind ? SHAPES[kind][0] : [];

  return (
    <div className={styles.preview} aria-label={label}>
      {Array.from({ length: 16 }, (_, index) => {
        const x = index % 4;
        const y = Math.floor(index / 4);
        const filled = kind && cells.some((cell) => cell.x === x && cell.y === y);

        return (
          <span
            key={index}
            className={[styles.cell, filled ? styles[`kind${kind}`] : ''].filter(Boolean).join(' ')}
          />
        );
      })}
    </div>
  );
}
