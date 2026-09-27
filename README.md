# Flourish Friends 🌍🧠

A mobile-first party-game platform: the shared screen is the game board, every
phone is a controller. Two games so far —

- **🌎 Flag Game** — a game-show-style flag quiz. Play solo on one device (all
  local, no backend), challenge a friend **head to head**, or host a **TV room**.
- **🧠 0.5% Club** — eleven logic and observation puzzles that get harder every
  round, from the 90% question down to the 0.5% question.

Both share the same rooms, room codes, QR joining, WebSocket sync and
reconnection (Cloudflare Durable Objects). Built with Vite + React +
TypeScript + Tailwind CSS.

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

## 0.5% Club

Eleven rounds, one question per difficulty tier: 90 · 80 · 70 · 60 · 50 · 40 ·
30 · 20 · 10 · 5 · **0.5%**. Logic, observation, patterns, wordplay and visual
puzzles — deliberately not trivia.

Play it either way from the same setup screen:

- **Solo, on this device** (`/club/solo`) — no room, no backend, same eleven
  questions and the same rules. The reducer lives in `src/logic/clubSolo.ts`.
- **TV room + phones** — the host screen is the game board, up to **10
  players** join at `/join/:code`, and `/club/display/:code` is a read-only
  big-screen mirror.

- **Two modes.** *Classic Survival*: a wrong answer, a timeout, or running out
  of Passes ends your shot at winning — but you keep playing and answering
  every remaining question ("playing for fun"). Solve the 0.5% question while
  still eligible and you're in the Club; several players can be. *Unlimited
  Pass / High Score*: nobody is eliminated, Passes are unlimited and score 0,
  1 point per correct answer, and the top score (or scores) wins.
- **Passes**: 0, 1 or 2 per player in Classic Survival, used during a live
  question and never on the final one.
- **Server-run clock**: the Durable Object owns the timer, locks answers, and
  reveals on its own; the host only starts rounds, advances past an
  explanation, pauses, or ends the game. Per-question timer overrides let the
  hardest puzzles run longer than the room default.
- **Six answer interfaces**: multiple choice, text (forgiving matching), a
  numeric keypad, true/false, image choice, and visual multiple choice.
- **Flourish Friends-drawn visuals**: every diagram is an inline SVG component
  in `src/data/clubVisuals.tsx`, sharp on a phone and on a TV. `/club/visuals`
  flips through them all at TV and phone size.
- **Explanations** on every question, plus per-question analytics (attempts,
  correct, passes, timeouts, response times, actual solve rate) returned when
  the game ends, ready to calibrate the difficulty labels later.
- The bank lives in `src/data/clubQuestions.ts` — 44 questions, four per tier.
  Append to it; nothing else needs to change.

```bash
npx wrangler dev                    # then, in another shell:
node scripts/clubSmokeTest.mjs      # plays whole games over the real protocol
```

## What's in the flag quiz

- **Single-player** local games. Playing with friends goes through rooms:
  Head to Head (send a link) or a TV room — each player uses their own phone.
- **Classic Mode** (straight points) and **Learning Mode** (reveal hints one at
  a time — each hint drops the question's value 100 → 85 → 70 → 55 → 40 → 25).
  Countries: say hello, capital, language, continent, money, founded. US states:
  nickname, region, capital, postal code.
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
                         clubQuestions.ts / clubVisuals.tsx — 0.5% Club bank + art
  logic/                 question generation, scoring, crowd sim, game reducer,
                         score-share URL encoding, room protocol (shared w/ worker)
                         clubProtocol.ts — 0.5% Club contract (shared w/ worker)
                         clubSelect.ts   — one question per tier, freshest first
  hooks/useRoomSocket.ts room websocket with auto-reconnect
  hooks/useClubSocket.ts the same, for 0.5% Club rooms
  storage/localStore.ts  typed localStorage wrappers
  storage/scoreShares.ts IndexedDB record of shared scores
  screens/               one component per screen (incl. ScoreDisplay, JoinRoom,
                         ControllerRoom, HostRoom, DisplayRoom, PlatformHome,
                         ClubSetup/ClubHostRoom/ClubControllerRoom/ClubDisplayRoom)
  components/            flag, answer grid, scoreboard, hints, lifelines,
                         share widget, room UI bits, ClubBoard + club UI bits
worker/
  index.ts               API router (create room, room info, ws upgrade)
  gameRoom.ts            GameRoom Durable Object (flag quiz authority)
  clubRoom.ts            ClubRoom Durable Object (0.5% Club authority)
scripts/clubSmokeTest.mjs  plays full 0.5% Club games against a running worker
```

Flag-quiz game flow is a single `useReducer` state machine
(`src/logic/gameReducer.ts`); all randomness and timestamps are passed in via
action payloads so the reducer stays pure. To add countries, append records to
`src/data/*.ts` and drop the matching `{code}.svg` into `public/flags/`.

0.5% Club has no client state machine — the room's Durable Object is the only
authority and clients render its snapshots. Room codes are one shared space
across both games: `POST /api/rooms` and `POST /api/club/rooms` each check the
other namespace before claiming a code, `GET /api/rooms/:code` reports which
game a code belongs to, and `/join/:code` sends the phone to the right
controller. Flag rooms talk over `/ws/:code`, club rooms over `/ws/c/:code`.
