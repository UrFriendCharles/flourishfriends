import type { Collection, Country } from "../types";
import { easyCountries } from "./easy";
import { mediumCountries } from "./medium";
import { hardCountries } from "./hard";
import { europeExpansion } from "./europe2";
import { asiaExpansion } from "./asia2";
import { africaExpansion } from "./africa2";
import { americasExpansion } from "./americas2";
import { oceaniaExpansion } from "./oceania2";
import { usStates1 } from "./usStates1";
import { usStates2 } from "./usStates2";

export const countries: Country[] = [
  ...easyCountries,
  ...mediumCountries,
  ...hardCountries,
  ...europeExpansion,
  ...asiaExpansion,
  ...africaExpansion,
  ...americasExpansion,
  ...oceaniaExpansion,
];

export const usStates: Country[] = [...usStates1, ...usStates2];

/** Every quizzable flag entry across all packs. */
export const allEntries: Country[] = [...countries, ...usStates];

export function collectionEntries(collection: Collection): Country[] {
  // usCapitals quizzes the same 50 states, just on capitals instead of flags
  return collection === "world" ? countries : usStates;
}

// id is globally unique across packs; name is NOT (Georgia the country vs the
// state), so name lookups must stay within one pack via collectionEntries.
export const countryById = new Map(allEntries.map((c) => [c.id, c]));

export function flagUrl(country: Country): string {
  return `${import.meta.env.BASE_URL}flags/${country.countryCode}.svg`;
}

/** State silhouette (us-ga -> /states/ga.svg), for the capitals pack. */
export function stateShapeUrl(state: Country): string {
  return `${import.meta.env.BASE_URL}states/${state.countryCode.replace(/^us-/, "")}.svg`;
}
