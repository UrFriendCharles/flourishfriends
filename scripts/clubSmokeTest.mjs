// End-to-end smoke test for 0.5% Club rooms, driven straight against the
// worker (no browser). Start `npx wrangler dev` first, then:
//
//   node scripts/clubSmokeTest.mjs [http://localhost:8787]
//
// It plays whole games over the real WebSocket protocol and asserts the rules
// from the spec's acceptance list: survival eliminations that keep playing,
// Passes, the no-Pass final, High Score scoring and co-winners, automatic
// timer expiry, reconnection, and per-question analytics.

const BASE = process.argv[2] ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
const TIERS = [90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0.5];

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}

function testQuestions(timerSeconds) {
  return TIERS.map((difficulty, i) => ({
    id: `smoke_${i}`,
    difficulty,
    questionType: "multiple_choice",
    prompt: `Smoke question ${i + 1}`,
    choices: ["A", "B", "C", "D"],
    correctAnswer: "A",
    explanation: "A is always right in the smoke test.",
    ...(timerSeconds ? { timerSeconds } : {}),
    category: "logic",
    mechanic: "smoke",
    sourceType: "original",
  }));
}

async function createRoom(settings, questions) {
  const res = await fetch(`${BASE}/api/club/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ settings, questions }),
  });
  if (!res.ok) throw new Error(`create room failed ${res.status}: ${await res.text()}`);
  return res.json();
}

/** A live connection that remembers the latest snapshot and can await states. */
function connect(roomCode, hello) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/ws/c/${roomCode}`);
    const conn = {
      ws,
      snapshot: null,
      you: null,
      error: null,
      send: (msg) => ws.send(JSON.stringify(msg)),
      close: () => ws.close(),
      waitFor(predicate, label = "state", timeoutMs = 20000) {
        if (this.snapshot && predicate(this.snapshot, this.you)) return Promise.resolve(this.snapshot);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            waiters.delete(entry);
            rej(new Error(`timed out waiting for ${label} (status=${conn.snapshot?.status})`));
          }, timeoutMs);
          const entry = { predicate, res, timer };
          waiters.add(entry);
        });
      },
    };
    const waiters = new Set();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "error") {
        conn.error = msg;
        return;
      }
      conn.snapshot = msg.snapshot;
      conn.you = msg.you;
      for (const entry of [...waiters]) {
        if (entry.predicate(conn.snapshot, conn.you)) {
          clearTimeout(entry.timer);
          waiters.delete(entry);
          entry.res(conn.snapshot);
        }
      }
      if (!conn.ready) {
        conn.ready = true;
        resolve(conn);
      }
    };
    ws.onerror = () => reject(new Error("socket error"));
    ws.onopen = () => ws.send(JSON.stringify(hello));
    setTimeout(() => reject(new Error("connect timed out")), 8000);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Start a game: lobby → how-to-play → first round. */
async function startGame(host) {
  host.send({ type: "start" });
  await host.waitFor((s) => s.status === "intro", "intro");
  host.send({ type: "start" });
}

// ---------------------------------------------------------------- survival

async function survivalGame() {
  console.log("\nClassic Survival — eliminations keep playing, Passes, no-Pass final");
  const { roomCode, hostKey } = await createRoom(
    { mode: "survival", timerSeconds: 30, passes: 1, pack: "all" },
    testQuestions()
  );
  const host = await connect(roomCode, { type: "hello", role: "host", hostKey });
  const ada = await connect(roomCode, { type: "hello", role: "player", name: "Ada" });
  const bo = await connect(roomCode, { type: "hello", role: "player", name: "Bo" });
  const cy = await connect(roomCode, { type: "hello", role: "player", name: "Cy" });
  await host.waitFor((s) => s.players.length === 3, "3 players");

  await startGame(host);

  for (let round = 0; round < 11; round++) {
    await host.waitFor((s) => s.status === "question" && s.roundIndex === round, `round ${round}`);
    const isFinal = round === 10;

    ada.send({ type: "answer", answer: "A" }); // always right
    if (round === 0) {
      bo.send({ type: "answer", answer: "B" }); // wrong — loses eligibility here
      cy.send({ type: "pass" }); // uses their only Pass
    } else if (round === 1) {
      bo.send({ type: "answer", answer: "A" }); // right, but can no longer win
      cy.send({ type: "pass" }); // no Passes left — must be ignored
      await sleep(150);
      cy.send({ type: "answer", answer: "C" }); // wrong — loses eligibility
    } else {
      bo.send({ type: "answer", answer: "A" });
      if (isFinal) {
        cy.send({ type: "pass" }); // the 0.5% question can't be passed
        await sleep(150);
      }
      cy.send({ type: "answer", answer: "A" });
    }

    const revealed = await host.waitFor((s) => s.status === "reveal", `reveal ${round}`);

    if (round === 0) {
      const bo0 = revealed.players.find((p) => p.name === "Bo");
      const cy0 = revealed.players.find((p) => p.name === "Cy");
      check("wrong answer ends winner eligibility", bo0.winnerEligible === false);
      check("…but the player stays in play", bo0.status === "playing_for_fun");
      check("Pass survives the round", cy0.winnerEligible === true && cy0.lastResult.passed);
      check("Pass is spent", cy0.passesRemaining === 0);
      check("still-eligible count is right", revealed.eligibleCount === 2, `got ${revealed.eligibleCount}`);
    }
    if (round === 1) {
      const cy1 = revealed.players.find((p) => p.name === "Cy");
      check("a spent Pass can't be reused", cy1.lastResult.passed === false);
      check("wrong answer without a Pass ends eligibility", cy1.winnerEligible === false);
      const bo1 = revealed.players.find((p) => p.name === "Bo");
      check("out-of-contention answers still count", bo1.correctCount === 1);
    }
    if (isFinal) {
      const cyF = revealed.players.find((p) => p.name === "Cy");
      check("no Pass on the 0.5% question", cyF.lastResult.passed === false && cyF.lastResult.correct);
    }

    host.send({ type: "next" });
  }

  const ended = await host.waitFor((s) => s.status === "ended", "ended");
  const ada2 = ended.players.find((p) => p.name === "Ada");
  const bo2 = ended.players.find((p) => p.name === "Bo");
  const cy2 = ended.players.find((p) => p.name === "Cy");

  check("only eligible finalists win", JSON.stringify(ended.winnerIds) === JSON.stringify([ada2.id]));
  check("winner status is set", ada2.status === "winner");
  check("eliminated player answered every round", bo2.correctCount === 10, `got ${bo2.correctCount}`);
  check("eliminated player can't win by answering the final", !ended.winnerIds.includes(bo2.id));
  check("passed round still counts as survived", cy2.survivedRounds === 10, `got ${cy2.survivedRounds}`);

  const stats = ended.questionStats ?? [];
  const first = stats[0];
  check("per-question analytics are saved", stats.length === 11);
  check(
    "round 1 analytics add up",
    first.attempts === 2 && first.correct === 1 && first.incorrect === 1 && first.passes === 1,
    JSON.stringify(first)
  );
  check("solve rate is recorded", first.solveRate === 50, `got ${first.solveRate}`);
  check("average response time is recorded", typeof first.averageMs === "number");

  for (const c of [host, ada, bo, cy]) c.close();
}

// --------------------------------------------------------------- highscore

async function highScoreGame() {
  console.log("\nUnlimited Pass / High Score — unlimited Passes, 1 point per correct, co-winners");
  const { roomCode, hostKey } = await createRoom(
    { mode: "highscore", timerSeconds: 30, passes: 1, pack: "all" },
    testQuestions()
  );
  const host = await connect(roomCode, { type: "hello", role: "host", hostKey });
  const dee = await connect(roomCode, { type: "hello", role: "player", name: "Dee" });
  const eve = await connect(roomCode, { type: "hello", role: "player", name: "Eve" });
  const fay = await connect(roomCode, { type: "hello", role: "player", name: "Fay" });
  await host.waitFor((s) => s.players.length === 3, "3 players");

  await startGame(host);

  for (let round = 0; round < 11; round++) {
    await host.waitFor((s) => s.status === "question" && s.roundIndex === round, `round ${round}`);
    // Dee and Eve both get everything right (a tie at the top); Fay passes
    // every non-final round, which is allowed as often as she likes.
    dee.send({ type: "answer", answer: "A" });
    eve.send({ type: "answer", answer: "A" });
    if (round === 10) fay.send({ type: "answer", answer: "B" });
    else fay.send({ type: "pass" });

    const revealed = await host.waitFor((s) => s.status === "reveal", `reveal ${round}`);
    if (round === 0) {
      const fay0 = revealed.players.find((p) => p.name === "Fay");
      check("High Score passes are unlimited", fay0.lastResult.passed === true);
      check("passes don't cost a balance", fay0.passesRemaining === null);
      check("nobody loses eligibility", revealed.players.every((p) => p.winnerEligible));
    }
    if (round === 3) {
      const fay3 = revealed.players.find((p) => p.name === "Fay");
      check("a fourth Pass still works", fay3.lastResult.passed === true);
      check("a Pass scores nothing", fay3.correctCount === 0);
    }
    host.send({ type: "next" });
  }

  const ended = await host.waitFor((s) => s.status === "ended", "ended");
  const names = (ids) =>
    ids
      .map((id) => ended.players.find((p) => p.id === id)?.name)
      .sort()
      .join(",");
  check("everyone finishes eligible", ended.players.every((p) => p.winnerEligible));
  check("top scorers tie as co-winners", names(ended.winnerIds) === "Dee,Eve", names(ended.winnerIds));
  check(
    "1 point per correct answer",
    ended.players.find((p) => p.name === "Dee").correctCount === 11
  );
  check("wrong answers score nothing", ended.players.find((p) => p.name === "Fay").correctCount === 0);

  for (const c of [host, dee, eve, fay]) c.close();
}

// ----------------------------------------------- timer expiry + reconnect

async function timerAndReconnect() {
  console.log("\nServer-run clock and reconnection");
  const { roomCode, hostKey } = await createRoom(
    { mode: "survival", timerSeconds: 6, passes: 0, pack: "all" },
    testQuestions(6)
  );
  const host = await connect(roomCode, { type: "hello", role: "host", hostKey });
  const gus = await connect(roomCode, { type: "hello", role: "player", name: "Gus" });
  const hal = await connect(roomCode, { type: "hello", role: "player", name: "Hal" });
  await host.waitFor((s) => s.players.length === 2, "2 players");
  await startGame(host);

  // Round 1: Gus locks in, Hal never answers — the clock ends the round.
  await host.waitFor((s) => s.status === "question" && s.roundIndex === 0, "round 0");
  gus.send({ type: "answer", answer: "A" });
  await gus.waitFor((_s, you) => you?.answer === "A", "answer locked");
  const gusId = gus.you.playerId;

  const expired = await host.waitFor((s) => s.status === "reveal", "timer reveal", 20000);
  const hal0 = expired.players.find((p) => p.name === "Hal");
  check("the timer ends the round on its own", expired.status === "reveal");
  check("no answer counts as a timeout", hal0.lastResult.timedOut === true);
  check("a timeout ends winner eligibility", hal0.winnerEligible === false);

  // Reconnect Gus mid-game, as a phone refresh would.
  host.send({ type: "next" });
  await host.waitFor((s) => s.status === "question" && s.roundIndex === 1, "round 1");
  gus.send({ type: "answer", answer: "A" });
  await gus.waitFor((_s, you) => you?.answer === "A", "second answer locked");
  gus.close();
  await sleep(300);
  const gusAgain = await connect(roomCode, {
    type: "hello",
    role: "player",
    name: "Gus",
    playerId: gusId,
  });
  check("a refresh rejoins as the same player", gusAgain.you.playerId === gusId);
  check("the room doesn't grow a duplicate", gusAgain.snapshot.players.length === 2);
  check("the locked answer survives the refresh", gusAgain.you.answer === "A");
  check(
    "eligibility survives the refresh",
    gusAgain.snapshot.players.find((p) => p.id === gusId).winnerEligible === true
  );

  host.send({ type: "end" });
  const ended = await host.waitFor((s) => s.status === "ended", "ended");
  check(
    "timeouts are recorded in analytics",
    ended.questionStats?.[0]?.timeouts === 1,
    JSON.stringify(ended.questionStats?.[0])
  );

  for (const c of [host, hal, gusAgain]) c.close();
}

// -------------------------------------------------------------------------

try {
  await survivalGame();
  await highScoreGame();
  await timerAndReconnect();
} catch (err) {
  console.error("\nsmoke test crashed:", err.message);
  failures++;
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
