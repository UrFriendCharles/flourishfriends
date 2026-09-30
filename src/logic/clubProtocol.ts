// Shared contract between the browser and the ClubRoom Durable Object for
// 0.5% Club. The worker imports this file, so keep it dependency-light:
// types, constants, and pure helpers only (no data/ imports — they'd pull the
// whole question bank into the worker bundle).

export const CLUB_GAME_TYPE = "half-percent-club";

/**
 * The eleven difficulty tiers, in play order. The label is the share of
 * players who "should" solve it — for V1 it's an authored difficulty label,
 * not a measured solve rate (see §11 of the spec).
 */
export const CLUB_TIERS = [90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0.5] as const;
export type ClubTier = (typeof CLUB_TIERS)[number];

export const CLUB_ROUND_COUNT = CLUB_TIERS.length; // 11
export const FINAL_TIER: ClubTier = 0.5;
/** The 0.5% round is index 10; the 5% semifinal is index 9. */
export const FINAL_ROUND_INDEX = CLUB_ROUND_COUNT - 1;

export const MAX_CLUB_PLAYERS = 10;
/** Head-to-head rooms are exactly two phones and have no host. */
export const CLUB_H2H_PLAYERS = 2;
/** Head to head: pause once both phones are in, then how long each reveal stays up. */
export const CLUB_H2H_START_DELAY_MS = 3500;
export const CLUB_H2H_REVEAL_MS = 9000;

/** Seconds the round-intro card ("60% — 3… 2… 1…") holds before the question. */
export const ROUND_INTRO_SECONDS = 4;
/** The final round gets a longer, louder build-up. */
export const FINAL_INTRO_SECONDS = 7;

export const CLUB_TIMER_CHOICES = [15, 20, 30, 45, 60] as const;
export const CLUB_PASS_CHOICES = [0, 1, 2] as const;

export const CLUB_PLAYER_COLORS = [
  "#38bdf8", // sky
  "#fb7185", // rose
  "#4ade80", // green
  "#facc15", // yellow
  "#c084fc", // purple
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f472b6", // pink
  "#a3e635", // lime
  "#60a5fa", // blue
];

/** "survival" = Classic Survival, "highscore" = Unlimited Pass / High Score. */
export type ClubMode = "survival" | "highscore";

export type ClubPack = "all";

export type ClubAnswerType =
  | "multiple_choice"
  | "text"
  | "number"
  | "true_false"
  | "image_choice"
  | "visual_multiple_choice";

export interface ClubVisual {
  /** "svg" = drawn by a registered component; "image" = a file under /club/. */
  type: "svg" | "image";
  assetId: string;
  altText: string;
}

/** Full question record — lives in the client bank and server-side in the room. */
export interface ClubQuestion {
  id: string;
  difficulty: ClubTier;
  questionType: ClubAnswerType;
  prompt: string;
  /** multiple_choice / visual_multiple_choice / image_choice */
  choices?: string[];
  /** image_choice: one visual per choice, parallel to `choices` */
  choiceVisuals?: ClubVisual[];
  correctAnswer: string;
  /** extra spellings accepted for text answers (matching is already forgiving) */
  acceptedAnswers?: string[];
  explanation: string;
  /** overrides the room timer when a puzzle genuinely needs longer */
  timerSeconds?: number;
  visual?: ClubVisual | null;
  category: string;
  mechanic: string;
  sourceType: "source" | "adapted" | "original";
  sourceReference?: string | null;
}

/** What players are allowed to see while the question is live. */
export interface ClubQuestionView {
  id: string;
  difficulty: ClubTier;
  questionType: ClubAnswerType;
  prompt: string;
  choices?: string[];
  choiceVisuals?: ClubVisual[];
  visual?: ClubVisual | null;
}

export type ClubStatus =
  | "lobby"
  | "intro" // how-to-play card, waiting on the host
  | "round_intro" // "60% — 3… 2… 1…", server-timed
  | "question"
  | "reveal" // answer + explanation + round results
  | "ended";

/** Mirrors §40 of the spec. `winnerEligible` is tracked separately from play. */
export type ClubPlayerStatus = "active" | "passed" | "playing_for_fun" | "winner";

export interface ClubPlayerResult {
  /** what they submitted; null when they ran out of time */
  answer: string | null;
  correct: boolean;
  passed: boolean;
  timedOut: boolean;
  timeMs: number | null;
  /** they lost winner eligibility on this round (Classic Survival only) */
  eliminatedHere: boolean;
}

export interface ClubPlayerView {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  status: ClubPlayerStatus;
  winnerEligible: boolean;
  /** null in High Score mode — passes are unlimited there */
  passesRemaining: number | null;
  correctCount: number;
  /** locked in (or passed) this round — the choice itself stays private */
  answerLocked: boolean;
  usedPassThisRound: boolean;
  survivedRounds: number;
  /** reveal/ended only */
  lastResult: ClubPlayerResult | null;
}

export interface ClubSettings {
  mode: ClubMode;
  timerSeconds: number;
  /** starting Passes in Classic Survival; ignored in High Score mode */
  passes: number;
  pack: ClubPack;
  /** two phones, no host: the room starts and advances by itself */
  headToHead?: boolean;
}

/** Per-question aggregates, handed back at the end of the game (§36). */
export interface ClubQuestionStat {
  questionId: string;
  difficulty: ClubTier;
  attempts: number;
  correct: number;
  incorrect: number;
  passes: number;
  timeouts: number;
  averageMs: number | null;
  medianMs: number | null;
  /** correct / attempts, as a percentage — compare against `difficulty` */
  solveRate: number | null;
}

export interface ClubSnapshot {
  gameType: typeof CLUB_GAME_TYPE;
  roomCode: string;
  status: ClubStatus;
  settings: ClubSettings;
  players: ClubPlayerView[];
  hostConnected: boolean;
  roundIndex: number; // 0-based; -1 before the first round
  totalRounds: number;
  difficulty: ClubTier | null;
  question: ClubQuestionView | null;
  /** reveal/ended only */
  correctAnswer: string | null;
  explanation: string | null;
  /** server clock, epoch ms */
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  /** round_intro only: when the question takes over */
  introEndsAt: number | null;
  paused: boolean;
  serverNow: number;
  answersLocked: number;
  playersInPlay: number;
  eligibleCount: number;
  finishedAt: number | null;
  /** ended only: ids of the winners (may be several — co-winners are fine) */
  winnerIds: string[] | null;
  /** ended only */
  questionStats: ClubQuestionStat[] | null;
  /** head to head: server time the room moves on by itself (start / next round) */
  autoAdvanceAt: number | null;
  /** head to head: a player set up a rematch room — the other can follow this code */
  rematch: { roomCode: string; byId: string } | null;
}

/** Private per-connection data sent alongside every snapshot. */
export interface ClubYouView {
  playerId: string;
  /** your locked-in answer for the current round, if any */
  answer: string | null;
  passed: boolean;
  canPass: boolean;
  passesRemaining: number | null;
  winnerEligible: boolean;
  /** reveal only: whether you personally got it */
  lastResult: ClubPlayerResult | null;
}

export type ClubClientMessage =
  | { type: "hello"; role: "player"; name: string; playerId?: string }
  | { type: "hello"; role: "host"; hostKey: string }
  | { type: "hello"; role: "display" }
  | { type: "answer"; answer: string }
  | { type: "pass" }
  | { type: "rematch"; roomCode: string } // player (head to head): point the other phone at a new room
  | { type: "start" } // lobby → intro → first round
  | { type: "next" } // reveal → next round
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" };

export type ClubErrorCode =
  | "room-not-found"
  | "room-full"
  | "already-started"
  | "bad-key"
  | "invalid";

export type ClubServerMessage =
  | { type: "state"; snapshot: ClubSnapshot; you: ClubYouView | null }
  | { type: "error"; code: ClubErrorCode; message: string };

// REST shapes (POST /api/club/rooms)

export interface CreateClubRoomRequest {
  settings: ClubSettings;
  questions: ClubQuestion[];
}

export interface CreateClubRoomResponse {
  roomCode: string;
  hostKey: string;
}

// ---------- pure helpers (used by both the worker and the client) ----------

/** How a tier is written on screen: 90 → "90%", 0.5 → "0.5%". */
export function tierLabel(tier: ClubTier): string {
  return `${tier}%`;
}

export function isFinalRound(roundIndex: number): boolean {
  return roundIndex === FINAL_ROUND_INDEX;
}

/**
 * Forgiving normalization for typed answers: case, accents, punctuation,
 * leading articles, and doubled spaces all stop mattering.
 */
export function normalizeClubAnswer(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/, "");
}

/** Digits only, for number questions ("14 triangles" → 14). */
function parseNumberAnswer(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Server-side correctness check for every V1 answer type. */
export function clubAnswerCorrect(question: ClubQuestion, submitted: string): boolean {
  if (question.questionType === "number") {
    const given = parseNumberAnswer(submitted);
    const want = parseNumberAnswer(question.correctAnswer);
    if (given === null || want === null) return false;
    if (given === want) return true;
    return (question.acceptedAnswers ?? []).some((alt) => parseNumberAnswer(alt) === given);
  }
  const given = normalizeClubAnswer(submitted);
  if (!given) return false;
  const accepted = [question.correctAnswer, ...(question.acceptedAnswers ?? [])];
  return accepted.some((alt) => normalizeClubAnswer(alt) === given);
}

/** A question is playable only if it has everything §35 demands. */
export function validateClubQuestion(q: ClubQuestion): string | null {
  if (!q || typeof q !== "object") return "not an object";
  if (typeof q.id !== "string" || !q.id) return "missing id";
  if (!(CLUB_TIERS as readonly number[]).includes(q.difficulty)) return `bad difficulty on ${q.id}`;
  if (typeof q.prompt !== "string" || !q.prompt.trim()) return `missing prompt on ${q.id}`;
  if (typeof q.correctAnswer !== "string" || !q.correctAnswer.trim()) {
    return `missing correct answer on ${q.id}`;
  }
  if (typeof q.explanation !== "string" || !q.explanation.trim()) {
    return `missing explanation on ${q.id}`;
  }
  if (
    q.timerSeconds !== undefined &&
    (typeof q.timerSeconds !== "number" || q.timerSeconds < 5 || q.timerSeconds > 180)
  ) {
    return `bad timer on ${q.id}`;
  }
  const needsChoices =
    q.questionType === "multiple_choice" ||
    q.questionType === "visual_multiple_choice" ||
    q.questionType === "image_choice";
  if (needsChoices) {
    if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) {
      return `bad choices on ${q.id}`;
    }
    if (!q.choices.includes(q.correctAnswer)) return `answer not among choices on ${q.id}`;
    if (q.questionType === "image_choice") {
      if (!Array.isArray(q.choiceVisuals) || q.choiceVisuals.length !== q.choices.length) {
        return `image_choice needs one visual per choice on ${q.id}`;
      }
    }
  }
  if (q.questionType === "true_false") {
    const ok = ["true", "false"].includes(normalizeClubAnswer(q.correctAnswer));
    if (!ok) return `true/false answer must be true or false on ${q.id}`;
  }
  if (q.questionType === "visual_multiple_choice" && !q.visual) {
    return `visual_multiple_choice needs a visual on ${q.id}`;
  }
  if (q.visual) {
    if (!q.visual.assetId || !q.visual.altText) return `visual needs assetId + altText on ${q.id}`;
  }
  return null;
}
