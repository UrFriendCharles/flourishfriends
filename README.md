# Flourish Friends Flag Quiz 🌍

A mobile-first, game-show-style flag quiz. Play solo or pass-and-play on one
device (all local, no backend), or host a **TV room** where everyone answers
on their own phone (Cloudflare Durable Objects + WebSockets).
Built with Vite + React + TypeScript + Tailwind CSS.

## Run it

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build in dist/
npx wrangler dev # room backend (+ built app) at http://localhost:8787
```

The vite dev server proxies `/api` and `/ws` to wrangler dev on :8787, so run
both when working on multiplayer. For local-play-only work, vite alone is fine.

## Deploy

Live at **https://flourishfriends.com** (also www.flourishfriends.com and
https://flag-quiz.charles-ef7.workers.dev) — Cloudflare Workers static assets,
config in `wrangler.jsonc`. To ship an update:

```bash
npm run build && npx wrangler deploy
```

## What's in the POC

- **Single-player and pass-and-play multiplayer** (2–4 players): the device is
  handed between players each question so nobody sees another player's pick
  before the reveal.
- **Classic Mode** (straight points) and **Learning Mode** (reveal hints one at
  a time — each hint drops the question's value 100 → 75 → 50 → 25).
- **Easy / Medium / Hard difficulty** with smart wrong answers: easy uses
  different continents, medium uses the same region, hard uses deliberately
  confusable flags (Chad/Romania, Monaco/Indonesia, Central Asia, Caribbean…).
- **Lifelines**: 50:50 and Ask the Crowd (crowd accuracy scales with
  difficulty: 90% / 75% / 60%), one of each per player per game.
- **Scoring**: 100 per correct answer, speed bonuses (+50 under 3s, +25 under
  5s), streak bonuses (+50 / +100 / +250 at 3 / 5 / 10 in a row).
- **Sudden-death tie-breakers** when the game ends level.
- **Optional countdown timer** (10/15/30s per question).
- **10 / 15 / 25 / custom question games**, optional continent filter.
- **Local high scores**, game history, missed-flag tracking, and
  Continue Game after a reload.
- **Three quiz packs**: 195 world flags (all UN members plus Vatican City and
  Palestine), all 50 **US state flags**, and **State Capitals** — guess the
  capital from the state's silhouette (Easy names the state; Medium/Hard show
  only the shape, and Hard mixes in famous non-capital trap cities like
  Seattle and New Orleans). Flag SVGs live in `public/flags/`; state
  silhouettes in `public/states/` (regenerate with
  `node scripts/generateStateShapes.mjs`, path data from @svg-maps/usa).
- **Two answer styles**: multiple choice (default) or **Type It In** —
  fill-in-the-blank with forgiving matching (aliases like "USA" or "Burma"
  work, small typos are excused, but ambiguous guesses between lookalike
  names like Slovenia/Slovakia are not).
- **Score sharing**: after a game, each player can generate a share link
  (`/score/:shareId`) with copy-link, X/Twitter, SMS, and WhatsApp intents.
  The score data is encoded in the URL fragment so links work on any device
  with no backend; IndexedDB keeps a local record of shares made on this
  device.
- **TV rooms (multiplayer)**: a host creates a room (4-letter code) from
  "📺 Host TV Game"; up to 8 players join at `/join/:code` on their phones,
  and `/display/:code` is a read-only big-screen view to mirror to a TV.
  A Durable Object per room is the scoring authority and syncs everyone over
  WebSockets: answers lock in on players' phones, reveal happens automatically
  when everyone has answered (or the timer expires, or the host forces it),
  and correct answers are never sent to clients before the reveal. Rooms
  expire after 30 minutes idle; disconnected players can rejoin and keep
  their score.

## Code layout

```
src/
  types.ts               shared types
  data/                  country dataset (easy/medium/hard core + regional expansions)
  logic/                 question generation, scoring, crowd sim, game reducer,
                         score-share URL encoding, room protocol (shared w/ worker)
  hooks/useRoomSocket.ts room websocket with auto-reconnect
  storage/localStore.ts  typed localStorage wrappers
  storage/scoreShares.ts IndexedDB record of shared scores
  screens/               one component per screen (incl. ScoreDisplay, JoinRoom,
                         ControllerRoom, HostRoom, DisplayRoom)
  components/            flag, answer grid, scoreboard, hints, lifelines,
                         share widget, room UI bits
worker/
  index.ts               API router (create room, room info, ws upgrade)
  gameRoom.ts            GameRoom Durable Object (state + scoring authority)
```

Game flow is a single `useReducer` state machine (`src/logic/gameReducer.ts`);
all randomness and timestamps are passed in via action payloads so the reducer
stays pure. To add countries, append records to `src/data/*.ts` and drop the
matching `{code}.svg` into `public/flags/`.
