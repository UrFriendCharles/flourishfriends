import { useState } from "react";
import { PLAYER_COLORS } from "../logic/gameReducer";
import { loadSavedPlayers, saveSavedPlayers } from "../storage/localStore";

interface Props {
  onConfirm: (players: { name: string; color: string }[]) => void;
  onBack: () => void;
}

/** Solo play only — friends play together through Head to Head or a TV room. */
export function PlayerSetup({ onConfirm, onBack }: Props) {
  const [name, setName] = useState(() => loadSavedPlayers()[0]?.name ?? "");

  const confirm = () => {
    const players = [{ name: name.trim() || "Player 1", color: PLAYER_COLORS[0] }];
    saveSavedPlayers(players);
    onConfirm(players);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">What's your name?</h2>
      </div>

      <div className="flex items-center gap-2 animate-slide-up">
        <span
          className="h-9 w-9 shrink-0 rounded-full border-2 border-white/30"
          style={{ backgroundColor: PLAYER_COLORS[0] }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder="Player 1"
          maxLength={16}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white placeholder-slate-500 outline-none focus:border-sky-400"
        />
      </div>

      <p className="text-sm text-slate-400">
        Playing with friends? Use ⚔️ Head to Head or 📺 Host TV Game on the home screen.
      </p>

      <div className="mt-auto">
        <button
          onClick={confirm}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          Next: Game Setup →
        </button>
      </div>
    </div>
  );
}
