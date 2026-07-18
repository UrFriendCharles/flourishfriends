import type { Collection, Continent, Country, Difficulty, Question } from "../types";
import { collectionEntries, flagUrl, stateShapeUrl } from "../data/countries";
import { CAPITAL_TRAPS } from "../data/capitalTraps";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function poolForDifficulty(
  dataset: Country[],
  difficulty: Difficulty,
  continents: Continent[]
): Country[] {
  let pool: Country[];
  if (difficulty === "easy") {
    pool = dataset.filter((c) => c.difficulty === "easy");
  } else if (difficulty === "medium") {
    pool = dataset.filter((c) => c.difficulty !== "hard");
  } else {
    // hard: medium + hard, weighted toward hard at pick time
    pool = dataset.filter((c) => c.difficulty !== "easy");
  }
  if (continents.length > 0) {
    const filtered = pool.filter((c) => continents.includes(c.continent));
    // fall back to the unfiltered pool if the continent filter leaves too few
    if (filtered.length >= 4) pool = filtered;
  }
  return pool;
}

function pickCorrectCountries(pool: Country[], count: number, difficulty: Difficulty): Country[] {
  // In hard games, bias selection toward hard-rated flags
  const weighted =
    difficulty === "hard"
      ? [...pool, ...pool.filter((c) => c.difficulty === "hard")]
      : pool;
  const picked: Country[] = [];
  const usedIds = new Set<string>();
  for (const c of shuffle(weighted)) {
    if (usedIds.has(c.id)) continue;
    usedIds.add(c.id);
    picked.push(c);
    if (picked.length >= count) break;
  }
  return picked;
}

function pickDistractors(dataset: Country[], correct: Country, difficulty: Difficulty): string[] {
  const chosen: string[] = [];
  const taken = new Set<string>([correct.country]);
  const byName = new Map(dataset.map((c) => [c.country, c]));

  const addFrom = (candidates: Country[]) => {
    for (const c of shuffle(candidates)) {
      if (chosen.length >= 3) return;
      if (taken.has(c.country)) continue;
      taken.add(c.country);
      chosen.push(c.country);
    }
  };

  if (difficulty === "hard") {
    // Prefer explicitly confusable flags, then same region, then same continent
    const confusable = correct.confusableWith
      .map((name) => byName.get(name))
      .filter((c): c is Country => !!c);
    addFrom(confusable);
    addFrom(dataset.filter((c) => c.region === correct.region));
    addFrom(dataset.filter((c) => c.continent === correct.continent));
  } else if (difficulty === "medium") {
    // Same continent, favoring same region
    addFrom(dataset.filter((c) => c.region === correct.region));
    addFrom(dataset.filter((c) => c.continent === correct.continent));
  } else {
    // Easy: prefer visually/geographically distant entries
    addFrom(dataset.filter((c) => c.continent !== correct.continent));
    addFrom(dataset.filter((c) => c.region !== correct.region));
  }
  // Backstop: anything left
  addFrom(dataset);
  return chosen;
}

/**
 * Wrong answers for a capital question. Hard mode leads with the state's own
 * famous non-capital cities (Seattle for Washington…), then nearby states'
 * capitals; medium stays in-region; easy pulls far-away capitals.
 */
function pickCapitalDistractors(
  dataset: Country[],
  correct: Country,
  difficulty: Difficulty
): string[] {
  const chosen: string[] = [];
  const taken = new Set<string>([correct.capital]);
  const addNames = (candidates: string[]) => {
    for (const name of shuffle(candidates)) {
      if (chosen.length >= 3) return;
      if (taken.has(name)) continue;
      taken.add(name);
      chosen.push(name);
    }
  };
  const capitalsOf = (states: Country[]) =>
    states.filter((s) => s.id !== correct.id).map((s) => s.capital);

  if (difficulty === "hard") {
    addNames((CAPITAL_TRAPS[correct.id] ?? []).slice(0, 2)); // max 2 traps, keep 1 real capital
    addNames(capitalsOf(dataset.filter((s) => s.region === correct.region)));
  } else if (difficulty === "medium") {
    addNames(capitalsOf(dataset.filter((s) => s.region === correct.region)));
  } else {
    addNames(capitalsOf(dataset.filter((s) => s.region !== correct.region)));
  }
  addNames(capitalsOf(dataset));
  return chosen;
}

function buildQuestion(
  dataset: Country[],
  country: Country,
  difficulty: Difficulty,
  idPrefix: string,
  i: number,
  collection: Collection
): Question {
  if (collection === "usCapitals") {
    const named = difficulty === "easy"; // easy names the state; harder = silhouette only
    return {
      id: `${idPrefix}-${i}-${country.id}`,
      countryId: country.id,
      flagImage: stateShapeUrl(country),
      correctAnswer: country.capital,
      choices: shuffle([country.capital, ...pickCapitalDistractors(dataset, country, difficulty)]),
      kind: "capital",
      prompt: named
        ? `What's the capital of ${country.country}?`
        : "What's the capital of this state?",
    };
  }
  return {
    id: `${idPrefix}-${i}-${country.id}`,
    countryId: country.id,
    flagImage: flagUrl(country),
    correctAnswer: country.country,
    choices: shuffle([country.country, ...pickDistractors(dataset, country, difficulty)]),
  };
}

export function generateQuestions(
  count: number,
  difficulty: Difficulty,
  continents: Continent[],
  collection: Collection
): Question[] {
  const dataset = collectionEntries(collection);
  // capitals difficulty comes from naming + distractors, not which states appear
  const pool =
    collection === "usCapitals"
      ? dataset
      : poolForDifficulty(dataset, difficulty, collection === "world" ? continents : []);
  const correctCountries = pickCorrectCountries(pool, count, difficulty);
  return correctCountries.map((c, i) => buildQuestion(dataset, c, difficulty, "q", i, collection));
}

/** Extra questions for sudden-death tie-breakers, excluding countries already used. */
export function generateTieBreakerQuestions(
  usedCountryIds: Set<string>,
  difficulty: Difficulty,
  continents: Continent[],
  collection: Collection,
  count: number
): Question[] {
  const dataset = collectionEntries(collection);
  const basePool =
    collection === "usCapitals"
      ? dataset
      : poolForDifficulty(dataset, difficulty, collection === "world" ? continents : []);
  const pool = basePool.filter((c) => !usedCountryIds.has(c.id));
  const source = pool.length >= count ? pool : basePool;
  const picked = pickCorrectCountries(source, count, difficulty);
  return picked.map((c, i) => buildQuestion(dataset, c, difficulty, "tb", i, collection));
}
