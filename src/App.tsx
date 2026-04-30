import { BoardView } from './components/BoardView';
import { GameOverlay } from './components/GameOverlay';
import { ModeMenu } from './components/ModeMenu';
import { PlayerPanel } from './components/PlayerPanel';
import { SPRINT_TARGET_LINES } from './game/constants';
import { summarizeProfile } from './game/controls';
import { useTetrisGame } from './hooks/useTetrisGame';
import styles from './App.module.css';

export default function App() {
  const { state, controlSettings, changeBinding, resetControls, startMode, restart, backToMenu } = useTetrisGame();

  if (state.phase === 'menu' || !state.mode) {
    return (
      <ModeMenu
        controlSettings={controlSettings}
        onChangeBinding={changeBinding}
        onResetControls={resetControls}
        onStart={startMode}
      />
    );
  }

  const isBattle = state.mode === 'battle';
  const title = state.mode === 'single-marathon' ? '싱글 마라톤' : state.mode === 'single-sprint' ? '40라인 스프린트' : '2인 대전';

  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <div>
          <p>배틀 테트리스</p>
          <h1>{title}</h1>
        </div>
        <div className={styles.topbarActions}>
          <button type="button" onClick={restart}>재시작</button>
          <button type="button" onClick={backToMenu}>메뉴</button>
        </div>
      </header>

      {isBattle ? (
        <section className={styles.battleLayout}>
          {state.players.map((player) => (
            <div key={player.id} className={styles.playerRig}>
              <PlayerPanel player={player} showGarbage />
              <BoardView player={player} title={`Player ${player.id}`} compact />
            </div>
          ))}
        </section>
      ) : (
        <section className={styles.singleLayout}>
          <PlayerPanel
            player={state.players[0]}
            elapsedMs={state.elapsedMs}
            sprintTarget={state.mode === 'single-sprint' ? SPRINT_TARGET_LINES : undefined}
          />
          <BoardView player={state.players[0]} title="Player 1" />
        </section>
      )}

      <footer className={styles.footer}>
        {isBattle ? (
          <>
            <span>P1: {summarizeProfile(controlSettings.battle[1])}</span>
            <span>P2: {summarizeProfile(controlSettings.battle[2])}</span>
          </>
        ) : (
          <span>조작: {summarizeProfile(controlSettings.single)}</span>
        )}
        <span>ESC 일시정지</span>
      </footer>

      <GameOverlay state={state} onRestart={restart} onMenu={backToMenu} />
    </main>
  );
}
