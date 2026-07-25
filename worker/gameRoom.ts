import type { GameSettings, Question } from "../src/types";
import { hintPenalty, MAX_ROOM_HINTS, scoreCorrectAnswer } from "../src/logic/scoring";
import {
  HINT_GUESS_BONUS,
  MAX_ROOM_PLAYERS,
  ROOM_PLAYER_COLORS,
  type ClientMessage,
  type RoomErrorCode,
  type RoomSnapshot,
  type RoomStatus,
  type ServerMessage,
  type YouView,
} from "../src/logic/roomProtocol";
import type { Env } from "./index";

// One GameRoom instance per room code. The DO is the single authority for
// room state and scoring; clients only ever see the public snapshot it
// broadcasts (correct answers stay server-side until reveal). Uses the
// WebSocket hibernation API so idle rooms cost nothing.

const IDLE_TIMEOUT_MS = 30 * 60_000; // wipe rooms untouched for 30 min
const REVEAL_GRACE_MS = 750; // network slack before the timer force-reveals

interface StoredPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  answer: { choice: string; answeredAt: number } | null;
  lastAnswer: { choice: string; correct: boolean; pointsEarned: number; timeMs: number } | null;
  hintsThisQuestion: number; // reset each question
  totalHints: number; // across the whole game
  metaGuess: string | null; // guessing phase: id they think used the most hints
  guessCorrect: boolean | null; // resolved when the guessing round ends
}

interface StoredRoom {
  roomCode: string;
  hostKey: string;
  status: RoomStatus;
  settings: GameSettings;
  questions: Question[];
  players: StoredPlayer[];
  questionIndex: number;
  questionStartedAt: number;
  finishedAt: number | null;
  lastActivity: number;
}

interface Attachment {
  role: "host" | "player" | "display";
  playerId?: string;
}

interface InitRequest {
  roomCode: string;
  hostKey: string;
  settings: GameSettings;
  questions: Question[];
}

function validateInit(body: InitRequest): string | null {
  if (typeof body.roomCode !== "string" || typeof body.hostKey !== "string") return "bad ids";
  const qs = body.questions;
  if (!Array.isArray(qs) || qs.length < 1 || qs.length > 60) return "bad question count";
  for (const q of qs) {
    if (
      typeof q?.flagImage !== "string" ||
      !(
        q.flagImage.startsWith("/flags/") ||
        q.flagImage.startsWith("/states/") ||
        q.flagImage.startsWith("/shapes/")
      )
    ) {
      return "bad flag";
    }
    if (q.prompt !== undefined && typeof q.prompt !== "string") return "bad prompt";
    if (q.silhouette !== undefined && typeof q.silhouette !== "boolean") return "bad silhouette";
    if (
      q.hints !== undefined &&
      (!Array.isArray(q.hints) ||
        q.hints.length > 3 ||
        q.hints.some((h) => typeof h !== "string" || h.length > 200))
    ) {
      return "bad hints";
    }
    if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) return "bad choices";
    if (!q.choices.includes(q.correctAnswer)) return "answer not in choices";
    if (typeof q.countryId !== "string") return "bad country";
  }
  const s = body.settings;
  if (!s || typeof s !== "object") return "bad settings";
  if (s.timerSeconds !== null && (typeof s.timerSeconds !== "number" || s.timerSeconds < 5 || s.timerSeconds > 120)) {
    return "bad timer";
  }
  return null;
}

export class GameRoom {
  private room: StoredRoom | null = null;

  constructor(private state: DurableObjectState, _env: Env) {
    state.blockConcurrencyWhile(async () => {
      this.room = (await state.storage.get<StoredRoom>("room")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/init") {
      const body = (await request.json()) as InitRequest;
      const invalid = validateInit(body);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
      const active =
        this.room &&
        this.room.status !== "ended" &&
        Date.now() - this.room.lastActivity < IDLE_TIMEOUT_MS;
      if (active) return Response.json({ error: "code in use" }, { status: 409 });

      this.room = {
        roomCode: body.roomCode,
        hostKey: body.hostKey,
        status: "lobby",
        settings: body.settings,
        questions: body.questions,
        players: [],
        questionIndex: 0,
        questionStartedAt: 0,
        finishedAt: null,
        lastActivity: Date.now(),
      };
      await this.save();
      return Response.json({ ok: true }, { status: 201 });
    }

    if (request.method === "GET" && url.pathname === "/exists") {
      const room = this.liveRoom();
      return Response.json({
        exists: room !== null,
        status: room?.status ?? null,
        playerCount: room?.players.length ?? 0,
        canJoin:
          room !== null && room.status === "lobby" && room.players.length < MAX_ROOM_PLAYERS,
      });
    }

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      // accept via hibernation API; identity arrives in the hello message
      this.state.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.sendError(ws, "invalid", "malformed message");
    }

    const room = this.liveRoom();
    if (!room) {
      this.sendError(ws, "room-not-found", "This room doesn't exist or has expired.");
      ws.close(1000, "room-not-found");
      return;
    }
    room.lastActivity = Date.now();

    if (msg.type === "hello") return this.handleHello(ws, msg, room);

    const who = ws.deserializeAttachment() as Attachment | null;
    if (!who) return this.sendError(ws, "invalid", "say hello first");

    if (msg.type === "answer" && who.role === "player" && who.playerId) {
      this.handleAnswer(room, who.playerId, msg.choice);
    } else if (msg.type === "hint" && who.role === "player" && who.playerId) {
      this.handleHint(room, who.playerId);
    } else if (msg.type === "guess" && who.role === "player" && who.playerId) {
      this.handleGuess(room, who.playerId, msg.targetId);
    } else if (who.role === "host") {
      if (msg.type === "start" && room.status === "lobby" && room.players.length > 0) {
        this.startQuestion(room, 0);
      } else if (msg.type === "reveal" && room.status === "question") {
        this.revealAnswers(room);
      } else if (msg.type === "next" && room.status === "reveal") {
        this.nextQuestion(room);
      } else if (msg.type === "next" && room.status === "guessing") {
        this.resolveGuessing(room);
      } else if (msg.type === "end" && room.status !== "ended") {
        room.status = "ended";
        room.finishedAt = Date.now();
      }
    }

    await this.save();
    this.broadcast(room);
  }

  async webSocketClose(_ws: WebSocket): Promise<void> {
    const room = this.liveRoom();
    if (room) this.broadcast(room); // update connected flags
  }

  async webSocketError(_ws: WebSocket): Promise<void> {
    const room = this.liveRoom();
    if (room) this.broadcast(room);
  }

  async alarm(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const now = Date.now();

    if (now - room.lastActivity >= IDLE_TIMEOUT_MS) {
      for (const ws of this.state.getWebSockets()) ws.close(1001, "room-expired");
      this.room = null;
      await this.state.storage.deleteAll();
      return;
    }

    const deadline = this.questionDeadline(room);
    if (room.status === "question" && deadline !== null && now >= deadline) {
      this.revealAnswers(room);
      await this.save();
      this.broadcast(room);
    } else {
      await this.armAlarm(room);
    }
  }

  // ---------- message handlers ----------

  private handleHello(
    ws: WebSocket,
    msg: Extract<ClientMessage, { type: "hello" }>,
    room: StoredRoom
  ): void {
    if (msg.role === "host") {
      if (msg.hostKey !== room.hostKey) {
        this.sendError(ws, "bad-key", "Wrong host key for this room.");
        ws.close(1000, "bad-key");
        return;
      }
      ws.serializeAttachment({ role: "host" } satisfies Attachment);
    } else if (msg.role === "display") {
      ws.serializeAttachment({ role: "display" } satisfies Attachment);
    } else {
      // player joining or reconnecting
      const existing = msg.playerId ? room.players.find((p) => p.id === msg.playerId) : undefined;
      if (existing) {
        ws.serializeAttachment({ role: "player", playerId: existing.id } satisfies Attachment);
      } else {
        if (room.status !== "lobby") {
          this.sendError(ws, "already-started", "This game already started — catch the next one!");
          ws.close(1000, "already-started");
          return;
        }
        if (room.players.length >= MAX_ROOM_PLAYERS) {
          this.sendError(ws, "room-full", "This room is full.");
          ws.close(1000, "room-full");
          return;
        }
        const name = (msg.name ?? "").trim().slice(0, 20) || `Player ${room.players.length + 1}`;
        const player: StoredPlayer = {
          id: crypto.randomUUID().slice(0, 8),
          name,
          color: ROOM_PLAYER_COLORS[room.players.length % ROOM_PLAYER_COLORS.length],
          score: 0,
          streak: 0,
          bestStreak: 0,
          correctCount: 0,
          answer: null,
          lastAnswer: null,
          hintsThisQuestion: 0,
          totalHints: 0,
          metaGuess: null,
          guessCorrect: null,
        };
        room.players.push(player);
        ws.serializeAttachment({ role: "player", playerId: player.id } satisfies Attachment);
      }
    }
    void this.save().then(() => this.broadcast(room));
  }

  private handleAnswer(room: StoredRoom, playerId: string, choice: string): void {
    if (room.status !== "question") return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.answer) return; // unknown or already locked in
    const question = room.questions[room.questionIndex];
    if (!question || typeof choice !== "string" || !question.choices.includes(choice)) return;
    player.answer = { choice, answeredAt: Date.now() };

    const everyoneAnswered =
      this.connectedPlayerIds().size > 0 &&
      room.players.every((p) => p.answer !== null || !this.connectedPlayerIds().has(p.id));
    if (everyoneAnswered) this.revealAnswers(room);
  }

  private handleHint(room: StoredRoom, playerId: string): void {
    if (room.status !== "question" || !room.settings.hintsEnabled) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.answer) return; // can't peek after locking in
    const question = room.questions[room.questionIndex];
    const available = Math.min(MAX_ROOM_HINTS, question?.hints?.length ?? 0);
    if (player.hintsThisQuestion >= available) return;
    player.hintsThisQuestion++;
    player.totalHints++;
  }

  private handleGuess(room: StoredRoom, playerId: string, targetId: string): void {
    if (room.status !== "guessing") return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.metaGuess) return; // one guess, locked
    if (!room.players.some((p) => p.id === targetId)) return; // must be a real player
    player.metaGuess = targetId;

    // resolve once every connected player has guessed
    const connected = this.connectedPlayerIds();
    const allGuessed =
      connected.size > 0 &&
      room.players.every((p) => p.metaGuess !== null || !connected.has(p.id));
    if (allGuessed) this.resolveGuessing(room);
  }

  // ---------- game flow ----------

  private startQuestion(room: StoredRoom, index: number): void {
    room.status = "question";
    room.questionIndex = index;
    room.questionStartedAt = Date.now();
    for (const p of room.players) {
      p.answer = null;
      p.lastAnswer = null;
      p.hintsThisQuestion = 0;
    }
    void this.armAlarm(room);
  }

  private revealAnswers(room: StoredRoom): void {
    if (room.status !== "question") return;
    const question = room.questions[room.questionIndex];
    for (const p of room.players) {
      if (!p.answer) {
        p.streak = 0;
        p.lastAnswer = null;
        continue;
      }
      const correct = p.answer.choice === question.correctAnswer;
      const timeMs = Math.max(0, p.answer.answeredAt - room.questionStartedAt);
      const newStreak = correct ? p.streak + 1 : 0;
      const pointsEarned = correct
        ? Math.max(
            0,
            scoreCorrectAnswer(room.settings, 0, timeMs, newStreak) -
              hintPenalty(p.hintsThisQuestion)
          )
        : 0;
      p.score += pointsEarned;
      p.streak = newStreak;
      p.bestStreak = Math.max(p.bestStreak, newStreak);
      if (correct) p.correctCount++;
      p.lastAnswer = { choice: p.answer.choice, correct, pointsEarned, timeMs };
      p.answer = null;
    }
    room.status = "reveal";
    void this.armAlarm(room);
  }

  private nextQuestion(room: StoredRoom): void {
    if (room.questionIndex + 1 >= room.questions.length) {
      this.endGame(room);
    } else {
      this.startQuestion(room, room.questionIndex + 1);
    }
  }

  /** After the last question: run the guess-the-biggest-hint-user round, or just end. */
  private endGame(room: StoredRoom): void {
    const connected = this.connectedPlayerIds();
    const anyHints = room.players.some((p) => p.totalHints > 0);
    const enoughPlayers = room.players.filter((p) => connected.has(p.id)).length >= 2;
    if (room.settings.hintGuessRound !== false && room.settings.hintsEnabled && anyHints && enoughPlayers) {
      room.status = "guessing";
      for (const p of room.players) {
        p.metaGuess = null;
        p.guessCorrect = null;
      }
    } else {
      room.status = "ended";
      room.finishedAt = Date.now();
    }
  }

  /** Score the guessing round: correct guessers of a biggest hint-user get a bonus. */
  private resolveGuessing(room: StoredRoom): void {
    if (room.status !== "guessing") return;
    const biggest = this.biggestHintUserIds(room);
    for (const p of room.players) {
      if (p.metaGuess === null) {
        p.guessCorrect = null;
        continue;
      }
      p.guessCorrect = biggest.includes(p.metaGuess);
      if (p.guessCorrect) p.score += HINT_GUESS_BONUS;
    }
    room.status = "ended";
    room.finishedAt = Date.now();
  }

  /** Player ids tied for most hints used (empty if nobody used any). */
  private biggestHintUserIds(room: StoredRoom): string[] {
    const max = Math.max(0, ...room.players.map((p) => p.totalHints));
    return max === 0 ? [] : room.players.filter((p) => p.totalHints === max).map((p) => p.id);
  }

  // ---------- plumbing ----------

  /** The stored room, or null if it has idled out (treated as expired). */
  private liveRoom(): StoredRoom | null {
    if (!this.room) return null;
    if (Date.now() - this.room.lastActivity >= IDLE_TIMEOUT_MS) return null;
    return this.room;
  }

  private questionDeadline(room: StoredRoom): number | null {
    if (room.status !== "question" || room.settings.timerSeconds === null) return null;
    return room.questionStartedAt + room.settings.timerSeconds * 1000;
  }

  private async armAlarm(room: StoredRoom): Promise<void> {
    const candidates = [room.lastActivity + IDLE_TIMEOUT_MS];
    const deadline = this.questionDeadline(room);
    if (deadline !== null) candidates.push(deadline + REVEAL_GRACE_MS);
    await this.state.storage.setAlarm(Math.min(...candidates));
  }

  private async save(): Promise<void> {
    if (this.room) {
      await this.state.storage.put("room", this.room);
      await this.armAlarm(this.room);
    }
  }

  private connectedPlayerIds(): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.state.getWebSockets()) {
      const who = ws.deserializeAttachment() as Attachment | null;
      if (who?.role === "player" && who.playerId) ids.add(who.playerId);
    }
    return ids;
  }

  private snapshot(room: StoredRoom): RoomSnapshot {
    const connected = this.connectedPlayerIds();
    const revealPhase = room.status === "reveal" || room.status === "ended";
    const question = room.questions[room.questionIndex] ?? null;
    const hostConnected = this.state
      .getWebSockets()
      .some((ws) => (ws.deserializeAttachment() as Attachment | null)?.role === "host");
    return {
      roomCode: room.roomCode,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: connected.has(p.id),
        score: p.score,
        streak: p.streak,
        bestStreak: p.bestStreak,
        correctCount: p.correctCount,
        answered: p.answer !== null,
        lastAnswer: revealPhase ? p.lastAnswer : null,
        totalHints: room.status === "ended" ? p.totalHints : null,
        guessed: p.metaGuess !== null,
        guessId: room.status === "ended" ? p.metaGuess : null,
        guessCorrect: room.status === "ended" ? p.guessCorrect : null,
      })),
      hostConnected,
      settings: {
        collection: room.settings.collection,
        difficulty: room.settings.difficulty,
        questionCount: room.questions.length,
        timerSeconds: room.settings.timerSeconds,
        speedBonusEnabled: room.settings.speedBonusEnabled,
        hintsEnabled: room.settings.hintsEnabled ?? false,
        hintGuessRound: room.settings.hintGuessRound !== false,
      },
      questionIndex: room.questionIndex,
      totalQuestions: room.questions.length,
      question:
        room.status === "question" || room.status === "reveal"
          ? question && {
              flagImage: question.flagImage,
              choices: question.choices,
              kind: question.kind,
              silhouette: question.silhouette,
              prompt: question.prompt,
            }
          : null,
      correctAnswer: revealPhase ? question?.correctAnswer ?? null : null,
      countryId: revealPhase ? question?.countryId ?? null : null,
      questionStartedAt: room.questionStartedAt,
      questionDeadline: this.questionDeadline(room),
      serverNow: Date.now(),
      finishedAt: room.finishedAt,
      biggestHintUserIds: room.status === "ended" ? this.biggestHintUserIds(room) : null,
    };
  }

  private youFor(room: StoredRoom, who: Attachment | null): YouView | null {
    if (who?.role !== "player" || !who.playerId) return null;
    const player = room.players.find((p) => p.id === who.playerId);
    if (!player) return null;
    const question = room.questions[room.questionIndex];
    const hints =
      (room.status === "question" || room.status === "reveal") && question?.hints
        ? question.hints.slice(0, player.hintsThisQuestion)
        : [];
    return { playerId: player.id, choice: player.answer?.choice ?? null, hints };
  }

  private broadcast(room: StoredRoom): void {
    const snapshot = this.snapshot(room);
    for (const ws of this.state.getWebSockets()) {
      const who = ws.deserializeAttachment() as Attachment | null;
      const message: ServerMessage = { type: "state", snapshot, you: this.youFor(room, who) };
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // socket already closing — ignore
      }
    }
  }

  private sendError(ws: WebSocket, code: RoomErrorCode, message: string): void {
    const err: ServerMessage = { type: "error", code, message };
    try {
      ws.send(JSON.stringify(err));
    } catch {
      // ignore
    }
  }
}
