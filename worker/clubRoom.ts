import {
  CLUB_GAME_TYPE,
  CLUB_ROUND_COUNT,
  CLUB_TIERS,
  FINAL_INTRO_SECONDS,
  FINAL_ROUND_INDEX,
  MAX_CLUB_PLAYERS,
  ROUND_INTRO_SECONDS,
  CLUB_PLAYER_COLORS,
  clubAnswerCorrect,
  validateClubQuestion,
  type ClubClientMessage,
  type ClubErrorCode,
  type ClubPlayerResult,
  type ClubPlayerStatus,
  type ClubQuestion,
  type ClubQuestionStat,
  type ClubServerMessage,
  type ClubSettings,
  type ClubSnapshot,
  type ClubStatus,
  type ClubTier,
  type ClubYouView,
} from "../src/logic/clubProtocol";
import type { Env } from "./index";

// One ClubRoom instance per 0.5% Club room code. Like GameRoom, this DO is the
// only authority: it owns the clock, decides correctness, and never ships the
// answer or explanation to a client before the reveal. Clients render whatever
// the snapshot says (§41 — clients don't decide game truth).

const IDLE_TIMEOUT_MS = 30 * 60_000;
const REVEAL_GRACE_MS = 750; // network slack before the timer force-locks

interface StoredAnswer {
  value: string;
  at: number;
}

interface StoredClubPlayer {
  id: string;
  name: string;
  color: string;
  winnerEligible: boolean;
  passesRemaining: number;
  correctCount: number;
  survivedRounds: number;
  answer: StoredAnswer | null;
  usedPassThisRound: boolean;
  lastResult: ClubPlayerResult | null;
  isWinner: boolean;
}

interface StoredStat {
  questionId: string;
  difficulty: ClubTier;
  correct: number;
  incorrect: number;
  passes: number;
  timeouts: number;
  times: number[];
}

interface StoredClubRoom {
  gameType: typeof CLUB_GAME_TYPE;
  roomCode: string;
  hostKey: string;
  status: ClubStatus;
  settings: ClubSettings;
  questions: ClubQuestion[];
  players: StoredClubPlayer[];
  roundIndex: number; // -1 until the first round starts
  introEndsAt: number | null;
  questionStartedAt: number | null;
  questionEndsAt: number | null;
  pausedAt: number | null;
  stats: StoredStat[];
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
  settings: ClubSettings;
  questions: ClubQuestion[];
}

function validateInit(body: InitRequest): string | null {
  if (typeof body?.roomCode !== "string" || typeof body?.hostKey !== "string") return "bad ids";
  const qs = body.questions;
  if (!Array.isArray(qs) || qs.length !== CLUB_ROUND_COUNT) {
    return `expected ${CLUB_ROUND_COUNT} questions`;
  }
  for (let i = 0; i < qs.length; i++) {
    const issue = validateClubQuestion(qs[i]);
    if (issue) return issue;
    if (qs[i].difficulty !== CLUB_TIERS[i]) return `round ${i + 1} is not the ${CLUB_TIERS[i]}% tier`;
  }
  const ids = new Set(qs.map((q) => q.id));
  if (ids.size !== qs.length) return "a question repeats in this game";

  const s = body.settings;
  if (!s || typeof s !== "object") return "bad settings";
  if (s.mode !== "survival" && s.mode !== "highscore") return "bad mode";
  if (typeof s.timerSeconds !== "number" || s.timerSeconds < 5 || s.timerSeconds > 180) {
    return "bad timer";
  }
  if (typeof s.passes !== "number" || s.passes < 0 || s.passes > 3) return "bad pass count";
  return null;
}

export class ClubRoom {
  private room: StoredClubRoom | null = null;

  constructor(
    private state: DurableObjectState,
    _env: Env
  ) {
    state.blockConcurrencyWhile(async () => {
      this.room = (await state.storage.get<StoredClubRoom>("room")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/init") {
      const body = (await request.json()) as InitRequest;
      const invalid = validateInit(body);
      if (invalid) return Response.json({ error: invalid }, { status: 400 });
      if (this.liveRoom()) return Response.json({ error: "code in use" }, { status: 409 });

      this.room = {
        gameType: CLUB_GAME_TYPE,
        roomCode: body.roomCode,
        hostKey: body.hostKey,
        status: "lobby",
        settings: body.settings,
        questions: body.questions,
        players: [],
        roundIndex: -1,
        introEndsAt: null,
        questionStartedAt: null,
        questionEndsAt: null,
        pausedAt: null,
        stats: body.questions.map((q) => ({
          questionId: q.id,
          difficulty: q.difficulty,
          correct: 0,
          incorrect: 0,
          passes: 0,
          timeouts: 0,
          times: [],
        })),
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
        gameType: room ? CLUB_GAME_TYPE : null,
        status: room?.status ?? null,
        playerCount: room?.players.length ?? 0,
        canJoin: room !== null && room.status === "lobby" && room.players.length < MAX_CLUB_PLAYERS,
      });
    }

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClubClientMessage;
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

    if (who.role === "player" && who.playerId) {
      if (msg.type === "answer") this.handleAnswer(room, who.playerId, msg.answer);
      else if (msg.type === "pass") this.handlePass(room, who.playerId);
    } else if (who.role === "host") {
      this.handleHostMessage(room, msg);
    }

    await this.save();
    this.broadcast(room);
  }

  async webSocketClose(): Promise<void> {
    const room = this.liveRoom();
    if (room) this.broadcast(room);
  }

  async webSocketError(): Promise<void> {
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

    let changed = false;
    if (room.pausedAt === null) {
      if (room.status === "round_intro" && room.introEndsAt !== null && now >= room.introEndsAt) {
        this.beginAnswering(room);
        changed = true;
      } else if (
        room.status === "question" &&
        room.questionEndsAt !== null &&
        now >= room.questionEndsAt + REVEAL_GRACE_MS
      ) {
        this.lockAndReveal(room);
        changed = true;
      }
    }

    if (changed) {
      await this.save();
      this.broadcast(room);
    } else {
      await this.armAlarm(room);
    }
  }

  // ---------- message handlers ----------

  private handleHello(
    ws: WebSocket,
    msg: Extract<ClubClientMessage, { type: "hello" }>,
    room: StoredClubRoom
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
      // A refresh rejoins as the same player: identity, eligibility, passes and
      // any locked answer all survive (§42).
      const existing = msg.playerId ? room.players.find((p) => p.id === msg.playerId) : undefined;
      if (existing) {
        ws.serializeAttachment({ role: "player", playerId: existing.id } satisfies Attachment);
      } else {
        if (room.status !== "lobby") {
          this.sendError(ws, "already-started", "This game already started — catch the next one!");
          ws.close(1000, "already-started");
          return;
        }
        if (room.players.length >= MAX_CLUB_PLAYERS) {
          this.sendError(
            ws,
            "room-full",
            `This room is full. 0.5% Club supports up to ${MAX_CLUB_PLAYERS} players.`
          );
          ws.close(1000, "room-full");
          return;
        }
        const name = (msg.name ?? "").trim().slice(0, 20) || `Player ${room.players.length + 1}`;
        const player: StoredClubPlayer = {
          id: crypto.randomUUID().slice(0, 8),
          name,
          color: CLUB_PLAYER_COLORS[room.players.length % CLUB_PLAYER_COLORS.length],
          winnerEligible: true,
          passesRemaining: room.settings.mode === "survival" ? room.settings.passes : 0,
          correctCount: 0,
          survivedRounds: 0,
          answer: null,
          usedPassThisRound: false,
          lastResult: null,
          isWinner: false,
        };
        room.players.push(player);
        ws.serializeAttachment({ role: "player", playerId: player.id } satisfies Attachment);
      }
    }
    void this.save().then(() => this.broadcast(room));
  }

  private handleHostMessage(room: StoredClubRoom, msg: ClubClientMessage): void {
    switch (msg.type) {
      case "start":
        if (room.status === "lobby" && room.players.length > 0) {
          room.status = "intro";
        } else if (room.status === "intro") {
          this.startRound(room, 0);
        }
        break;
      case "next":
        if (room.status === "reveal") {
          if (room.roundIndex >= FINAL_ROUND_INDEX) this.endGame(room);
          else this.startRound(room, room.roundIndex + 1);
        }
        break;
      case "pause":
        if (room.pausedAt === null && (room.status === "question" || room.status === "round_intro")) {
          room.pausedAt = Date.now();
        }
        break;
      case "resume":
        if (room.pausedAt !== null) {
          const frozen = Date.now() - room.pausedAt;
          if (room.introEndsAt !== null) room.introEndsAt += frozen;
          if (room.questionEndsAt !== null) room.questionEndsAt += frozen;
          if (room.questionStartedAt !== null) room.questionStartedAt += frozen;
          room.pausedAt = null;
        }
        break;
      case "end":
        if (room.status !== "ended") this.endGame(room);
        break;
    }
  }

  private handleAnswer(room: StoredClubRoom, playerId: string, answer: string): void {
    if (room.status !== "question" || room.pausedAt !== null) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.answer || player.usedPassThisRound) return; // already locked
    if (typeof answer !== "string") return;
    const question = room.questions[room.roundIndex];
    if (!question) return;

    const trimmed = answer.slice(0, 120);
    // Choice-based questions only accept one of their own options.
    if (question.choices && !question.choices.includes(trimmed)) return;
    if (!trimmed.trim()) return;

    player.answer = { value: trimmed, at: Date.now() };
    this.maybeRevealEarly(room);
  }

  private handlePass(room: StoredClubRoom, playerId: string): void {
    if (room.status !== "question" || room.pausedAt !== null) return;
    if (room.roundIndex >= FINAL_ROUND_INDEX) return; // the 0.5% question can't be passed (§17)
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.answer || player.usedPassThisRound) return;
    if (room.settings.mode === "survival") {
      if (player.passesRemaining <= 0) return;
      player.passesRemaining--;
    }
    player.usedPassThisRound = true;
    this.maybeRevealEarly(room);
  }

  /** Everyone connected has locked something in — no reason to wait out the clock. */
  private maybeRevealEarly(room: StoredClubRoom): void {
    const connected = this.connectedPlayerIds();
    if (connected.size === 0) return;
    const allIn = room.players.every(
      (p) => !connected.has(p.id) || p.answer !== null || p.usedPassThisRound
    );
    if (allIn) this.lockAndReveal(room);
  }

  // ---------- game flow ----------

  private startRound(room: StoredClubRoom, index: number): void {
    room.status = "round_intro";
    room.roundIndex = index;
    room.questionStartedAt = null;
    room.questionEndsAt = null;
    room.pausedAt = null;
    const seconds = index === FINAL_ROUND_INDEX ? FINAL_INTRO_SECONDS : ROUND_INTRO_SECONDS;
    room.introEndsAt = Date.now() + seconds * 1000;
    for (const p of room.players) {
      p.answer = null;
      p.usedPassThisRound = false;
      p.lastResult = null;
    }
  }

  private beginAnswering(room: StoredClubRoom): void {
    const question = room.questions[room.roundIndex];
    const seconds = question?.timerSeconds ?? room.settings.timerSeconds;
    room.status = "question";
    room.introEndsAt = null;
    room.questionStartedAt = Date.now();
    room.questionEndsAt = Date.now() + seconds * 1000;
  }

  /** Time's up (or everyone answered): grade the round and move to the reveal. */
  private lockAndReveal(room: StoredClubRoom): void {
    if (room.status !== "question") return;
    const question = room.questions[room.roundIndex];
    const stat = room.stats[room.roundIndex];
    const startedAt = room.questionStartedAt ?? Date.now();
    const isFinal = room.roundIndex >= FINAL_ROUND_INDEX;

    for (const p of room.players) {
      if (p.usedPassThisRound) {
        p.lastResult = {
          answer: null,
          correct: false,
          passed: true,
          timedOut: false,
          timeMs: null,
          eliminatedHere: false,
        };
        p.survivedRounds++;
        if (stat) stat.passes++;
        continue;
      }

      const submitted = p.answer;
      const correct = submitted ? clubAnswerCorrect(question, submitted.value) : false;
      const timeMs = submitted ? Math.max(0, submitted.at - startedAt) : null;

      if (correct) p.correctCount++;
      if (stat) {
        if (!submitted) stat.timeouts++;
        else if (correct) {
          stat.correct++;
          if (timeMs !== null) stat.times.push(timeMs);
        } else {
          stat.incorrect++;
          if (timeMs !== null) stat.times.push(timeMs);
        }
      }

      // Losing winner eligibility never removes anyone from play (§20).
      let eliminatedHere = false;
      if (room.settings.mode === "survival" && !correct && p.winnerEligible) {
        p.winnerEligible = false;
        eliminatedHere = true;
      }
      if (correct) p.survivedRounds++;

      p.lastResult = {
        answer: submitted?.value ?? null,
        correct,
        passed: false,
        timedOut: submitted === null,
        timeMs,
        eliminatedHere,
      };
    }

    if (isFinal) {
      for (const p of room.players) {
        if (room.settings.mode === "survival") {
          p.isWinner = p.winnerEligible && (p.lastResult?.correct ?? false);
        }
      }
      if (room.settings.mode === "highscore") {
        const best = Math.max(...room.players.map((p) => p.correctCount), 0);
        for (const p of room.players) p.isWinner = p.correctCount === best;
      }
    }

    room.status = "reveal";
    room.questionEndsAt = null;
  }

  private endGame(room: StoredClubRoom): void {
    // Ending early (host "End Game") still crowns High Score leaders so the
    // room has something to show.
    if (room.settings.mode === "highscore" && !room.players.some((p) => p.isWinner)) {
      const best = Math.max(...room.players.map((p) => p.correctCount), 0);
      for (const p of room.players) p.isWinner = p.correctCount === best;
    }
    room.status = "ended";
    room.finishedAt = Date.now();
    room.introEndsAt = null;
    room.questionEndsAt = null;
    room.pausedAt = null;
  }

  // ---------- plumbing ----------

  private liveRoom(): StoredClubRoom | null {
    if (!this.room) return null;
    if (Date.now() - this.room.lastActivity >= IDLE_TIMEOUT_MS) return null;
    return this.room;
  }

  private async armAlarm(room: StoredClubRoom): Promise<void> {
    const candidates = [room.lastActivity + IDLE_TIMEOUT_MS];
    if (room.pausedAt === null) {
      if (room.status === "round_intro" && room.introEndsAt !== null) candidates.push(room.introEndsAt);
      if (room.status === "question" && room.questionEndsAt !== null) {
        candidates.push(room.questionEndsAt + REVEAL_GRACE_MS);
      }
    }
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

  private playerStatus(room: StoredClubRoom, p: StoredClubPlayer): ClubPlayerStatus {
    if (room.status === "ended" && p.isWinner) return "winner";
    if (room.settings.mode === "survival" && !p.winnerEligible) return "playing_for_fun";
    if (p.usedPassThisRound) return "passed";
    return "active";
  }

  private questionStats(room: StoredClubRoom): ClubQuestionStat[] {
    return room.stats.map((s) => {
      const attempts = s.correct + s.incorrect;
      const sorted = [...s.times].sort((a, b) => a - b);
      const median = sorted.length
        ? sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : null;
      return {
        questionId: s.questionId,
        difficulty: s.difficulty,
        attempts,
        correct: s.correct,
        incorrect: s.incorrect,
        passes: s.passes,
        timeouts: s.timeouts,
        averageMs: s.times.length
          ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length)
          : null,
        medianMs: median,
        solveRate: attempts > 0 ? Math.round((s.correct / attempts) * 1000) / 10 : null,
      };
    });
  }

  private snapshot(room: StoredClubRoom): ClubSnapshot {
    const connected = this.connectedPlayerIds();
    const revealing = room.status === "reveal";
    const ended = room.status === "ended";
    const question = room.roundIndex >= 0 ? (room.questions[room.roundIndex] ?? null) : null;
    const showQuestion = room.status === "question" || revealing;
    const hostConnected = this.state
      .getWebSockets()
      .some((ws) => (ws.deserializeAttachment() as Attachment | null)?.role === "host");

    return {
      gameType: CLUB_GAME_TYPE,
      roomCode: room.roomCode,
      status: room.status,
      settings: room.settings,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: connected.has(p.id),
        status: this.playerStatus(room, p),
        winnerEligible: room.settings.mode === "highscore" ? true : p.winnerEligible,
        passesRemaining: room.settings.mode === "survival" ? p.passesRemaining : null,
        correctCount: p.correctCount,
        answerLocked: p.answer !== null || p.usedPassThisRound,
        usedPassThisRound: p.usedPassThisRound,
        survivedRounds: p.survivedRounds,
        lastResult: revealing || ended ? p.lastResult : null,
      })),
      hostConnected,
      roundIndex: room.roundIndex,
      totalRounds: CLUB_ROUND_COUNT,
      difficulty: room.roundIndex >= 0 ? CLUB_TIERS[room.roundIndex] : null,
      question:
        showQuestion && question
          ? {
              id: question.id,
              difficulty: question.difficulty,
              questionType: question.questionType,
              prompt: question.prompt,
              choices: question.choices,
              choiceVisuals: question.choiceVisuals,
              visual: question.visual ?? null,
            }
          : null,
      correctAnswer: revealing || ended ? (question?.correctAnswer ?? null) : null,
      explanation: revealing || ended ? (question?.explanation ?? null) : null,
      questionStartedAt: room.questionStartedAt,
      questionEndsAt: room.questionEndsAt,
      introEndsAt: room.introEndsAt,
      paused: room.pausedAt !== null,
      serverNow: Date.now(),
      answersLocked: room.players.filter((p) => p.answer !== null || p.usedPassThisRound).length,
      playersInPlay: room.players.length,
      eligibleCount:
        room.settings.mode === "highscore"
          ? room.players.length
          : room.players.filter((p) => p.winnerEligible).length,
      finishedAt: room.finishedAt,
      winnerIds: ended ? room.players.filter((p) => p.isWinner).map((p) => p.id) : null,
      questionStats: ended ? this.questionStats(room) : null,
    };
  }

  private youFor(room: StoredClubRoom, who: Attachment | null): ClubYouView | null {
    if (who?.role !== "player" || !who.playerId) return null;
    const player = room.players.find((p) => p.id === who.playerId);
    if (!player) return null;
    const unlimited = room.settings.mode === "highscore";
    const canPass =
      room.status === "question" &&
      room.pausedAt === null &&
      room.roundIndex < FINAL_ROUND_INDEX &&
      player.answer === null &&
      !player.usedPassThisRound &&
      (unlimited || player.passesRemaining > 0);
    return {
      playerId: player.id,
      answer: player.answer?.value ?? null,
      passed: player.usedPassThisRound,
      canPass,
      passesRemaining: unlimited ? null : player.passesRemaining,
      winnerEligible: unlimited ? true : player.winnerEligible,
      lastResult: room.status === "reveal" || room.status === "ended" ? player.lastResult : null,
    };
  }

  private broadcast(room: StoredClubRoom): void {
    const snapshot = this.snapshot(room);
    for (const ws of this.state.getWebSockets()) {
      const who = ws.deserializeAttachment() as Attachment | null;
      const message: ClubServerMessage = { type: "state", snapshot, you: this.youFor(room, who) };
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // socket already closing — ignore
      }
    }
  }

  private sendError(ws: WebSocket, code: ClubErrorCode, message: string): void {
    const err: ClubServerMessage = { type: "error", code, message };
    try {
      ws.send(JSON.stringify(err));
    } catch {
      // ignore
    }
  }
}
