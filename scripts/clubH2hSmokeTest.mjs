// End-to-end smoke test for 0.5% Club head-to-head rooms, driven straight
// against the worker. Start `npx wrangler dev` first, then:
//
//   node scripts/clubH2hSmokeTest.mjs [http://localhost:8787]
//
// Two players, no host: the room must start by itself when the second phone
// joins, cap at two players, advance on its own after each reveal, crown a
// winner, and hand both phones the same rematch room.

const BASE = process.argv[2] ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
const TIERS = [90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0.5];

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
}

const questions = TIERS.map((difficulty, i) => ({
  id: `h2h_${i}`,
  difficulty,
  questionType: "multiple_choice",
  prompt: `Question ${i + 1}`,
  choices: ["A", "B", "C", "D"],
  correctAnswer: "A",
  explanation: "A is always right here.",
  category: "logic",
  mechanic: "smoke",
  sourceType: "original",
}));

async function createRoom(headToHead) {
  const res = await fetch(`${BASE}/api/club/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      settings: { mode: "highscore", timerSeconds: 5, passes: 1, pack: "all", headToHead },
      questions,
    }),
  });
  if (!res.ok) throw new Error(`create failed ${res.status}: ${await res.text()}`);
  return res.json();
}

function connect(code, name) {
  const ws = new WebSocket(`${WS_BASE}/ws/c/${code}`);
  const client = { ws, snapshot: null, you: null, error: null, waiters: [] };
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === "error") client.error = msg.code;
    else {
      client.snapshot = msg.snapshot;
      client.you = msg.you;
    }
    client.waiters = client.waiters.filter((w) => !w());
  });
  ws.addEventListener("open", () => ws.send(JSON.stringify({ type: "hello", role: "player", name })));
  client.send = (m) => ws.send(JSON.stringify(m));
  client.until = (pred, ms = 20000) =>
    new Promise((resolve, reject) => {
      if (pred(client)) return resolve();
      const t = setTimeout(() => reject(new Error(`timed out waiting (${name})`)), ms);
      client.waiters.push(() => (pred(client) ? (clearTimeout(t), resolve(), true) : false));
    });
  return client;
}

const { roomCode } = await createRoom(true);
console.log(`head-to-head room ${roomCode}`);

const alex = connect(roomCode, "Alex");
await alex.until((c) => c.snapshot?.players.length === 1);
check("first player waits in the lobby", alex.snapshot.status === "lobby");
check("no auto-start with one player", alex.snapshot.autoAdvanceAt === null);

const sam = connect(roomCode, "Sam");
await alex.until((c) => c.snapshot?.players.length === 2);
check("second player joining arms the start countdown", alex.snapshot.autoAdvanceAt !== null);

const info = await (await fetch(`${BASE}/api/rooms/${roomCode}`)).json();
check("room reports it can't take a third player", info.canJoin === false);
const extra = connect(roomCode, "Extra");
await extra.until((c) => c.error !== null);
check("third player is turned away", extra.error === "room-full", extra.error);

await alex.until((c) => c.snapshot?.status === "question" && c.snapshot.roundIndex === 0);
check("round 1 starts with no host", true);

for (let round = 0; round < TIERS.length; round++) {
  await alex.until((c) => c.snapshot?.status === "question" && c.snapshot.roundIndex === round);
  alex.send({ type: "answer", answer: "A" }); // Alex always right
  sam.send({ type: "answer", answer: round % 2 ? "A" : "B" }); // Sam right on odd rounds
  await alex.until((c) => c.snapshot?.status === "reveal" && c.snapshot.roundIndex === round);
  if (round === 0) {
    check("both answering reveals early", true);
    check("reveal arms the auto-advance", alex.snapshot.autoAdvanceAt !== null);
    const samView = alex.snapshot.players.find((p) => p.name === "Sam");
    check("opponent's result is visible at the reveal", samView?.lastResult?.correct === false);
  }
}

await alex.until((c) => c.snapshot?.status === "ended", 30000);
const s = alex.snapshot;
const alexId = s.players.find((p) => p.name === "Alex").id;
check("game ends by itself after round 11", s.status === "ended");
check("Alex wins 11–5", JSON.stringify(s.winnerIds) === JSON.stringify([alexId]),
  `${s.players.map((p) => `${p.name}:${p.correctCount}`).join(" ")}`);

const { roomCode: next } = await createRoom(true);
sam.send({ type: "rematch", roomCode: next });
await alex.until((c) => c.snapshot?.rematch?.roomCode === next);
check("rematch room is offered to the other phone", true);

// a TV room must still wait for its host
const tv = await createRoom(false);
const t1 = connect(tv.roomCode, "T1");
const t2 = connect(tv.roomCode, "T2");
await t1.until((c) => c.snapshot?.players.length === 2);
await new Promise((r) => setTimeout(r, 4500));
check("TV room still waits for the host", t1.snapshot.status === "lobby" && t1.snapshot.autoAdvanceAt === null);

for (const c of [alex, sam, extra, t1, t2]) c.ws.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
