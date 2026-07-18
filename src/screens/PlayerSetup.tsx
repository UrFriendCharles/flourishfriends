import { useState } from "react";
import { PLAYER_COLORS } from "../logic/gameReducer";
import { loadSavedPlayers, saveSavedPlayers } from "../storage/localStore";

const MAX_PLAYERS = 4;

interface Props {
  onConfirm: (players: { name: string; color: string }[]) => void;
  onBack: () => void;
}

export function PlayerSetup({ onConfirm, onBack }: Props) {
  const [names, setNames] = useState<string[]>(() => {
    const saved = loadSavedPlayers();
    return saved.length > 0 ? saved.map((p) => p.name) : ["", ""];
  });

  const setName = (i: number, value: string) =>
    setNames((prev) => prev.map((n, j) => (j === i ? value : n)));

  const addPlayer = () => setNames((prev) => [...prev, ""]);
  const removePlayer = (i: number) => setNames((prev) => prev.filter((_, j) => j !== i));

  const confirm = () => {
    const players = names
      .map((n, i) => ({ name: n.trim() || `Player ${i + 1}`, color: PLAYER_COLORS[i] }))
      .slice(0, MAX_PLAYERS);
    saveSavedPlayers(players);
    onConfirm(players);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-8">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
          ←
        </button>
        <h2 className="text-2xl font-black">Who's Playing?</h2>
      </div>

      <div className="flex flex-col gap-3">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2 animate-slide-up">
            <span
              className="h-9 w-9 shrink-0 rounded-full border-2 border-white/30"
              style={{ backgroundColor: PLAYER_COLORS[i] }}
            />
            <input
              value={name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              maxLength={16}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white placeholder-slate-500 outline-none focus:border-sky-400"
            />
            {names.length > 1 && (
              <button
                onClick={() => removePlayer(i)}
                aria-label={`Remove player ${i + 1}`}
                className="rounded-full bg-red-500/20 px-3 py-2 text-sm font-bold text-red-300 active:scale-95"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {names.length < MAX_PLAYERS && (
        <button
          onClick={addPlayer}
          className="rounded-xl border border-dashed border-white/25 px-4 py-3 text-sm font-bold text-slate-300 active:scale-95"
        >
          + Add Player
        </button>
      )}

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
