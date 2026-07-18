import type { Player } from "../types";

interface Props {
  player: Player;
  questionLabel: string;
  isTieBreaker: boolean;
  onReady: () => void;
}

export function PassDevice({ player, questionLabel, isTieBreaker, onReady }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      {isTieBreaker && (
        <div className="rounded-full border border-gold-400/60 bg-gold-500/15 px-4 py-1.5 text-sm font-bold text-gold-400 animate-pop-in">
          ⚔️ Sudden Death Tie-Breaker
        </div>
      )}
      <div className="animate-pop-in">
        <div className="mb-4 text-6xl">🤫</div>
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {questionLabel} · No peeking!
        </p>
        <h2 className="mt-2 text-3xl font-black">
          Hand the device to{" "}
          <span style={{ color: player.color }}>{player.name}</span>
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Other players look away until the answer is locked in.
        </p>
      </div>
      <button
        onClick={onReady}
        className="w-full rounded-2xl px-6 py-4 text-lg font-bold text-navy-950 shadow-lg transition active:scale-95"
        style={{ backgroundColor: player.color }}
      >
        I'm {player.name} — Show the Flag!
      </button>
    </div>
  );
}
