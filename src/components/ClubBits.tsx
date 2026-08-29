import { useEffect, useState } from "react";
import type { ClubPlayerView, ClubTier, ClubVisual } from "../logic/clubProtocol";
import { CLUB_VISUALS } from "../data/clubVisuals";

export const CLUB_CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Tension rises with the tier (§45): the early rounds are calm, the last two
 * get their own treatment.
 */
export const TIER_ACCENT: Record<string, { text: string; ring: string; glow: string }> = {
  "90": { text: "text-sky-200", ring: "border-sky-400/40", glow: "shadow-sky-500/20" },
  "80": { text: "text-sky-200", ring: "border-sky-400/40", glow: "shadow-sky-500/20" },
  "70": { text: "text-cyan-200", ring: "border-cyan-400/40", glow: "shadow-cyan-500/20" },
  "60": { text: "text-teal-200", ring: "border-teal-400/40", glow: "shadow-teal-500/20" },
  "50": { text: "text-violet-200", ring: "border-violet-400/40", glow: "shadow-violet-500/20" },
  "40": { text: "text-violet-200", ring: "border-violet-400/50", glow: "shadow-violet-500/30" },
  "30": { text: "text-fuchsia-200", ring: "border-fuchsia-400/50", glow: "shadow-fuchsia-500/30" },
  "20": { text: "text-orange-200", ring: "border-orange-400/50", glow: "shadow-orange-500/30" },
  "10": { text: "text-orange-200", ring: "border-orange-400/60", glow: "shadow-orange-500/40" },
  "5": { text: "text-rose-200", ring: "border-rose-400/60", glow: "shadow-rose-500/40" },
  "0.5": { text: "text-gold-400", ring: "border-gold-400/70", glow: "shadow-gold-500/40" },
};

export function tierAccent(tier: ClubTier | null) {
  return TIER_ACCENT[String(tier ?? 90)] ?? TIER_ACCENT["90"];
}

/** Renders a question's artwork from the local asset registry (§29–30). */
export function ClubVisualView({
  visual,
  className = "",
}: {
  visual: ClubVisual | null | undefined;
  className?: string;
}) {
  if (!visual) return null;
  if (visual.type === "image") {
    return (
      <img
        src={`/club/${visual.assetId}.png`}
        alt={visual.altText}
        className={`mx-auto h-auto w-full object-contain ${className}`}
      />
    );
  }
  const Art = CLUB_VISUALS[visual.assetId];
  if (!Art) return null;
  return (
    <figure className={`mx-auto ${className}`} role="img" aria-label={visual.altText}>
      <Art />
    </figure>
  );
}

/** The tier label, sized for whichever screen it lands on. */
export function TierBadge({ tier, className = "" }: { tier: ClubTier | null; className?: string }) {
  if (tier === null) return null;
  const accent = tierAccent(tier);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1 font-black tracking-wide ${accent.ring} ${accent.text} ${className}`}
    >
      {tier}% QUESTION
    </span>
  );
}

function useServerCountdown(endsAt: number | null, clockOffset: number, paused: boolean) {
  const remaining = () => (endsAt === null ? 0 : Math.max(0, endsAt - (Date.now() + clockOffset)));
  const [leftMs, setLeftMs] = useState(remaining);

  useEffect(() => {
    setLeftMs(remaining());
    if (paused || endsAt === null) return;
    const id = window.setInterval(() => setLeftMs(remaining()), 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, clockOffset, paused]);

  return leftMs;
}

/** Big server-authoritative clock (§16 — the server owns the deadline). */
export function ClubTimer({
  endsAt,
  totalSeconds,
  clockOffset,
  paused,
  big,
}: {
  endsAt: number | null;
  totalSeconds: number;
  clockOffset: number;
  paused: boolean;
  big?: boolean;
}) {
  const leftMs = useServerCountdown(endsAt, clockOffset, paused);
  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.min(1, leftMs / (totalSeconds * 1000));
  const urgent = leftMs <= 5000 && !paused;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="w-full">
      <div
        className={`text-center font-black tabular-nums ${
          urgent ? "text-rose-300" : "text-slate-200"
        } ${big ? "text-6xl md:text-8xl" : "text-2xl"}`}
      >
        {paused ? "PAUSED" : `${mm}:${ss}`}
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            urgent ? "bg-rose-400" : "bg-gradient-to-r from-sky-400 to-violet-400"
          }`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}

/** The 3… 2… 1… before a question appears. */
export function IntroCountdown({
  endsAt,
  clockOffset,
  className = "",
}: {
  endsAt: number | null;
  clockOffset: number;
  className?: string;
}) {
  const leftMs = useServerCountdown(endsAt, clockOffset, false);
  const seconds = Math.ceil(leftMs / 1000);
  if (seconds > 3 || seconds <= 0) return null;
  return (
    <div key={seconds} className={`animate-pop-in text-8xl font-black md:text-9xl ${className}`}>
      {seconds}
    </div>
  );
}

/** Lobby / in-play player chips. Never shows who has answered (§12). */
export function ClubPlayerChips({
  players,
  showStatus,
  className = "",
}: {
  players: ClubPlayerView[];
  showStatus?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap justify-center gap-2.5 ${className}`}>
      {players.map((p) => (
        <span
          key={p.id}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 font-bold animate-pop-in md:px-5 md:py-2.5 md:text-xl ${
            showStatus && !p.winnerEligible
              ? "border-white/10 bg-white/5 text-slate-400"
              : "border-white/15 bg-white/5"
          } ${p.connected ? "" : "opacity-50"}`}
        >
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}
          {!p.connected && " 📵"}
          {showStatus && !p.winnerEligible && " 🎈"}
        </span>
      ))}
    </div>
  );
}

/** End-of-game table: correct answers, passes left, and who won. */
export function ClubStandings({
  players,
  winnerIds,
  highlightId,
  showScores,
}: {
  players: ClubPlayerView[];
  winnerIds: string[];
  highlightId?: string;
  showScores: boolean;
}) {
  const sorted = [...players].sort(
    (a, b) =>
      Number(winnerIds.includes(b.id)) - Number(winnerIds.includes(a.id)) ||
      b.correctCount - a.correctCount ||
      b.survivedRounds - a.survivedRounds
  );
  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const won = winnerIds.includes(p.id);
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
              won
                ? "border-gold-400/70 bg-gold-500/10"
                : p.id === highlightId
                  ? "border-sky-400/50 bg-sky-500/10"
                  : "border-white/10 bg-white/5"
            }`}
          >
            <span className="w-8 text-center text-2xl">{won ? "🏆" : "•"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-black">
                {p.name}
                {p.id === highlightId && " (you)"}
              </div>
              <div className="text-xs text-slate-400">
                {p.correctCount} correct
                {p.passesRemaining !== null && ` · ${p.passesRemaining} pass left`}
              </div>
            </div>
            {showScores && (
              <span className="text-2xl font-black tabular-nums text-sky-200">{p.correctCount}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
