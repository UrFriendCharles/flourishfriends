import type { Collection, Continent, Country, Difficulty, Question } from "../types";
import { collectionEntries, countries, flagUrl, stateShapeUrl, usStates } from "../data/countries";
import { CAPITAL_TRAPS } from "../data/capitalTraps";

/** A single-pack question type (everything mode mixes these). */
type SubCollection = Exclude<Collection, "everything">;

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
 * Wrong answers for a capital question (state or country). Hard mode leads with
 * the place's own famous non-capital cities (Seattle for Washington…), then
 * nearby capitals; medium stays in-region; easy pulls far-away capitals.
 * CAPITAL_TRAPS only has entries for US states, so countries just fall through
 * to region/continent capitals.
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
    addNames(capitalsOf(dataset.filter((s) => s.continent === correct.continent)));
  } else if (difficulty === "medium") {
    addNames(capitalsOf(dataset.filter((s) => s.region === correct.region)));
    addNames(capitalsOf(dataset.filter((s) => s.continent === correct.continent)));
  } else {
    addNames(capitalsOf(dataset.filter((s) => s.region !== correct.region)));
  }
  addNames(capitalsOf(dataset));
  return chosen;
}

/**
 * Build one question. `sub` is the single-pack type. `mixed` is true inside
 * everything mode, where flag questions get an explicit prompt so players know
 * whether they're being asked for a country or a US state.
 */
function buildQuestion(
  dataset: Country[],
  country: Country,
  difficulty: Difficulty,
  idPrefix: string,
  i: number,
  sub: SubCollection,
  mixed: boolean
): Question {
  const id = `${idPrefix}-${i}-${country.id}`;
  const named = difficulty === "easy"; // easy names the place; harder hides it

  if (sub === "usCapitals") {
    return {
      id,
      countryId: country.id,
      flagImage: stateShapeUrl(country),
      correctAnswer: country.capital,
      choices: shuffle([country.capital, ...pickCapitalDistractors(dataset, country, difficulty)]),
      kind: "capital",
      silhouette: true,
      prompt: named
        ? `What's the capital of ${country.country}?`
        : "What's the capital of this state?",
    };
  }

  if (sub === "worldCapitals") {
    return {
      id,
      countryId: country.id,
      flagImage: flagUrl(country),
      correctAnswer: country.capital,
      choices: shuffle([country.capital, ...pickCapitalDistractors(dataset, country, difficulty)]),
      kind: "capital",
      prompt: named
        ? `What's the capital of ${country.country}?`
        : "What's the capital of this country?",
    };
  }

  // flag question (world or usStates)
  const isState = sub === "usStates";
  return {
    id,
    countryId: country.id,
    flagImage: flagUrl(country),
    correctAnswer: country.country,
    choices: shuffle([country.country, ...pickDistractors(dataset, country, difficulty)]),
    prompt: mixed
      ? isState
        ? "Which US state is this?"
        : "Which country is this?"
      : undefined,
  };
}

/**
 * Everything mode: draw questions from all four packs (world flags, state
 * flags, state capitals, world capitals). We avoid repeating a place until
 * every place has been used once, then allow the same place in a different
 * pack (e.g. France's flag and France's capital) to fill the count.
 */
function generateEverything(
  count: number,
  difficulty: Difficulty,
  exclude: Set<string> = new Set(),
  idPrefix = "q"
): Question[] {
  type Spec = { dataset: Country[]; country: Country; sub: SubCollection };
  const specs: Spec[] = [];
  const worldPool = poolForDifficulty(countries, difficulty, []);
  for (const c of worldPool) {
    if (exclude.has(c.id)) continue;
    specs.push({ dataset: countries, country: c, sub: "world" });
    specs.push({ dataset: countries, country: c, sub: "worldCapitals" });
  }
  for (const s of usStates) {
    if (exclude.has(s.id)) continue;
    specs.push({ dataset: usStates, country: s, sub: "usStates" });
    specs.push({ dataset: usStates, country: s, sub: "usCapitals" });
  }

  const shuffled = shuffle(specs);
  const picked: Spec[] = [];
  const usedCountry = new Set<string>();
  const usedKey = new Set<string>();
  const key = (s: Spec) => `${s.sub}:${s.country.id}`;
  // pass 1: unique place
  for (const s of shuffled) {
    if (picked.length >= count) break;
    if (usedCountry.has(s.country.id)) continue;
    usedCountry.add(s.country.id);
    usedKey.add(key(s));
    picked.push(s);
  }
  // pass 2: allow a place in a second pack to top up the count
  for (const s of shuffled) {
    if (picked.length >= count) break;
    if (usedKey.has(key(s))) continue;
    usedKey.add(key(s));
    picked.push(s);
  }

  return shuffle(picked).map((s, i) =>
    buildQuestion(s.dataset, s.country, difficulty, idPrefix, i, s.sub, true)
  );
}

export function generateQuestions(
  count: number,
  difficulty: Difficulty,
  continents: Continent[],
  collection: Collection
): Question[] {
  if (collection === "everything") return generateEverything(count, difficulty);
  const dataset = collectionEntries(collection);
  // capitals difficulty comes from naming + distractors, not which states appear
  const pool =
    collection === "usCapitals"
      ? dataset
      : poolForDifficulty(dataset, difficulty, collection === "world" ? continents : []);
  const correctCountries = pickCorrectCountries(pool, count, difficulty);
  return correctCountries.map((c, i) =>
    buildQuestion(dataset, c, difficulty, "q", i, collection, false)
  );
}

/** Extra questions for sudden-death tie-breakers, excluding countries already used. */
export function generateTieBreakerQuestions(
  usedCountryIds: Set<string>,
  difficulty: Difficulty,
  continents: Continent[],
  collection: Collection,
  count: number
): Question[] {
  if (collection === "everything") {
    return generateEverything(count, difficulty, usedCountryIds, "tb");
  }
  const dataset = collectionEntries(collection);
  const basePool =
    collection === "usCapitals"
      ? dataset
      : poolForDifficulty(dataset, difficulty, collection === "world" ? continents : []);
  const pool = basePool.filter((c) => !usedCountryIds.has(c.id));
  const source = pool.length >= count ? pool : basePool;
  const picked = pickCorrectCountries(source, count, difficulty);
  return picked.map((c, i) => buildQuestion(dataset, c, difficulty, "tb", i, collection, false));
}
