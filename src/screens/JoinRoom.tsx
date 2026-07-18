import { useState } from "react";
import {
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  normalizeRoomCode,
  type RoomInfoResponse,
} from "../logic/roomProtocol";
import { loadSavedPlayers } from "../storage/localStore";

interface Props {
  initialCode: string;
  onJoin: (roomCode: string, playerName: string) => void;
  onHome: () => void;
}

export function JoinRoom({ initialCode, onJoin, onHome }: Props) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(() => loadSavedPlayers()[0]?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const join = async () => {
    const clean = normalizeRoomCode(code);
    if (!isValidRoomCode(clean)) {
      setError(`Room codes are ${ROOM_CODE_LENGTH} letters, like BFJX.`);
      return;
    }
    if (!name.trim()) {
      setError("Tell us your name first!");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${clean}`);
      const info = (await res.json()) as RoomInfoResponse;
      if (!info.exists) {
        setError("No room with that code — double-check the TV!");
        return;
      }
      onJoin(clean, name.trim().slice(0, 20));
    } catch {
      setError("Couldn't reach the game server. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-8">
      <div className="text-center animate-pop-in">
        <div className="text-5xl">📺</div>
        <h2 className="mt-2 text-3xl font-black">Join a Game</h2>
        <p className="mt-1 text-sm text-slate-400">
          Enter the room code from the TV or host's screen.
        </p>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Room code
        </div>
        <input
          value={code}
          onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
          placeholder="ABCD"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={ROOM_CODE_LENGTH}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-sky-300"
        />
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Your name
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          maxLength={20}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-lg font-bold outline-none focus:border-sky-300"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2.5">
        <button
          onClick={join}
          disabled={checking}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-60"
        >
          {checking ? "Checking…" : "🎮 Join Game"}
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
