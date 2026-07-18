import { allEntries } from "../data/countries";

// Common alternate names accepted in typed-answer mode, keyed by canonical name.
const ALIASES: Record<string, string[]> = {
  "United States": ["USA", "US", "America", "United States of America"],
  "United Kingdom": ["UK", "Great Britain", "Britain"],
  "United Arab Emirates": ["UAE", "Emirates"],
  "Democratic Republic of the Congo": ["DRC", "DR Congo", "Congo-Kinshasa", "Congo"],
  "Republic of the Congo": ["Congo", "Congo-Brazzaville"],
  "Ivory Coast": ["Cote d'Ivoire", "Côte d'Ivoire"],
  Czechia: ["Czech Republic"],
  Eswatini: ["Swaziland"],
  Myanmar: ["Burma"],
  Netherlands: ["Holland", "The Netherlands"],
  "Timor-Leste": ["East Timor", "Timor Leste"],
  "Cabo Verde": ["Cape Verde"],
  "North Macedonia": ["Macedonia"],
  "Vatican City": ["Vatican", "Holy See"],
  "Bosnia and Herzegovina": ["Bosnia"],
  "Saint Kitts and Nevis": ["St Kitts and Nevis", "St Kitts"],
  "Saint Lucia": ["St Lucia"],
  "Saint Vincent and the Grenadines": ["St Vincent", "Saint Vincent"],
  "Trinidad and Tobago": ["Trinidad"],
  "Antigua and Barbuda": ["Antigua"],
  "South Korea": ["Korea", "Republic of Korea"],
  "North Korea": ["DPRK"],
  Turkey: ["Turkiye", "Türkiye"],
  Russia: ["Russian Federation"],
  "The Gambia": ["Gambia"],
  "São Tomé and Príncipe": ["Sao Tome", "São Tomé"],
  "Papua New Guinea": ["PNG"],
  "New Zealand": ["NZ"],
};

/** Lowercase, strip accents & punctuation, drop a leading "the", remove spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "")
    .replace(/\s/g, "");
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Max typo distance allowed for a normalized target of this length. */
function fuzzLimit(len: number): number {
  if (len <= 3) return 0;
  if (len <= 8) return 1;
  return 2;
}

// All normalized names in the game (canonical + aliases) — used so a fuzzy
// match is only accepted when it isn't equally close to a DIFFERENT answer
// (e.g. "iraq" must never fuzzy-match a question about Iran).
const ALL_NORMALIZED: { norm: string; canonical: string }[] = [];
const seen = new Set<string>();
for (const entry of allEntries) {
  for (const name of [entry.country, ...(ALIASES[entry.country] ?? [])]) {
    const norm = normalizeAnswer(name);
    const key = `${norm}|${entry.country}`;
    if (norm && !seen.has(key)) {
      seen.add(key);
      ALL_NORMALIZED.push({ norm, canonical: entry.country });
    }
  }
}

/**
 * Is a typed answer an acceptable match for the correct canonical name?
 * Accepts exact normalized matches, known aliases, and small typos —
 * but a typo match is rejected if another answer in the game is at least
 * as close to what was typed.
 */
export function isAnswerCorrect(typed: string, correctAnswer: string): boolean {
  const input = normalizeAnswer(typed);
  if (!input) return false;

  const targets = [correctAnswer, ...(ALIASES[correctAnswer] ?? [])].map(normalizeAnswer);
  if (targets.includes(input)) return true;

  // fuzzy pass: each alias gets a typo allowance based on its own length
  const withinLimit = targets.some((t) => levenshtein(input, t) <= fuzzLimit(t.length));
  if (!withinLimit) return false;
  const bestToCorrect = Math.min(...targets.map((t) => levenshtein(input, t)));

  // must not be at least as close to some other answer
  for (const { norm, canonical } of ALL_NORMALIZED) {
    if (canonical === correctAnswer) continue;
    if (levenshtein(input, norm) <= bestToCorrect) return false;
  }
  return true;
}
