import { rememberPlayedQuestions, selectClubQuestions } from "./clubSelect";
import type { ClubSettings, CreateClubRoomRequest, CreateClubRoomResponse } from "./clubProtocol";

/**
 * Create a 0.5% Club room (TV or head to head). The eleven questions are picked
 * here, one per tier, so the worker only ever sees the ones being played.
 */
export async function createClubRoom(settings: ClubSettings): Promise<CreateClubRoomResponse> {
  const questions = selectClubQuestions();
  const body: CreateClubRoomRequest = { settings, questions };
  const res = await fetch("/api/club/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create club room failed: ${res.status}`);
  const created = (await res.json()) as CreateClubRoomResponse;
  rememberPlayedQuestions(questions.map((q) => q.id));
  return created;
}
