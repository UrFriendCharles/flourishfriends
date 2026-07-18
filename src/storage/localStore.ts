import type {
  GameHistoryEntry,
  GameSettings,
  GameState,
  HighScoreEntry,
} from "../types";

const PREFIX = "ffq:";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

// --- saved players (names + colors, reused between games) ---

export interface SavedPlayer {
  name: string;
  color: string;
}

export const loadSavedPlayers = (): SavedPlayer[] => read<SavedPlayer[]>("players") ?? [];
export const saveSavedPlayers = (players: SavedPlayer[]) => write("players", players);

// --- settings ---

export const loadSettings = (): GameSettings | null => read<GameSettings>("settings");
export const saveSettings = (settings: GameSettings) => write("settings", settings);

// --- high scores ---

const MAX_HIGH_SCORES = 100;

export const loadHighScores = (): HighScoreEntry[] => read<HighScoreEntry[]>("highScores") ?? [];

export function addHighScores(entries: HighScoreEntry[]): void {
  const all = [...loadHighScores(), ...entries]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);
  write("highScores", all);
}

/** Best previous score for the same player + category, or null. */
export function personalBest(entry: {
  playerName: string;
  mode: string;
  difficulty: string;
  questionCount: number;
  timed: boolean;
}): number | null {
  const matches = loadHighScores().filter(
    (h) =>
      h.playerName === entry.playerName &&
      h.mode === entry.mode &&
      h.difficulty === entry.difficulty &&
      h.questionCount === entry.questionCount &&
      h.timed === entry.timed
  );
  return matches.length ? Math.max(...matches.map((h) => h.score)) : null;
}

// --- game history ---

const MAX_HISTORY = 50;

export const loadHistory = (): GameHistoryEntry[] => read<GameHistoryEntry[]>("history") ?? [];

export function addHistory(entry: GameHistoryEntry): void {
  write("history", [entry, ...loadHistory()].slice(0, MAX_HISTORY));
}

// --- missed flags (countryId -> miss count) ---

export const loadMissedFlags = (): Record<string, number> =>
  read<Record<string, number>>("missedFlags") ?? {};

export function addMissedFlags(countryIds: string[]): void {
  const missed = loadMissedFlags();
  for (const id of countryIds) missed[id] = (missed[id] ?? 0) + 1;
  write("missedFlags", missed);
}

// --- in-progress game (Continue Game) ---

export const loadSavedGame = (): GameState | null => read<GameState>("lastGame");
export const saveGame = (state: GameState) => write("lastGame", state);
export const clearSavedGame = () => remove("lastGame");
