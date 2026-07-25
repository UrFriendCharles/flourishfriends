import type { Collection, Difficulty, GameSettings, Question } from "../types";

// Shared contract between the browser and the GameRoom Durable Object.
// The worker imports this file too, so keep it dependency-light: types,
// constants, and pure helpers only (no data/ imports — they'd bloat the
// worker bundle with the whole country dataset).

export type RoomStatus = "lobby" | "question" | "reveal" | "ended";

export const MAX_ROOM_PLAYERS = 8;
export const ROOM_CODE_LENGTH = 4;
// no I/L/O — too easy to misread on a TV across the room
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

export const ROOM_PLAYER_COLORS = [
  "#38bdf8", // sky
  "#fb7185", // rose
  "#4ade80", // green
  "#facc15", // yellow
  "#c084fc", // purple
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f472b6", // pink
];

export interface RoomPlayerView {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  /** locked in an answer for the current question (choice stays hidden) */
  answered: boolean;
  /** filled in during reveal/ended; null = didn't answer that question */
  lastAnswer: { choice: string; correct: boolean; pointsEarned: number; timeMs: number } | null;
}

export interface RoomSettingsView {
  collection: Collection;
  difficulty: Difficulty;
  questionCount: number;
  timerSeconds: number | null;
  speedBonusEnabled: boolean;
}

export interface RoomSnapshot {
  roomCode: string;
  status: RoomStatus;
  players: RoomPlayerView[];
  hostConnected: boolean;
  settings: RoomSettingsView;
  questionIndex: number; // 0-based
  totalQuestions: number;
  /** current flag/silhouette + choices; correctAnswer intentionally absent until reveal */
  question: {
    flagImage: string;
    choices: string[];
    kind?: "flag" | "capital" | "shape";
    silhouette?: boolean;
    prompt?: string;
  } | null;
  correctAnswer: string | null; // reveal/ended only
  countryId: string | null; // reveal/ended only — clients look up facts locally
  questionStartedAt: number; // server clock, epoch ms
  questionDeadline: number | null; // server clock; null = no timer
  serverNow: number; // lets clients compute clock offset for countdowns
  finishedAt: number | null;
}

/** Private per-connection data sent alongside every snapshot. */
export interface YouView {
  playerId: string;
  choice: string | null; // your own locked-in choice for the current question
}

export type ClientMessage =
  | { type: "hello"; role: "player"; name: string; playerId?: string }
  | { type: "hello"; role: "host"; hostKey: string }
  | { type: "hello"; role: "display" }
  | { type: "answer"; choice: string }
  | { type: "start" }
  | { type: "reveal" }
  | { type: "next" }
  | { type: "end" };

export type RoomErrorCode =
  | "room-not-found"
  | "room-full"
  | "already-started"
  | "bad-key"
  | "invalid";

export type ServerMessage =
  | { type: "state"; snapshot: RoomSnapshot; you: YouView | null }
  | { type: "error"; code: RoomErrorCode; message: string };

// REST API shapes (POST /api/rooms, GET /api/rooms/:code)

export interface CreateRoomRequest {
  settings: GameSettings;
  questions: Question[];
}

export interface CreateRoomResponse {
  roomCode: string;
  hostKey: string;
}

export interface RoomInfoResponse {
  exists: boolean;
  status: RoomStatus | null;
  playerCount: number;
  canJoin: boolean;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return (
    code.length === ROOM_CODE_LENGTH &&
    [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch))
  );
}
