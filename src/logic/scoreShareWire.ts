import type { Collection, Difficulty, GameMode, ScoreShare } from "../types";

// DOM-free score-share wire format, shared by the client and the Cloudflare
// worker (which decodes it to render social-preview cards). Nothing here may
// touch `window` — the worker tsconfig has no DOM lib. Client-only helpers
// (shareUrl, shareText) live in scoreSharing.ts.
//
// The payload is versioned base64url(compact JSON); keep old versions decoding.

interface WirePayload {
  v: 1;
  n: string; // playerName
  s: number; // score
  a: number; // accuracy
  b: number; // bestStreak
  t: number; // totalQuestions
  c: number; // correctAnswers
  d: Difficulty;
  m: GameMode;
  o: Collection;
  ti: 0 | 1; // timerUsed
  ty: 0 | 1; // typed
  ca: number; // createdAt
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  try {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeShare(share: ScoreShare): string {
  const payload: WirePayload = {
    v: 1,
    n: share.playerName.slice(0, 30),
    s: share.score,
    a: share.accuracy,
    b: share.bestStreak,
    t: share.totalQuestions,
    c: share.correctAnswers,
    d: share.difficulty,
    m: share.mode,
    o: share.collection,
    ti: share.timerUsed ? 1 : 0,
    ty: share.typed ? 1 : 0,
    ca: share.createdAt,
  };
  return toBase64Url(JSON.stringify(payload));
}

const DIFFICULTIES = new Set<string>(["easy", "medium", "hard"]);
const MODES = new Set<string>(["classic", "learning"]);
const COLLECTIONS = new Set<string>([
  "world",
  "usStates",
  "usCapitals",
  "worldCapitals",
  "worldShapes",
  "everything",
]);

function asCount(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? Math.round(value)
    : null;
}

/** Decode a URL payload back into a ScoreShare. Null if malformed. */
export function decodeShare(shareId: string, payload: string): ScoreShare | null {
  const json = fromBase64Url(payload);
  if (!json) return null;
  let raw: Partial<WirePayload>;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (raw.v !== 1 || typeof raw.n !== "string") return null;
  const score = asCount(raw.s, 1_000_000);
  const accuracy = asCount(raw.a, 100);
  const bestStreak = asCount(raw.b, 10_000);
  const totalQuestions = asCount(raw.t, 10_000);
  const correctAnswers = asCount(raw.c, 10_000);
  const createdAt = asCount(raw.ca, 100_000_000_000_000);
  if (
    score === null ||
    accuracy === null ||
    bestStreak === null ||
    totalQuestions === null ||
    correctAnswers === null ||
    createdAt === null ||
    !DIFFICULTIES.has(raw.d ?? "") ||
    !MODES.has(raw.m ?? "") ||
    !COLLECTIONS.has(raw.o ?? "")
  ) {
    return null;
  }
  return {
    shareId,
    playerName: raw.n.slice(0, 30).trim() || "A player",
    score,
    accuracy,
    bestStreak,
    totalQuestions,
    correctAnswers,
    difficulty: raw.d as Difficulty,
    mode: raw.m as GameMode,
    collection: raw.o as Collection,
    timerUsed: raw.ti === 1,
    typed: raw.ty === 1,
    createdAt,
  };
}

/** Human label for a collection, e.g. for share copy. */
export function collectionLabel(collection: Collection): string {
  switch (collection) {
    case "usStates":
      return "US state flags";
    case "usCapitals":
      return "state capitals";
    case "worldCapitals":
      return "world capitals";
    case "worldShapes":
      return "country outlines";
    case "everything":
      return "mixed quiz questions";
    default:
      return "world flags";
  }
}

/** Title + description for the social-preview card (used by the worker). */
export function shareOgTitle(share: ScoreShare): string {
  return `${share.playerName} scored ${share.score} — Flourish Friends Flag Quiz`;
}

export function shareOgDescription(share: ScoreShare): string {
  return (
    `${share.correctAnswers}/${share.totalQuestions} ${collectionLabel(share.collection)} · ` +
    `${share.accuracy}% accuracy · ${share.difficulty} · best streak ${share.bestStreak}. ` +
    `Think you can beat that?`
  );
}
