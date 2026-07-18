# Flourish Friends: Phase 1 & 2 Implementation Plan

## Phase 1: Score Sharing (Weeks 1–2)

### Goal
After a game ends, players can share their individual score with a unique link that displays their final stats and game details.

### Architecture
- **Shareable URL:** `flourishfriends.com/score/:shareId` (e.g., `/score/abc123xyz`)
- **Storage:** IndexedDB on client (scores indexed by shareId)
- **No accounts required** — shares are anonymous, time-limited
- **Social sharing:** Copy link, Twitter/SMS intent links

### Files to Create

#### 1. `src/types.ts` (update)
Add to existing types:
```typescript
export interface ScoreShare {
  shareId: string;           // unique ID for URL
  playerName: string;
  score: number;
  accuracy: number;          // 0-100
  bestStreak: number;
  totalQuestions: number;
  correctAnswers: number;
  difficulty: Difficulty;
  mode: GameMode;
  collection: Collection;
  timerUsed: boolean;
  createdAt: number;         // epoch ms
}
```

#### 2. `src/storage/scoreShares.ts` (new)
IndexedDB wrapper for score shares:
```typescript
// Save a score share, return shareId
export async function saveScoreShare(share: Omit<ScoreShare, 'shareId' | 'createdAt'>): Promise<string>

// Get a score share by ID
export async function getScoreShare(shareId: string): Promise<ScoreShare | null>

// List all shares (for testing/debugging)
export async function listScoreShares(): Promise<ScoreShare[]>
```

#### 3. `src/screens/GameResults.tsx` (update existing)
After the game ends, before/instead of "Play Again" section:
- Add "Share Your Score" button
- Show score summary (score, accuracy, streak)
- Generate and display shareId
- Show social share buttons

```typescript
// At the bottom of GameResults component:
<div className="share-section">
  <h3>Share Your Score</h3>
  <button onClick={handleShareScore}>Share Score</button>
  {shareId && (
    <ScoreShareWidget shareId={shareId} playerName={playerName} score={score} />
  )}
</div>
```

#### 4. `src/components/ScoreShareWidget.tsx` (new)
Display shareable link and actions:
- Show generated URL
- Copy to clipboard button
- Twitter share intent (pre-filled message)
- SMS/WhatsApp share intent
- Display QR code (optional, low priority)

```typescript
interface Props {
  shareId: string;
  playerName: string;
  score: number;
}

export function ScoreShareWidget({ shareId, playerName, score }: Props) {
  const shareUrl = `${window.location.origin}/score/${shareId}`;
  // render copy button, social links, etc.
}
```

#### 5. `src/screens/ScoreDisplay.tsx` (new)
Display a single shared score:
```typescript
// Route: /score/:shareId
// Show the saved ScoreShare data in a nice card format
// Include player name, score, accuracy, streak, game settings
// Optional: "Play similar game" button that navigates to setup with same difficulty
// No "back to home" — let user go home via menu
```

#### 6. `src/App.tsx` (update)
Add new screen type and route:
```typescript
type Screen = "..." | "scoreDisplay";

// Add route handler:
case "scoreDisplay":
  const shareId = getShareIdFromUrl(); // parse :shareId
  return <ScoreDisplay shareId={shareId} onHome={() => navigate('/')} />;
```

### Implementation Steps

1. **Update types** with ScoreShare interface
2. **Create scoreShares.ts** with IndexedDB logic
3. **Update GameResults.tsx** to:
   - Call `saveScoreShare()` when player finishes
   - Show ScoreShareWidget with generated shareId
4. **Create ScoreShareWidget.tsx** with social share buttons
5. **Create ScoreDisplay.tsx** to render shared score
6. **Update App.tsx** routing to handle `/score/:shareId`
7. **Update HomeScreen.tsx** (optional): add "View Score" button if shareId in URL params

### Acceptance Criteria
- [ ] After game ends, GameResults shows "Share Your Score" button
- [ ] Clicking button generates shareId and saves to IndexedDB
- [ ] Share link (`/score/{id}`) displays player's score, accuracy, streak, game settings
- [ ] Copy link button works
- [ ] Twitter share link pre-fills with score text
- [ ] SMS/WhatsApp intent links work on mobile
- [ ] Share persists across page reloads
- [ ] Multiple scores can be shared (each gets unique ID)

---

## Phase 2: Multiplayer Room System (Weeks 3–5)

### Goal
Multiple players join a room on separate phones, all connected to a shared display (TV or laptop via screen mirroring). Host controls the game flow; players submit answers in real-time.

### Architecture

**Backend: Cloudflare Workers + Durable Objects**
- Durable Objects: One instance per room (persists state, broadcasts updates)
- WebSocket: Real-time sync between host and players
- REST endpoints: Create room, list players, end room

**Frontend: Three Views**
1. **Host** (`/host/:roomCode`): Controls game (Start, Next, End), sees all players/scores
2. **Display** (`/display/:roomCode`): Full-screen, read-only (flags, timer, leaderboard) — mirrors to TV
3. **Controller** (`/controller/:roomCode`): Answer submission UI on player phones

**Room State:**
```typescript
{
  roomCode: string;
  hostId: string;
  status: "lobby" | "playing" | "ended";
  players: {
    [playerId]: {
      name: string;
      id: string;
      score: number;
      answer?: string;       // current question answer (cleared each question)
      answeredAt?: number;   // epoch ms when submitted
    }
  };
  currentQuestion: Question | null;
  questionStartedAt: number;
  settings: GameSettings;
  questions: Question[];
  questionIndex: number;
}
```

### Files to Create / Update

#### Backend (Cloudflare Workers)

**1. `wrangler.toml` (update)**
Add Durable Objects binding:
```toml
[[durable_objects.bindings]]
name = "GAME_ROOM"
class_name = "GameRoom"
```

**2. `src/workers/gameRoom.ts` (new)**
Durable Object for room state:
```typescript
export class GameRoom {
  state: any;
  env: any;
  
  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrades
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    // Handle REST (GET state, POST end)
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    // Upgrade to WebSocket, handle messages:
    // - "join": player joins
    // - "answer": player submits answer
    // - "start": host starts game
    // - "next": host moves to next question
    // - "end": host ends game
    // Broadcast updates to all connected clients
  }
}
```

**3. `src/workers/index.ts` (new)**
Router for REST endpoints:
```typescript
// POST /api/rooms — create room
// GET /api/rooms/:code — get room state (not used if WebSocket, but useful for polling)
// POST /api/rooms/:code/end — end room (host only)

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      return createRoom(env);
    }
    // ... etc
  }
};

async function createRoom(env: any): Promise<Response> {
  const roomCode = generateRoomCode(); // 4 random uppercase letters
  const roomId = env.GAME_ROOM.idFromName(roomCode);
  const room = env.GAME_ROOM.get(roomId);
  // Initialize room, return { roomCode, roomId }
}
```

#### Frontend

**1. `src/types.ts` (update)**
Add room-related types:
```typescript
export interface RoomPlayer {
  id: string;
  name: string;
  score: number;
  answer?: string;
  answeredAt?: number;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  status: "lobby" | "playing" | "ended";
  players: Record<string, RoomPlayer>;
  currentQuestion: Question | null;
  questionStartedAt: number;
  settings: GameSettings;
  questions: Question[];
  questionIndex: number;
  finishedAt: number | null;
}

export type Screen = "..." | "joinRoom" | "hostLobby" | "hostGame" | "display" | "controller";
```

**2. `src/logic/roomReducer.ts` (new)**
Reducer for room-synced game state:
```typescript
export interface RoomAction {
  type: "INIT" | "JOIN" | "PLAYER_JOINED" | "GAME_STARTED" 
       | "QUESTION_SHOWN" | "ANSWER_SUBMITTED" | "ANSWER_REVEALED"
       | "NEXT_QUESTION" | "GAME_ENDED" | "DISCONNECT";
  payload?: any;
}

export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  // Handle room state updates from WebSocket
}
```

**3. `src/screens/JoinRoom.tsx` (new)**
Enter room code, choose name:
```typescript
// Shows:
// - "Enter room code" text input
// - "Your name" text input
// - "Join" button
// On join: emit WebSocket "join" message, navigate to /controller/:code
```

**4. `src/screens/HostLobby.tsx` (new)**
Host waits for players before starting:
```typescript
// Shows:
// - Room code (large, copyable)
// - QR code pointing to join URL
// - Player list (real-time updates)
// - "Start Game" button (disabled if < 2 players)
// - "Copy room code" button
// - Instructions: "Share code or scan QR, open on player phones"
```

**5. `src/screens/HostGame.tsx` (new)**
Host controls game flow:
```typescript
// Shows:
// - Current question + flag (same as QuestionScreen but read-only)
// - Player list with scores
// - "Next Question" button (after reveal)
// - "End Game" button (anytime)
// - Timer (synced with display)
```

**6. `src/screens/DisplayRoom.tsx` (new)**
Read-only display for TV:
```typescript
// Full-screen, optimized for landscape
// Shows:
// - Large flag
// - 4 answer choices (during question)
// - Timer (if enabled)
// - Answer counts after submission
// - Results/scores after reveal
// - Room code (small, corner)
// - Player names + scores (always visible)
```

**7. `src/screens/ControllerRoom.tsx` (new)**
Player phone controller:
```typescript
// Shows:
// - Question (flag + choices as buttons)
// - Timer (synced with display)
// - Submit answer: send via WebSocket, show "Waiting for others..."
// - After reveal: show if correct/incorrect + points earned
// - Current score
// - "Next" button appears when host moves to next
```

**8. `src/hooks/useWebSocket.ts` (new)**
WebSocket connection manager:
```typescript
export function useWebSocket(roomCode: string, playerId: string, onMessage: (msg: any) => void) {
  // Connect to /ws/:roomCode?playerId=X
  // Handle reconnection
  // Auto-reconnect on disconnect
}
```

**9. `src/App.tsx` (update)**
Add new screens and routing:
```typescript
// Add screens: joinRoom, hostLobby, hostGame, display, controller
// Detect room mode: if URL has /host/:code, /display/:code, /controller/:code
// Use roomReducer instead of gameReducer in these modes
```

### Implementation Steps

1. **Backend setup:**
   - Create Durable Object for GameRoom
   - Implement WebSocket message handling
   - Implement REST endpoints (create room, end room)

2. **Frontend types:**
   - Add RoomState, RoomPlayer, RoomAction types

3. **Room reducer:**
   - Implement roomReducer to handle incoming WebSocket messages

4. **Join flow:**
   - Create JoinRoom screen
   - Create HostLobby screen
   - Set up room creation on host side

5. **Game screens:**
   - Create HostGame (control flow)
   - Create DisplayRoom (TV view)
   - Create ControllerRoom (player phones)

6. **WebSocket integration:**
   - Create useWebSocket hook
   - Wire up message handlers in each screen
   - Test message flow end-to-end

7. **Routing:**
   - Update App.tsx to handle /host/:code, /display/:code, /controller/:code
   - Add "Play on TV" option to HomeScreen

### Acceptance Criteria
- [ ] Host creates room, gets code (e.g., BIRD)
- [ ] Host sees HostLobby with QR code + player list
- [ ] Two players scan QR / enter code on phones
- [ ] Both players join, appear in host's player list (real-time)
- [ ] Host clicks "Start Game"
- [ ] Both players see question + timer (synced)
- [ ] Both players submit answers
- [ ] Host sees answer counts in real-time
- [ ] Answers are revealed to all players simultaneously
- [ ] Scores update in real-time for all
- [ ] Host moves to next question
- [ ] Display view on laptop/tablet mirrors to TV via native browser cast
- [ ] Game ends, final scores shown, "Share Score" buttons appear per player
- [ ] Rooms auto-cleanup after 30 min idle

---

## Integration Notes

### Phase 1 → Phase 2
- Score sharing works in **single-device** mode (existing) and **multiplayer** mode (new)
- When multiplayer game ends, redirect to results with "Share Your Score" section
- Same ScoreShareWidget used in both modes

### File Structure Summary
```
src/
├── types.ts (update: ScoreShare, RoomState, RoomAction)
├── storage/
│   └── scoreShares.ts (new)
├── logic/
│   ├── scoreSharing.ts (new utility functions)
│   └── roomReducer.ts (new)
├── hooks/
│   └── useWebSocket.ts (new)
├── screens/
│   ├── GameResults.tsx (update: add share section)
│   ├── ScoreDisplay.tsx (new)
│   ├── JoinRoom.tsx (new)
│   ├── HostLobby.tsx (new)
│   ├── HostGame.tsx (new)
│   ├── DisplayRoom.tsx (new)
│   └── ControllerRoom.tsx (new)
├── components/
│   └── ScoreShareWidget.tsx (new)
└── App.tsx (update: routing, new screens)

workers/
├── gameRoom.ts (new Durable Object)
└── index.ts (new REST router)
```

---

## Testing Strategy

**Phase 1:**
1. Play single-game on device
2. End game, click "Share Score"
3. Open share link in new tab — verify score displays
4. Test copy link, Twitter intent, SMS intent

**Phase 2:**
1. Host creates room on laptop
2. Two players join on phones (same WiFi)
3. Host starts game, both players see question
4. Both submit answers, host sees them in real-time
5. Answers reveal, scores update
6. Host moves to next question
7. Test mirroring /display/:code tab to TV
8. End game, verify both players can share scores

---

## Dependencies

**Phase 1:**
- No new dependencies (uses existing IndexedDB, social intents)

**Phase 2:**
- Cloudflare Workers runtime (wrangler already set up)
- `nanoid` or similar for shareId generation (already available)

---

## Success Metrics

**Phase 1:**
- Score shares are generated and displayed correctly
- Links are shareable and persistent
- Social sharing intents work

**Phase 2:**
- 2+ players can join a room without latency issues
- Answer submission syncs in < 200ms
- Display view works on laptop/TV via native mirroring
- Game completion rate: players reach final scores without disconnects
