import { CLUB_QUESTIONS, CLUB_QUESTIONS_BY_TIER } from "../data/clubQuestions";
import { CLUB_TIERS, validateClubQuestion, type ClubQuestion, type ClubTier } from "./clubProtocol";

// Question selection for a game (§38): one active question per tier, never
// repeating inside a room, and preferring puzzles this device hasn't shown
// lately. Runs on the host's browser — the worker only ever receives the
// eleven chosen questions.

const RECENT_KEY = "ffq:club:recent";
const RECENT_LIMIT = 60;

/** Question ids this device has played, most recent first. */
function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberPlayedQuestions(ids: string[]): void {
  try {
    const merged = [...ids, ...loadRecent().filter((id) => !ids.includes(id))];
    localStorage.setItem(RECENT_KEY, JSON.stringify(merged.slice(0, RECENT_LIMIT)));
  } catch {
    // private browsing / storage disabled — selection just loses its memory
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One question per tier, in play order (90% → 0.5%). Least-recently-played
 * first, shuffled inside each recency band so the same device doesn't get the
 * same ladder twice running.
 */
export function selectClubQuestions(): ClubQuestion[] {
  const recent = loadRecent();
  const recencyRank = (q: ClubQuestion) => {
    const at = recent.indexOf(q.id);
    return at === -1 ? Number.MAX_SAFE_INTEGER : recent.length - at; // never played = coldest
  };

  return CLUB_TIERS.map((tier) => {
    const pool = (CLUB_QUESTIONS_BY_TIER[String(tier)] ?? []).filter(
      (q) => validateClubQuestion(q) === null
    );
    if (pool.length === 0) {
      throw new Error(`0.5% Club: no playable question for the ${tier}% tier`);
    }
    const ranked = shuffle(pool).sort((a, b) => recencyRank(b) - recencyRank(a));
    return ranked[0];
  });
}

/** Bank health, surfaced in setup so a broken question can't reach a room. */
export interface ClubBankReport {
  total: number;
  perTier: { tier: ClubTier; count: number }[];
  problems: string[];
}

export function clubBankReport(): ClubBankReport {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const q of CLUB_QUESTIONS) {
    if (seen.has(q.id)) problems.push(`duplicate id ${q.id}`);
    seen.add(q.id);
    const issue = validateClubQuestion(q);
    if (issue) problems.push(issue);
  }
  const perTier = CLUB_TIERS.map((tier) => {
    const count = (CLUB_QUESTIONS_BY_TIER[String(tier)] ?? []).length;
    if (count === 0) problems.push(`no questions for the ${tier}% tier`);
    return { tier, count };
  });
  return { total: CLUB_QUESTIONS.length, perTier, problems };
}
