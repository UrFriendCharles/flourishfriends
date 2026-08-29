// Question Factory importer (spec §45–§47).
//
//   node scripts/importQuestions.mjs batch.jsonl            # report only
//   node scripts/importQuestions.mjs batch.jsonl --write out.ts
//
// Takes a Question Factory JSONL batch, validates it, converts it to the
// game's ClubQuestion shape, and prints an import report. Nothing is ever
// half-imported: a question either converts cleanly or it is rejected with a
// reason, and the rejects never stop the rest of the batch.
//
// Two things it deliberately will NOT do:
//   * invent artwork. A question with visualRequired lands in NEEDS ART with
//     its visualSpec printed, because someone has to draw the component and
//     give it an assetId before the question can be played.
//   * judge a puzzle. It cannot tell you a question has two right answers or
//     sits three tiers too low. That is the human review in §30.

import { readFileSync, writeFileSync } from "node:fs";

const [, , FILE, ...flags] = process.argv;
const OUT = flags.includes("--write") ? flags[flags.indexOf("--write") + 1] : null;
const BANK = "src/data/clubQuestions.ts";

if (!FILE) {
  console.error("usage: node scripts/importQuestions.mjs <batch.jsonl> [--write out.ts]");
  console.error("       node scripts/importQuestions.mjs --digest");
  process.exit(2);
}

const TIERS = [90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0.5];
const TYPES = ["multiple_choice", "text", "number", "true_false", "image_choice", "visual_multiple_choice"];
const LETTER_TYPES = new Set(["visual_multiple_choice", "image_choice"]);
const CHOICE_TYPES = new Set(["multiple_choice", "visual_multiple_choice", "image_choice"]);

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// --digest prints what the bank already covers, so a question worker can be
// told what not to send us again. Workers can't dedupe against a bank they
// have never seen, which is how four of them sent LISTEN/SILENT.
if (FILE === "--digest") {
  const blocks = readFileSync(BANK, "utf8").split(/\n  \{\n/).slice(1);
  const rows = blocks
    .map((b) => ({
      tier: (b.match(/difficulty:\s*([\d.]+)/) || [])[1],
      mechanic: (b.match(/mechanic:\s*"([^"]*)"/) || [])[1],
      answer: (b.match(/correctAnswer:\s*"((?:[^"\\]|\\.)*)"/) || [])[1],
    }))
    .filter((r) => r.tier);
  console.log("Already in the Flourish Friends bank — do not send these puzzles again.");
  console.log("(The same broad mechanic is fine on a genuinely different puzzle.)\n");
  for (const tier of TIERS) {
    const at = rows.filter((r) => Number(r.tier) === tier);
    if (!at.length) continue;
    console.log(`${tier}%`);
    for (const r of at) console.log(`  ${r.mechanic} → ${String(r.answer).slice(0, 42)}`);
  }
  console.log(`\n${rows.length} questions in the bank.`);
  process.exit(0);
}

// ---------- read the live bank so we can spot repeats ----------

let bankPrompts = [];
let bankAnswers = [];
let bankIds = new Set();
try {
  const src = readFileSync(BANK, "utf8");
  bankPrompts = [...src.matchAll(/prompt:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => norm(m[1].replace(/\\n/g, " ")));
  bankAnswers = [...src.matchAll(/correctAnswer:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => norm(m[1]));
  bankIds = new Set([...src.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]));
} catch {
  console.log(`(no bank found at ${BANK} — skipping the duplicate check)\n`);
}

// ---------- parse ----------

const raw = readFileSync(FILE, "utf8").split(/\r?\n/).filter((l) => l.trim());
const rows = [];
const rejects = [];
const needsArt = [];
const duplicates = [];

raw.forEach((line, i) => {
  try {
    rows.push({ line: i + 1, q: JSON.parse(line) });
  } catch (err) {
    rejects.push({ id: `line ${i + 1}`, reason: `invalid JSON — ${err.message}` });
  }
});

// ---------- normalise ----------
//
// Every model returns a slightly different shape, and none of them has
// matched the spec exactly: we have seen `questionText`, `question` and
// `prompt` for the same field, choices as an array of strings, an array of
// {id,text}, and an object keyed by letter, and difficulty as both 90 and
// "90%". Rejecting a good question over a field name helps nobody.

function normaliseRow(q, index) {
  const out = { ...q };

  out.id = q.id ?? `imported-${String(index + 1).padStart(3, "0")}`;
  out.prompt = q.prompt ?? q.questionText ?? q.question ?? q.text;

  if (typeof q.difficulty === "string") {
    out.difficulty = Number(q.difficulty.replace("%", "").trim());
  }

  const typeAliases = {
    text_entry: "text",
    number_entry: "number",
    freetext: "text",
    truefalse: "true_false",
    "true/false": "true_false",
  };
  out.questionType = typeAliases[q.questionType] ?? q.questionType;

  // choices may be [..], [{id,text}..] or {A:"..", B:".."}
  const rawChoices = q.choices ?? q.options;
  if (rawChoices && !Array.isArray(rawChoices) && typeof rawChoices === "object") {
    out.choices = Object.entries(rawChoices).map(([id, text]) => ({ id, text: String(text) }));
  } else if (Array.isArray(rawChoices)) {
    // strip a leading "A) " / "A: " label if the model baked it into the text
    out.choices = rawChoices.map((c, i) => {
      if (typeof c !== "string") return c;
      const m = c.match(/^\s*([A-F])\s*[):.]\s*(.+)$/);
      return m ? { id: m[1], text: m[2] } : { id: String.fromCharCode(65 + i), text: c };
    });
  }

  if (typeof out.correctAnswer === "boolean") out.correctAnswer = String(out.correctAnswer);
  if (typeof out.correctAnswer === "number") out.correctAnswer = String(out.correctAnswer);

  // artwork may arrive as a top-level assetId, nested under visual, or as a
  // visualSpec asking for something new
  const assetId = q.assetId ?? q.visual?.assetId;
  const spec = q.visualSpec ?? q.visual?.visualSpec ?? q.visual?.description;
  if (assetId) out.assetId = assetId;
  if (spec && !assetId) {
    out.visualRequired = true;
    out.visualSpec = typeof spec === "string" ? { description: spec } : spec;
  }
  return out;
}

// ---------- validate + convert ----------

const seenIds = new Set();
const accepted = [];
const referencedAssets = [];
const missingSource = [];

for (let i = 0; i < rows.length; i++) rows[i].q = normaliseRow(rows[i].q, i);

for (const { line, q } of rows) {
  const id = q?.id ?? `line ${line}`;
  const fail = (reason) => rejects.push({ id, reason });

  if (!q?.id) {
    fail("missing id");
    continue;
  }
  if (seenIds.has(q.id)) {
    fail(`duplicate ID within the batch`);
    continue;
  }
  seenIds.add(q.id);
  if (bankIds.has(q.id)) {
    fail("ID already exists in the bank");
    continue;
  }

  if (!q.prompt || !String(q.prompt).trim()) {
    fail("missing prompt");
    continue;
  }
  if (!TIERS.includes(q.difficulty)) {
    const hint = q.difficulty === 1 ? " — suggested Flourish difficulty: 0.5" : "";
    fail(`unsupported difficulty: ${q.difficulty}${hint}`);
    continue;
  }
  if (!TYPES.includes(q.questionType)) {
    fail(`unsupported question type: ${q.questionType}`);
    continue;
  }
  if (q.correctAnswer === undefined || q.correctAnswer === null || `${q.correctAnswer}`.trim() === "") {
    fail("missing correctAnswer");
    continue;
  }
  if (!q.explanation || !String(q.explanation).trim()) {
    fail("missing explanation");
    continue;
  }
  // A missing citation is a provenance gap, not a broken question — flag it
  // and carry on rather than throwing the puzzle away.
  if (
    (q.sourceType === "source" || q.sourceType === "adapted") &&
    !q.source?.url &&
    !q.source?.title &&
    !q.sourceReference
  ) {
    missingSource.push(q.id);
  }
  if (
    q.timerSeconds !== undefined &&
    (typeof q.timerSeconds !== "number" || q.timerSeconds < 5 || q.timerSeconds > 180)
  ) {
    fail(`bad timerSeconds: ${q.timerSeconds}`);
    continue;
  }

  // choices: the factory schema uses {id, text}; the game uses plain strings.
  let choices;
  let correctAnswer = String(q.correctAnswer);
  if (CHOICE_TYPES.has(q.questionType)) {
    const list = Array.isArray(q.choices) ? q.choices : [];
    if (list.length < 2 || list.length > 6) {
      fail(`${q.questionType} needs 2–6 choices, got ${list.length}`);
      continue;
    }
    const ids = list.map((c) => (typeof c === "string" ? c : c?.id));
    const texts = list.map((c) => (typeof c === "string" ? c : c?.text));
    if (texts.some((t) => !t)) {
      fail("a choice has no text");
      continue;
    }
    const byLetter = ids.indexOf(correctAnswer);
    if (byLetter === -1 && !texts.includes(correctAnswer)) {
      fail(`correctAnswer references missing choice ${correctAnswer}`);
      continue;
    }
    // Lettered types keep A/B/C/D, because the letters are printed on the
    // artwork. Everything else answers with the choice text.
    if (LETTER_TYPES.has(q.questionType)) {
      choices = ids.map((c, i) => c ?? String.fromCharCode(65 + i));
      correctAnswer = byLetter === -1 ? choices[texts.indexOf(correctAnswer)] : correctAnswer;
    } else {
      choices = texts;
      if (byLetter !== -1) correctAnswer = texts[byLetter];
    }
    const dupes = choices.filter((c, i) => choices.indexOf(c) !== i);
    if (dupes.length) {
      fail(`repeated choice text: ${dupes.join(", ")}`);
      continue;
    }
  } else if (Array.isArray(q.choices) && q.choices.length) {
    fail(`${q.questionType} should not have choices`);
    continue;
  }

  if (q.questionType === "true_false" && !["true", "false"].includes(norm(correctAnswer))) {
    fail(`true_false answer must be true or false, got "${correctAnswer}"`);
    continue;
  }

  // Artwork can't be conjured — hold these back for someone to draw.
  if (q.visualRequired) {
    if (!q.visualSpec?.description && !q.visualSpec?.altText) {
      fail("visualRequired but the visualSpec has no description");
      continue;
    }
    needsArt.push({
      id: q.id,
      difficulty: q.difficulty,
      prompt: String(q.prompt).replace(/\n/g, " ").slice(0, 90),
      template: q.visualSpec.template ?? "(no template)",
      description: q.visualSpec.description ?? q.visualSpec.altText,
      altText: q.visualSpec.altText ?? "",
    });
    continue;
  }

  // Near-duplicate of something already playable?
  const p = norm(q.prompt);
  const a = norm(correctAnswer);
  const promptHit = bankPrompts.find((bp) => bp && p && (bp.includes(p.slice(0, 40)) || p.includes(bp.slice(0, 40))));
  if (promptHit) {
    duplicates.push({ id: q.id, why: `prompt matches a bank question: "${promptHit.slice(0, 55)}…"` });
    continue;
  }
  if (a && a.length > 2 && bankAnswers.includes(a) && CHOICE_TYPES.has(q.questionType) === false) {
    duplicates.push({ id: q.id, why: `same answer as a bank question ("${a}") — check the mechanic` });
    continue;
  }

  // A question pointing at an existing component still needs a human to look
  // at it: every batch so far has referenced a real assetId while describing
  // artwork that isn't what the component draws.
  let visual;
  if (q.assetId) {
    const ids = String(q.assetId).split(/[\s/+,]+/).filter(Boolean);
    referencedAssets.push({ id: q.id, assets: ids });
    visual = { type: "svg", assetId: ids[0], altText: q.visualSpec?.altText ?? "" };
  }

  const categories = Array.isArray(q.category) ? q.category : [q.category].filter(Boolean);
  accepted.push({
    id: q.id,
    difficulty: q.difficulty,
    questionType: q.questionType,
    prompt: q.prompt,
    ...(choices ? { choices } : {}),
    correctAnswer,
    ...(Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length
      ? { acceptedAnswers: [...new Set(q.acceptedAnswers.map((s) => String(s)))] }
      : {}),
    explanation: q.explanation,
    ...(visual ? { visual } : {}),
    ...(q.timerSeconds && q.timerSeconds !== 30 ? { timerSeconds: q.timerSeconds } : {}),
    category: (categories[0] ?? "logic").replace(/_/g, " "),
    mechanic: String(q.mechanic ?? "unspecified").replace(/_/g, " "),
    sourceType: q.sourceType === "source" ? "adapted" : (q.sourceType ?? "original"),
    ...(q.source?.title || q.source?.url || q.sourceReference
      ? { sourceReference: q.source?.title ?? q.source?.url ?? q.sourceReference }
      : {}),
  });
}

// ---------- report (§47) ----------

const tierCount = accepted.reduce((o, q) => ((o[q.difficulty] = (o[q.difficulty] ?? 0) + 1), o), {});
const typeCount = accepted.reduce((o, q) => ((o[q.questionType] = (o[q.questionType] ?? 0) + 1), o), {});

console.log(`Batch ${FILE.split(/[\\/]/).pop()}`);
console.log(`Questions submitted: ${raw.length}`);
console.log(`Ready to import:     ${accepted.length}`);
console.log(`Needs artwork:       ${needsArt.length}`);
console.log(`Duplicates:          ${duplicates.length}`);
console.log(`Rejected:            ${rejects.length}`);

if (rejects.length) {
  console.log("\nRejected");
  for (const r of rejects) console.log(`  ${r.id}\n    ${r.reason}`);
}
if (duplicates.length) {
  console.log("\nAlready covered by the bank");
  for (const d of duplicates) console.log(`  ${d.id}\n    ${d.why}`);
}
if (needsArt.length) {
  console.log("\nHeld back until someone draws the artwork");
  for (const n of needsArt) {
    console.log(`  ${n.id} [${n.difficulty}%] template: ${n.template}`);
    console.log(`    ${n.prompt}`);
    console.log(`    ${String(n.description).slice(0, 150)}`);
  }
}
if (missingSource.length) {
  console.log(`\nAdapted but uncited (${missingSource.length}) — provenance needed before publishing`);
  console.log(`  ${missingSource.join(", ")}`);
}
if (referencedAssets.length) {
  let registry = "";
  try {
    registry = readFileSync("src/data/clubVisuals.tsx", "utf8");
  } catch {
    /* no registry to check against */
  }
  const unknown = referencedAssets.filter((r) => r.assets.some((a) => registry && !registry.includes(`${a}:`) && !registry.includes(`${a} `)));
  console.log(`\nReuses existing artwork (${referencedAssets.length}) — CHECK EACH ONE`);
  console.log("  A model can name a real assetId and still be describing different art,");
  console.log("  which means its option letters may not match what we actually draw.");
  for (const r of referencedAssets) console.log(`  ${r.id} → ${r.assets.join(", ")}`);
  if (unknown.length) {
    console.log(`\n  Not in the registry: ${unknown.map((u) => u.id).join(", ")}`);
  }
}
if (accepted.length) {
  console.log(`\nBy tier: ${JSON.stringify(tierCount)}`);
  console.log(`By type: ${JSON.stringify(typeCount)}`);
  const missing = TIERS.filter((t) => !tierCount[t]);
  if (missing.length) console.log(`Tiers with nothing importable: ${missing.join(", ")}`);
}

// ---------- emit ----------

if (OUT) {
  const body = accepted
    .map((q) => "  " + JSON.stringify(q, null, 2).split("\n").join("\n  "))
    .join(",\n");
  const ts = `import type { ClubQuestion } from "../logic/clubProtocol";

// Imported by scripts/importQuestions.mjs from ${FILE.split(/[\\/]/).pop()}.
// Read every one of these before moving it into clubQuestions.ts — the
// importer checks structure, not whether a puzzle is any good.

export const IMPORTED_QUESTIONS: ClubQuestion[] = [
${body}
];
`;
  writeFileSync(OUT, ts);
  console.log(`\nWrote ${accepted.length} questions to ${OUT}`);
}

process.exit(0);
