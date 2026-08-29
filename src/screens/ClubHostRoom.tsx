import { useState } from "react";
import { useClubSocket } from "../hooks/useClubSocket";
import { FINAL_ROUND_INDEX } from "../logic/clubProtocol";
import { ClubBoard } from "../components/ClubBoard";

interface Props {
  roomCode: string;
  hostKey: string;
  onExit: () => void;
  onPlayAgain: () => void;
}

// The hosting device is the shared game board (mirror it to a TV). Controls sit
// along the bottom and stay deliberately thin (§43): the server runs the clock,
// locks answers and reveals on its own — the host only starts rounds, advances
// past an explanation, pauses, or ends the game.

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      onClick={copy}
      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition active:scale-95"
    >
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{value}</span>
      <span className="text-xs font-bold text-sky-300">{copied ? "✅" : "📋"}</span>
    </button>
  );
}

export function ClubHostRoom({ roomCode, hostKey, onExit, onPlayAgain }: Props) {
  const { snapshot, connected, fatalError, clockOffset, send } = useClubSocket(roomCode, () => ({
    type: "hello",
    role: "host",
    hostKey,
  }));
  const [confirmEnd, setConfirmEnd] = useState(false);

  const origin = window.location.origin.replace(/^https?:\/\//, "");
  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6 md:max-w-5xl md:px-8">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 md:text-sm">
        <span>🧠 0.5% Club</span>
        <span>
          ROOM <span className="tracking-widest text-sky-200">{roomCode}</span>
          {!connected && " · 🟡 Reconnecting…"}
        </span>
      </div>
      {children}
    </div>
  );

  if (fatalError) {
    return shell(
      <div className="my-auto space-y-4 text-center">
        <div className="text-5xl">🚪</div>
        <p className="font-bold">{fatalError}</p>
        <button
          onClick={onExit}
          className="mx-auto w-full max-w-md rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold transition active:scale-95"
        >
          🏠 Home
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return shell(<div className="my-auto text-center text-slate-400">Opening room…</div>);
  }

  const endButton = snapshot.status !== "ended" && (
    <button
      onClick={() => {
        if (confirmEnd) {
          send({ type: "end" });
          setConfirmEnd(false);
        } else {
          setConfirmEnd(true);
          setTimeout(() => setConfirmEnd(false), 3000);
        }
      }}
      className={`rounded-2xl border px-5 py-2.5 text-sm font-bold transition active:scale-95 ${
        confirmEnd
          ? "border-rose-400/70 bg-rose-500/20 text-rose-200"
          : "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      {confirmEnd ? "⚠️ Tap again to end" : "🛑 End Game"}
    </button>
  );

  const pauseButton = (snapshot.status === "question" || snapshot.status === "round_intro") && (
    <button
      onClick={() => send({ type: snapshot.paused ? "resume" : "pause" })}
      className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 transition active:scale-95"
    >
      {snapshot.paused ? "▶️ Resume" : "⏸️ Pause"}
    </button>
  );

  const controls = () => {
    switch (snapshot.status) {
      case "lobby":
        return (
          <>
            <div className="mx-auto w-full max-w-md space-y-2">
              <CopyRow label="Players join" value={`${origin}/join/${roomCode}`} />
              <CopyRow label="Separate TV screen" value={`${origin}/club/display/${roomCode}`} />
              <p className="px-1 text-center text-xs text-slate-500">
                Mirroring this screen to the TV? You're all set — this device is the game board.
              </p>
            </div>
            <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
              <button
                onClick={() => send({ type: "start" })}
                disabled={snapshot.players.length === 0}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
              >
                🚀 Start Game
              </button>
              <button
                onClick={onExit}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
              >
                🏠 Leave (room stays open)
              </button>
            </div>
          </>
        );
      case "intro":
        return (
          <div className="mx-auto flex w-full max-w-md items-center gap-2.5">
            <button
              onClick={() => send({ type: "start" })}
              className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
            >
              ▶️ START
            </button>
            {endButton}
          </div>
        );
      case "round_intro":
      case "question":
        return (
          <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2.5">
            {pauseButton}
            {endButton}
          </div>
        );
      case "reveal":
        return (
          <div className="mx-auto flex w-full max-w-md items-center gap-2.5">
            <button
              onClick={() => send({ type: "next" })}
              className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3.5 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
            >
              {snapshot.roundIndex >= FINAL_ROUND_INDEX ? "🏁 Final Results" : "➡️ Next Round"}
            </button>
            {endButton}
          </div>
        );
      default:
        return (
          <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
            <button
              onClick={onPlayAgain}
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold transition active:scale-95"
            >
              🔁 Play Again
            </button>
            <button
              onClick={onExit}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
            >
              🏠 Done
            </button>
          </div>
        );
    }
  };

  return shell(
    <>
      <ClubBoard snapshot={snapshot} clockOffset={clockOffset} joinUrl={joinUrl} />
      <div className="mt-auto flex flex-col gap-3 pt-4">{controls()}</div>
    </>
  );
}
