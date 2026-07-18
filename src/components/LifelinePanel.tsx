import type { Player } from "../types";

interface Props {
  player: Player;
  crowdVotes: Record<string, number> | null;
  fiftyFiftyActive: boolean;
  onFiftyFifty: () => void;
  onAskCrowd: () => void;
}

export function LifelinePanel({
  player,
  crowdVotes,
  fiftyFiftyActive,
  onFiftyFifty,
  onAskCrowd,
}: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-400">
        ⭐ Lifelines
      </div>
      <div className="flex gap-2">
        <button
          onClick={onFiftyFifty}
          disabled={player.fiftyFiftyUsed}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition active:scale-95 ${
            player.fiftyFiftyUsed && !fiftyFiftyActive
              ? "border-white/5 bg-white/[0.02] text-slate-600 line-through"
              : fiftyFiftyActive
                ? "border-gold-400 bg-gold-500/20 text-gold-400"
                : "border-gold-500/50 bg-gold-500/10 text-gold-400"
          }`}
        >
          50:50
        </button>
        <button
          onClick={onAskCrowd}
          disabled={player.crowdUsed}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition active:scale-95 ${
            player.crowdUsed && !crowdVotes
              ? "border-white/5 bg-white/[0.02] text-slate-600 line-through"
              : crowdVotes
                ? "border-gold-400 bg-gold-500/20 text-gold-400"
                : "border-gold-500/50 bg-gold-500/10 text-gold-400"
          }`}
        >
          Ask the Crowd
        </button>
      </div>
      {crowdVotes && (
        <div className="mt-3 space-y-1.5 animate-slide-up">
          {Object.entries(crowdVotes).map(([choice, pct]) => (
            <div key={choice} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate font-semibold text-slate-300">{choice}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-9 text-right font-bold tabular-nums text-gold-400">{pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
