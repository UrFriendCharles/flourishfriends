import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isValidRoomCode,
  type CreateRoomRequest,
  type CreateRoomResponse,
} from "../src/logic/roomProtocol";
import { CLUB_GAME_TYPE, type CreateClubRoomRequest } from "../src/logic/clubProtocol";
import { decodeShare, shareOgDescription, shareOgTitle } from "../src/logic/scoreShareWire";
import { renderScoreCard } from "./og";
import { GameRoom } from "./gameRoom";
import { ClubRoom } from "./clubRoom";

export { GameRoom, ClubRoom };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  CLUB_ROOM: DurableObjectNamespace;
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

function clubStub(env: Env, code: string): DurableObjectStub {
  return env.CLUB_ROOM.get(env.CLUB_ROOM.idFromName(code));
}

interface RoomExistsPayload {
  exists: boolean;
  status: string | null;
  playerCount: number;
  canJoin: boolean;
  gameType?: string | null;
}

async function roomExists(stub: DurableObjectStub): Promise<RoomExistsPayload> {
  const res = await stub.fetch("https://room/exists");
  return (await res.json()) as RoomExistsPayload;
}

/**
 * Every game shares one room-code space, so a code handed out for 0.5% Club
 * can never collide with a live flag-quiz room (and vice versa) — players type
 * four letters and land in the right game.
 */
async function claimRoomCode(
  makeInit: (code: string, hostKey: string) => { stub: DurableObjectStub; body: unknown },
  otherNamespace: (code: string) => DurableObjectStub
): Promise<Response> {
  const hostKey = crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = randomRoomCode();
    if ((await roomExists(otherNamespace(roomCode))).exists) continue; // in use by the other game
    const { stub, body } = makeInit(roomCode, hostKey);
    const res = await stub.fetch("https://room/init", {
      method: "POST",
      body: JSON.stringify(body),
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

async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: CreateRoomRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  return claimRoomCode(
    (roomCode, hostKey) => ({
      stub: roomStub(env, roomCode),
      body: { roomCode, hostKey, settings: body.settings, questions: body.questions },
    }),
    (code) => clubStub(env, code)
  );
}

async function createClubRoom(request: Request, env: Env): Promise<Response> {
  let body: CreateClubRoomRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  return claimRoomCode(
    (roomCode, hostKey) => ({
      stub: clubStub(env, roomCode),
      body: { roomCode, hostKey, settings: body.settings, questions: body.questions },
    }),
    (code) => roomStub(env, code)
  );
}

// Sets one attribute on the matched element (used to rewrite <meta> tags).
class AttrSetter {
  constructor(
    private attr: string,
    private value: string
  ) {}
  element(el: Element) {
    el.setAttribute(this.attr, this.value);
  }
}

// Replaces an element's text content (used for <title>).
class TextSetter {
  constructor(private value: string) {}
  element(el: Element) {
    el.setInnerContent(this.value, { html: false });
  }
}

// Serve index.html for a /score/ link with Open Graph tags rewritten to the
// shared score, so it unfurls as a rich card instead of a bare URL. The SPA
// still reads the same ?s= payload on the client to render the live page.
async function renderScorePage(
  env: Env,
  url: URL,
  shareId: string,
  encoded: string | null
): Promise<Response> {
  const html = await env.ASSETS.fetch(new Request(new URL("/index.html", url.origin)));
  const share = encoded ? decodeShare(shareId, encoded) : null;
  if (!share) return html; // no/invalid payload — keep the default card

  const title = shareOgTitle(share);
  const desc = shareOgDescription(share);
  const canonical = `${url.origin}/score/${shareId}?s=${encodeURIComponent(encoded!)}`;
  const image = `${url.origin}/api/og/score?s=${encodeURIComponent(encoded!)}`;

  return new HTMLRewriter()
    .on("title", new TextSetter(title))
    .on('meta[property="og:title"]', new AttrSetter("content", title))
    .on('meta[name="twitter:title"]', new AttrSetter("content", title))
    .on('meta[property="og:description"]', new AttrSetter("content", desc))
    .on('meta[name="twitter:description"]', new AttrSetter("content", desc))
    .on('meta[name="description"]', new AttrSetter("content", desc))
    .on('meta[property="og:url"]', new AttrSetter("content", canonical))
    .on('meta[property="og:image"]', new AttrSetter("content", image))
    .on('meta[name="twitter:image"]', new AttrSetter("content", image))
    .transform(html);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/club/rooms") {
      return createClubRoom(request, env);
    }

    // Personalized social-preview image for a shared score
    if (request.method === "GET" && url.pathname === "/api/og/score") {
      const encoded = url.searchParams.get("s");
      const share = encoded ? decodeShare("og", encoded) : null;
      const png = share ? await renderScoreCard(share, env.ASSETS, url.origin) : null;
      if (!png) {
        // fall back to the branded default card
        return env.ASSETS.fetch(new Request(new URL("/og-default.png", url.origin)));
      }
      return new Response(png, {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Rich unfurl for shared score links
    const scoreMatch = url.pathname.match(/^\/score\/([a-zA-Z0-9_-]+)\/?$/);
    if (request.method === "GET" && scoreMatch) {
      return renderScorePage(env, url, scoreMatch[1], url.searchParams.get("s"));
    }

    // One lookup for every game: the phone asks about a code and gets told
    // which controller to open.
    const infoMatch = url.pathname.match(/^\/api\/rooms\/([A-Za-z]+)$/);
    if (request.method === "GET" && infoMatch) {
      const code = infoMatch[1].toUpperCase();
      if (!isValidRoomCode(code)) {
        return Response.json({
          exists: false,
          status: null,
          playerCount: 0,
          canJoin: false,
          gameType: null,
        });
      }
      const flag = await roomExists(roomStub(env, code));
      if (flag.exists) return Response.json({ ...flag, gameType: "flag" });
      const club = await roomExists(clubStub(env, code));
      if (club.exists) return Response.json({ ...club, gameType: CLUB_GAME_TYPE });
      return Response.json({
        exists: false,
        status: null,
        playerCount: 0,
        canJoin: false,
        gameType: null,
      });
    }

    // /ws/c/:code is 0.5% Club; /ws/:code stays the flag quiz.
    const clubWsMatch = url.pathname.match(/^\/ws\/c\/([A-Za-z]+)$/);
    if (clubWsMatch) {
      const code = clubWsMatch[1].toUpperCase();
      if (!isValidRoomCode(code)) return new Response("bad room code", { status: 400 });
      return clubStub(env, code).fetch(new Request("https://room/ws", request));
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
