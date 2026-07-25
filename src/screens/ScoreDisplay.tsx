import { useEffect, useMemo, useState } from "react";
import type { ScoreShare } from "../types";
import { decodeShare } from "../logic/scoreSharing";
import { getScoreShare } from "../storage/scoreShares";

interface Props {
  shareId: string;
  fragment: string; // URL hash payload (may be empty on old/local links)
  onHome: () => void;
}

export function ScoreDisplay({ shareId, fragment, onHome }: Props) {
  // Links carry their data in the fragment; fall back to this device's
  // IndexedDB for links saved here before the fragment existed.
  const fromUrl = useMemo(() => decodeShare(shareId, fragment), [shareId, fragment]);
  const [share, setShare] = useState<ScoreShare | null>(fromUrl);
  const [loading, setLoading] = useState(fromUrl === null);

  useEffect(() => {
    if (fromUrl) return;
    let cancelled = false;
    getScoreShare(shareId).then((stored) => {
      if (cancelled) return;
      setShare(stored);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fromUrl, shareId]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-5">
        <div className="text-slate-400">Loading score…</div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 py-8 text-center">
        <div className="text-6xl">🕳️</div>
        <h2 className="text-2xl font-black">Score not found</h2>
        <p className="text-sm text-slate-400">
          This share link is incomplete or broken. Ask your friend to copy the full link!
        </p>
        <button
          onClick={onHome}
          className="mt-2 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          🌍 Play the Flag Quiz
        </button>
      </div>
    );
  }

  const stat = (value: string, label: string, valueClass = "text-white") => (
    <div className="rounded-xl bg-white/5 py-3">
      <div className={`text-xl font-black ${valueClass}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );

  const chips = [
    share.collection === "usStates"
      ? "🇺🇸 US states"
      : share.collection === "usCapitals"
        ? "🏛️ State capitals"
        : share.collection === "worldCapitals"
          ? "🌆 World capitals"
          : share.collection === "everything"
            ? "🌐 Everything"
            : "🌍 World flags",
    share.mode === "learning" ? "📚 Learning" : "🎯 Classic",
    share.difficulty,
    `${share.totalQuestions} questions`,
    ...(share.timerUsed ? ["⏱️ Timed"] : []),
    ...(share.typed ? ["⌨️ Type It In"] : []),
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-8">
      <div className="text-center animate-pop-in">
        <div className="text-6xl">🏆</div>
        <h2 className="mt-2 text-2xl font-black">{share.playerName} scored</h2>
        <div className="mt-1 text-6xl font-black tabular-nums text-sky-200 winner-shimmer">
          {share.score}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          on the Flourish Friends Flag Quiz ·{" "}
          {new Date(share.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center animate-slide-up">
        {stat(`${share.accuracy}%`, "Accuracy")}
        {stat(`${share.correctAnswers}/${share.totalQuestions}`, "Correct")}
        {stat(`🔥 ${share.bestStreak}`, "Best streak", "text-orange-300")}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-auto space-y-2 pt-4 text-center">
        <p className="font-bold text-slate-200">Think you can beat that?</p>
        <button
          onClick={onHome}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          🌍 Play the Flag Quiz
        </button>
      </div>
    </div>
  );
}
