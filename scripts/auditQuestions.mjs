// Audit an incoming JSONL question batch: parse errors, internal duplicates,
// overlap with the live bank, and answer/choice integrity.
import { readFileSync } from "node:fs";

const FILE = process.argv[2];
const BANK = "C:/Users/cever/Flourish Friends/Flag Game/src/data/clubQuestions.ts";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const lines = readFileSync(FILE, "utf8").split(/\r?\n/).filter((l) => l.trim());
const rows = [];
const parseErrors = [];
lines.forEach((line, i) => {
  try {
    rows.push({ n: i + 1, q: JSON.parse(line) });
  } catch (err) {
    parseErrors.push(`line ${i + 1}: ${err.message}`);
  }
});

console.log(`lines: ${lines.length}  parsed: ${rows.length}  parse errors: ${parseErrors.length}`);
parseErrors.forEach((e) => console.log("  " + e));

// ---- distribution
const byTier = {};
const byType = {};
const bySource = {};
for (const { q } of rows) {
  byTier[q.difficulty] = (byTier[q.difficulty] ?? 0) + 1;
  byType[q.questionType] = (byType[q.questionType] ?? 0) + 1;
  bySource[q.sourceType] = (bySource[q.sourceType] ?? 0) + 1;
}
console.log("\ntiers:", JSON.stringify(byTier));
console.log("types:", JSON.stringify(byType));
console.log("sourceType:", JSON.stringify(bySource));

// ---- integrity checks
const problems = [];
const seenIds = new Set();
for (const { n, q } of rows) {
  if (!q.id) problems.push(`line ${n}: missing id`);
  if (seenIds.has(q.id)) problems.push(`line ${n}: duplicate id ${q.id}`);
  seenIds.add(q.id);
  if (!q.explanation || !String(q.explanation).trim()) problems.push(`${q.id}: no explanation`);
  if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === "")
    problems.push(`${q.id}: no correctAnswer`);

  const hasChoices = Array.isArray(q.choices) && q.choices.length > 0;
  const needsChoices = ["multiple_choice", "visual_multiple_choice", "image_choice"].includes(
    q.questionType
  );
  if (needsChoices && !hasChoices) problems.push(`${q.id}: ${q.questionType} with no choices`);
  if (hasChoices) {
    const ids = q.choices.map((c) => (typeof c === "string" ? c : c.id));
    const texts = q.choices.map((c) => (typeof c === "string" ? c : c.text));
    if (!ids.includes(q.correctAnswer) && !texts.includes(q.correctAnswer)) {
      problems.push(`${q.id}: correctAnswer "${q.correctAnswer}" is not one of the choices`);
    }
    const dupText = texts.filter((t, i) => texts.indexOf(t) !== i);
    if (dupText.length) problems.push(`${q.id}: repeated choice text ${JSON.stringify(dupText)}`);
  }
  if (!needsChoices && hasChoices) problems.push(`${q.id}: ${q.questionType} but has choices`);
  if (q.visualRequired && !q.visualSpec) problems.push(`${q.id}: visualRequired with no visualSpec`);
}

// ---- internal duplicates (same prompt, or same answer + very similar prompt)
const byPrompt = new Map();
for (const { q } of rows) {
  const key = norm(q.prompt);
  if (!byPrompt.has(key)) byPrompt.set(key, []);
  byPrompt.get(key).push(q.id);
}
const dupPrompts = [...byPrompt.entries()].filter(([, ids]) => ids.length > 1);

// near-duplicates: same normalized answer AND same mechanic
const byAnswerMech = new Map();
for (const { q } of rows) {
  const key = `${norm(q.correctAnswer)}|${norm(q.mechanic)}`;
  if (!byAnswerMech.has(key)) byAnswerMech.set(key, []);
  byAnswerMech.get(key).push(q.id);
}
const dupAnswers = [...byAnswerMech.entries()].filter(([, ids]) => ids.length > 1);

// ---- overlap with the live bank
const bankSrc = readFileSync(BANK, "utf8");
const bankPrompts = [...bankSrc.matchAll(/prompt:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) =>
  norm(m[1].replace(/\\n/g, " "))
);
const bankAnswers = [...bankSrc.matchAll(/correctAnswer:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => norm(m[1]));
const bankIds = [...bankSrc.matchAll(/\bid:\s*"(c[^"]+)"/g)].map((m) => m[1]);

const overlaps = [];
for (const { q } of rows) {
  const p = norm(q.prompt);
  const a = norm(q.correctAnswer);
  const promptHit = bankPrompts.find((bp) => bp && p && (bp.includes(p.slice(0, 40)) || p.includes(bp.slice(0, 40))));
  if (promptHit) overlaps.push(`${q.id} (${q.difficulty}%) ~ live bank prompt: "${promptHit.slice(0, 60)}…"`);
  else if (a && bankAnswers.includes(a) && a.length > 1) {
    overlaps.push(`${q.id} (${q.difficulty}%) shares an answer with the bank: "${a}"`);
  }
}

console.log(`\nbank has ${bankIds.length} questions`);
console.log(`\n--- integrity problems (${problems.length}) ---`);
problems.forEach((p) => console.log("  " + p));
console.log(`\n--- identical prompts inside the file (${dupPrompts.length}) ---`);
dupPrompts.forEach(([k, ids]) => console.log(`  ${ids.join(", ")}: "${k.slice(0, 70)}…"`));
console.log(`\n--- same answer + same mechanic inside the file (${dupAnswers.length}) ---`);
dupAnswers.forEach(([k, ids]) => console.log(`  ${ids.join(", ")}  [${k.slice(0, 50)}]`));
console.log(`\n--- overlap with the live bank (${overlaps.length}) ---`);
overlaps.forEach((o) => console.log("  " + o));
