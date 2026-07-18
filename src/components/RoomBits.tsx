import { useEffect, useState } from "react";
import type { RoomPlayerView } from "../logic/roomProtocol";

export const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Counts down against the server clock (deadline is server time). */
export function RoomTimerBar({
  deadline,
  totalSeconds,
  clockOffset,
}: {
  deadline: number;
  totalSeconds: number;
  clockOffset: number;
}) {
  const remaining = () => Math.max(0, deadline - (Date.now() + clockOffset));
  const [leftMs, setLeftMs] = useState(remaining);

  useEffect(() => {
    const id = window.setInterval(() => setLeftMs(remaining()), 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, clockOffset]);

  const fraction = Math.min(1, leftMs / (totalSeconds * 1000));
  const urgent = leftMs <= 5000;
  return (
    <div className="w-full">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            urgent ? "bg-rose-400" : "bg-gradient-to-r from-sky-400 to-violet-400"
          }`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <div className={`mt-1 text-center text-xs font-bold tabular-nums ${urgent ? "text-rose-300" : "text-slate-400"}`}>
        {Math.ceil(leftMs / 1000)}s
      </div>
    </div>
  );
}

export function RoomLeaderboard({
  players,
  highlightId,
  showAnswered,
}: {
  players: RoomPlayerView[];
  highlightId?: string;
  showAnswered?: boolean;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-1.5">
      {sorted.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
            p.id === highlightId ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/5"
          } ${p.connected ? "" : "opacity-50"}`}
        >
          <span className="w-5 text-center text-sm font-black text-slate-400">{i + 1}</span>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="min-w-0 flex-1 truncate font-bold">
            {p.name}
            {!p.connected && " 📵"}
          </span>
          {p.streak >= 3 && <span className="text-xs font-bold text-orange-300">🔥{p.streak}</span>}
          {showAnswered && (
            <span className="text-sm">{p.answered ? "✅" : "…"}</span>
          )}
          {p.lastAnswer && p.lastAnswer.pointsEarned > 0 && (
            <span className="text-xs font-bold text-green-300">+{p.lastAnswer.pointsEarned}</span>
          )}
          <span className="text-lg font-black tabular-nums text-sky-200">{p.score}</span>
        </div>
      ))}
    </div>
  );
}

/** Final standings with medals — used on ended screens everywhere. */
export function RoomFinalStandings({
  players,
  highlightId,
}: {
  players: RoomPlayerView[];
  highlightId?: string;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-2">
      {sorted.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
            i === 0
              ? "border-gold-400/70 bg-gold-500/10"
              : p.id === highlightId
                ? "border-sky-400/50 bg-sky-500/10"
                : "border-white/10 bg-white/5"
          }`}
        >
          <span className="w-8 text-center text-2xl">
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-base font-black text-slate-400">{i + 1}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-black">
              {p.name}
              {i === 0 && " 👑"}
            </div>
            <div className="text-xs text-slate-400">
              {p.correctCount} correct · 🔥 best {p.bestStreak}
            </div>
          </div>
          <span className="text-2xl font-black tabular-nums text-sky-200">{p.score}</span>
        </div>
      ))}
    </div>
  );
}
