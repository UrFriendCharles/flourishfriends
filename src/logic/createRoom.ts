import type { GameSettings } from "../types";
import type { CreateRoomRequest, CreateRoomResponse, RoomSettingsView } from "./roomProtocol";
import { DEFAULT_SETTINGS } from "./gameReducer";
import { generateQuestions, withRoomHints } from "./questionGen";

/**
 * Create a flag-quiz room (TV or head to head). Questions and hint lines are
 * generated here on the creating device so the worker never needs the dataset.
 */
export async function createFlagRoom(settings: GameSettings): Promise<CreateRoomResponse> {
  const questions = generateQuestions(
    settings.questionCount,
    settings.difficulty,
    settings.continents,
    settings.collection
  );
  const body: CreateRoomRequest = {
    settings,
    questions: settings.hintsEnabled ? withRoomHints(questions) : questions,
  };
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create room failed: ${res.status}`);
  return (await res.json()) as CreateRoomResponse;
}

/** Rebuild full settings from a room's public view (for a same-rules rematch). */
export function settingsFromRoom(view: RoomSettingsView): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    mode: "classic",
    answerStyle: "choices",
    lifelinesEnabled: false,
    continents: [],
    collection: view.collection,
    difficulty: view.difficulty,
    questionCount: view.questionCount,
    timerSeconds: view.timerSeconds,
    speedBonusEnabled: view.speedBonusEnabled,
    hintsEnabled: view.hintsEnabled,
    hintGuessRound: false,
    headToHead: view.headToHead,
  };
}

/** Link a friend taps to join a room. */
export function joinLink(roomCode: string): string {
  return `${window.location.origin}/join/${roomCode}`;
}
