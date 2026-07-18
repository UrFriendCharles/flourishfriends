import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  type CreateRoomRequest,
  type CreateRoomResponse,
} from "../src/logic/roomProtocol";
import { GameRoom } from "./gameRoom";

export { GameRoom };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

// Only /api/* and /ws/* reach this worker (run_worker_first in wrangler.jsonc);
// everything else is served straight from static assets.

function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join("");
}

function roomStub(env: Env, code: string): DurableObjectStub {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: CreateRoomRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const hostKey = crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = randomRoomCode();
    const res = await roomStub(env, roomCode).fetch("https://room/init", {
      method: "POST",
      body: JSON.stringify({ roomCode, hostKey, settings: body.settings, questions: body.questions }),
    });
    if (res.status === 201) {
      const payload: CreateRoomResponse = { roomCode, hostKey };
      return Response.json(payload, { status: 201 });
    }
    if (res.status === 400) return res; // invalid settings/questions — don't retry
    // 409: code collision with an active room — try another code
  }
  return Response.json({ error: "could not allocate a room code" }, { status: 503 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(request, env);
    }

    const infoMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z]+)$/);
    if (request.method === "GET" && infoMatch) {
      const code = infoMatch[1].toUpperCase();
      if (!isValidRoomCode(code)) {
        return Response.json({ exists: false, status: null, playerCount: 0, canJoin: false });
      }
      return roomStub(env, code).fetch("https://room/exists");
    }

    const wsMatch = url.pathname.match(/^\/ws\/([A-Za-z]+)$/);
    if (wsMatch) {
      const code = wsMatch[1].toUpperCase();
      if (!isValidRoomCode(code)) return new Response("bad room code", { status: 400 });
      return roomStub(env, code).fetch(new Request("https://room/ws", request));
    }

    return env.ASSETS.fetch(request);
  },
};
