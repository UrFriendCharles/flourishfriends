import { useEffect, useState } from "react";
import type { RoomPlayerView } from "../logic/roomProtocol";
import { joinLink } from "../logic/createRoom";

/** Whole seconds left until a server-clock moment (ticks while mounted). */
export function useCountdown(at: number | null, clockOffset: number): number | null {
  const left = () => (at === null ? null : Math.max(0, Math.ceil((at - (Date.now() + clockOffset)) / 1000)));
  const [secs, setSecs] = useState(left);
  useEffect(() => {
    setSecs(left());
    if (at === null) return;
    const id = window.setInterval(() => setSecs(left()), 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, clockOffset]);
  return secs;
}

/** Lobby card for the challenger: share the link, then wait for the friend. */
export function ChallengeInvite({
  roomCode,
  myName,
  gameName = "Flag Quiz",
}: {
  roomCode: string;
  myName: string;
  gameName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = joinLink(roomCode);
  const text = `⚔️ ${myName} challenged you to a ${gameName} head to head! Tap to play:`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the code is still on screen
    }
  };
  const share = () => {
    if (typeof navigator.share === "function") {
      navigator.share({ title: `${gameName} Challenge`, text, url }).catch(() => {});
    } else {
      void copy();
    }
  };

  return (
    <div className="space-y-3 animate-slide-up">
      <button
        onClick={share}
        className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-rose-500/25 transition active:scale-95"
      >
        📤 Send Challenge Link
      </button>
      <button
        onClick={copy}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold transition active:scale-95"
      >
        {copied ? "✅ Link copied!" : "🔗 Copy link"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Or they can tap <span className="font-bold text-slate-200">Join Game</span> and enter code{" "}
        <span className="font-black tracking-widest text-white">{roomCode}</span>
      </p>
      <p className="animate-pulse text-center text-sm font-bold text-sky-200">
        Waiting for your friend to join…
      </p>
    </div>
  );
}

/** "Alex vs Sam" header with scores. */
export function VersusBar({ me, them }: { me: RoomPlayerView; them: RoomPlayerView | null }) {
  const side = (p: RoomPlayerView | null, label: string) => (
    <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
      <div className="truncate text-xs font-bold" style={{ color: p?.color }}>
        {p ? p.name : "…"} {label}
      </div>
      <div className="text-2xl font-black">{p?.score ?? 0}</div>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      {side(me, "(you)")}
      <div className="text-sm font-black text-rose-300">VS</div>
      {side(them, "")}
    </div>
  );
}

/** Reveal: how each player did on this flag. */
export function VersusReveal({ me, them }: { me: RoomPlayerView; them: RoomPlayerView | null }) {
  const row = (p: RoomPlayerView) => {
    const a = p.lastAnswer;
    return (
      <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
        <span className="font-bold" style={{ color: p.color }}>
          {p.name}
        </span>
        <span className={a?.correct ? "font-bold text-green-300" : "font-bold text-rose-300"}>
          {a?.correct
            ? `✅ +${a.pointsEarned} (${(a.timeMs / 1000).toFixed(1)}s)`
            : a
              ? `❌ ${a.choice}`
              : "⏰ no answer"}
        </span>
      </div>
    );
  };
  return (
    <div className="space-y-1.5">
      {row(me)}
      {them && row(them)}
    </div>
  );
}

/** End of game: who won. */
export function WinnerBanner({ me, them }: { me: RoomPlayerView; them: RoomPlayerView | null }) {
  const outcome = !them || me.score > them.score ? "win" : me.score < them.score ? "lose" : "tie";
  return (
    <div className="text-center animate-pop-in">
      <div className="text-7xl">{outcome === "win" ? "🏆" : outcome === "lose" ? "😤" : "🤝"}</div>
      <h2 className="mt-2 text-3xl font-black">
        {outcome === "win" ? "You win!" : outcome === "lose" ? `${them?.name} wins!` : "It's a tie!"}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {me.score} – {them?.score ?? 0} · you got {me.correctCount} right
      </p>
    </div>
  );
}
