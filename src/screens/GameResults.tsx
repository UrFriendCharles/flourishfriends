import { useState } from "react";
import type { GameState, Player, ScoreShare } from "../types";
import { countryById } from "../data/countries";
import { getWinner } from "../logic/gameReducer";
import { newShareId, saveScoreShare } from "../storage/scoreShares";
import { ScoreShareWidget } from "../components/ScoreShareWidget";

interface Props {
  state: GameState;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
  onHome: () => void;
}

interface PlayerStats {
  player: Player;
  correct: number;
  accuracy: number;
  fastestMs: number | null;
  hardestCorrect: string | null;
}

function computeStats(state: GameState): PlayerStats[] {
  const total = state.questions.length;
  return state.players.map((player) => {
    let correct = 0;
    let fastestMs: number | null = null;
    let hardestCorrect: string | null = null;
    let hardestRank = -1;
    const rank = { easy: 0, medium: 1, hard: 2 };
    state.questions.forEach((q, i) => {
      const a = player.answers[String(i)];
      if (!a?.correct) return;
      correct++;
      if (fastestMs === null || a.timeMs < fastestMs) fastestMs = a.timeMs;
      const country = countryById.get(q.countryId);
      if (country && rank[country.difficulty] > hardestRank) {
        hardestRank = rank[country.difficulty];
        hardestCorrect = country.country;
      }
    });
    return {
      player,
      correct,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      fastestMs,
      hardestCorrect,
    };
  });
}

export function missedCountryIds(state: GameState): string[] {
  return state.questions
    .filter((_q, i) => state.players.some((p) => !p.answers[String(i)]?.correct))
    .map((q) => q.countryId);
}

export function GameResults({ state, onPlayAgain, onChangeSettings, onHome }: Props) {
  const winner = getWinner(state);
  const stats = computeStats(state).sort((a, b) => b.player.score - a.player.score);
  const multi = state.players.length > 1;
  // shares already generated this screen, keyed by player id
  const [shares, setShares] = useState<Record<string, ScoreShare>>({});

  const shareScore = (s: PlayerStats) => {
    const share: ScoreShare = {
      shareId: newShareId(),
      playerName: s.player.name,
      score: s.player.score,
      accuracy: s.accuracy,
      bestStreak: s.player.bestStreak,
      totalQuestions: state.questions.length,
      correctAnswers: s.correct,
      difficulty: state.settings.difficulty,
      mode: state.settings.mode,
      collection: state.settings.collection,
      timerUsed: state.settings.timerSeconds !== null,
      typed: state.settings.answerStyle === "typed",
      createdAt: Date.now(),
    };
    setShares((prev) => ({ ...prev, [s.player.id]: share }));
    void saveScoreShare(share);
  };
  const missed = missedCountryIds(state)
    .map((id) => countryById.get(id))
    .filter((c) => !!c);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-8">
      <div className="text-center animate-pop-in">
        <div className="text-6xl">🏆</div>
        {multi && winner ? (
          <>
            <h2 className="mt-2 text-3xl font-black winner-shimmer">{winner.name} Wins!</h2>
            {state.tieBreakerWinnerId && (
              <p className="mt-1 text-sm font-semibold text-gold-400">⚔️ Won by sudden death</p>
            )}
          </>
        ) : (
          <h2 className="mt-2 text-3xl font-black">Game Over!</h2>
        )}
      </div>

      <div className="space-y-3">
        {stats.map((s, i) => {
          const { player, accuracy, fastestMs, hardestCorrect } = s;
          return (
          <div
            key={player.id}
            className={`rounded-2xl border p-4 animate-slide-up ${
              multi && winner?.id === player.id
                ? "border-gold-400/70 bg-gold-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg font-black">
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: player.color }} />
                {multi ? `${i + 1}. ` : ""}
                {player.name}
                {multi && winner?.id === player.id && " 👑"}
              </span>
              <span className="text-2xl font-black tabular-nums text-sky-200">{player.score}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="font-black text-white">{accuracy}%</div>
                <div className="text-slate-400">Accuracy</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="font-black text-orange-300">🔥 {player.bestStreak}</div>
                <div className="text-slate-400">Best streak</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="font-black text-white">
                  {fastestMs !== null ? `${(fastestMs / 1000).toFixed(1)}s` : "—"}
                </div>
                <div className="text-slate-400">Fastest ✓</div>
              </div>
            </div>
            {hardestCorrect && (
              <p className="mt-2 text-xs text-slate-300">
                💪 Hardest flag conquered: <span className="font-bold">{hardestCorrect}</span>
              </p>
            )}
            {shares[player.id] ? (
              <ScoreShareWidget share={shares[player.id]} />
            ) : (
              <button
                onClick={() => shareScore(s)}
                className="mt-3 w-full rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-sm font-bold text-sky-200 transition active:scale-95"
              >
                📤 Share {multi ? `${player.name}'s` : "Your"} Score
              </button>
            )}
          </div>
          );
        })}
      </div>

      {missed.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Flags to study 📖
          </div>
          <div className="flex flex-wrap gap-2">
            {missed.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold"
              >
                <img src={`${import.meta.env.BASE_URL}flags/${c.countryCode}.svg`} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                {c.country}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        <button
          onClick={onPlayAgain}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          🔄 Play Again
        </button>
        <button
          onClick={onChangeSettings}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
        >
          ⚙️ Change Settings
        </button>
        <button
          onClick={onHome}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
        >
          🏠 Home
        </button>
      </div>
    </div>
  );
}
