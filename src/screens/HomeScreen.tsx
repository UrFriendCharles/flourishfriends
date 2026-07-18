interface Props {
  hasSavedGame: boolean;
  onStart: () => void;
  onContinue: () => void;
  onHostTv: () => void;
  onJoinRoom: () => void;
  onHighScores: () => void;
  onHowToPlay: () => void;
}

export function HomeScreen({
  hasSavedGame,
  onStart,
  onContinue,
  onHostTv,
  onJoinRoom,
  onHighScores,
  onHowToPlay,
}: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="text-center animate-pop-in">
        <div className="mb-3 text-6xl">🌍</div>
        <h1 className="text-4xl font-black leading-tight">
          Flourish Friends
          <span className="mt-1 block bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
            Flag Quiz
          </span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Guess the country. Beat your friends. Learn the world.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={onStart}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          🎮 Start Game
        </button>
        {hasSavedGame && (
          <button
            onClick={onContinue}
            className="w-full rounded-2xl border border-green-400/50 bg-green-500/15 px-6 py-3.5 font-bold text-green-200 transition active:scale-95"
          >
            ▶️ Continue Game
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={onHostTv}
            className="flex-1 rounded-2xl border border-violet-400/40 bg-violet-500/15 px-4 py-3.5 font-bold text-violet-200 transition active:scale-95"
          >
            📺 Host TV Game
          </button>
          <button
            onClick={onJoinRoom}
            className="flex-1 rounded-2xl border border-violet-400/40 bg-violet-500/15 px-4 py-3.5 font-bold text-violet-200 transition active:scale-95"
          >
            📱 Join Game
          </button>
        </div>
        <button
          onClick={onHighScores}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold transition active:scale-95"
        >
          🏆 High Scores
        </button>
        <button
          onClick={onHowToPlay}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold transition active:scale-95"
        >
          ❓ How to Play
        </button>
      </div>
    </div>
  );
}
