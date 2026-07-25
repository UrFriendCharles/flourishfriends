import { useMemo, useState } from "react";
import type { Difficulty, GameMode } from "../types";
import { loadHighScores } from "../storage/localStore";

interface Props {
  onBack: () => void;
}

export function HighScores({ onBack }: Props) {
  const scores = useMemo(loadHighScores, []);
  const [mode, setMode] = useState<GameMode | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  const filtered = scores.filter(
    (s) => (mode === "all" || s.mode === mode) && (difficulty === "all" || s.difficulty === difficulty)
  );

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
      active ? "border-sky-300 bg-sky-500/25 text-white" : "border-white/15 bg-white/5 text-slate-300"
    }`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">🏆 High Scores</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "classic", "learning"] as const).map((m) => (
          <button key={m} className={chip(mode === m)} onClick={() => setMode(m)}>
            {m === "all" ? "All modes" : m === "classic" ? "🎯 Classic" : "📚 Learning"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["all", "easy", "medium", "hard"] as const).map((d) => (
          <button key={d} className={chip(difficulty === d)} onClick={() => setDifficulty(d)}>
            {d === "all" ? "All difficulties" : d}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 text-center text-slate-400">
          <div className="text-5xl">🕳️</div>
          <p className="mt-3 font-semibold">No scores yet — go play a game!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 25).map((s, i) => (
            <div
              key={`${s.playerName}-${s.date}-${i}`}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                i === 0 ? "border-gold-400/60 bg-gold-500/10" : "border-white/10 bg-white/5"
              }`}
            >
              <span className="w-7 text-center text-lg font-black text-slate-400">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{s.playerName}</div>
                <div className="text-xs text-slate-400">
                  {s.collection === "usStates"
                    ? "🇺🇸 states · "
                    : s.collection === "usCapitals"
                      ? "🏛️ US capitals · "
                      : s.collection === "worldCapitals"
                        ? "🌆 world capitals · "
                        : s.collection === "everything"
                          ? "🌐 everything · "
                          : ""}
                  {s.mode} · {s.difficulty} · {s.questionCount} Qs{s.timed ? " · ⏱️" : ""}
                  {s.typed ? " · ⌨️" : ""} · {s.accuracy}% · 🔥{s.bestStreak}
                </div>
              </div>
              <span className="text-xl font-black tabular-nums text-sky-200">{s.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
