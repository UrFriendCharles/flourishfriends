import type { Country, HintKey } from "../types";
import { greetingFor } from "../data/greetings";
import { capitalHintText, countryFacts, postalCode, stateFacts } from "../data/placeFacts";
import { pointsAfterHints } from "../logic/scoring";

interface Props {
  country: Country;
  revealed: HintKey[];
  isLearningMode: boolean;
  onReveal: (hint: HintKey) => void;
}

/**
 * Mask the country's own name so hints don't spoil the answer. Whole words
 * only, so a language like "Mongolian" stays readable instead of being mangled.
 */
function mask(text: string, place: Country): string {
  const safe = place.country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const noun = place.id.startsWith("state-") ? "this state" : "this country";
  return text
    .replace(new RegExp(`\\b${safe}'s\\b`, "gi"), `${noun}'s`)
    .replace(new RegExp(`\\b${safe}\\b`, "gi"), noun);
}

type HintDef = { key: HintKey; label: string; text: (c: Country) => string };

/** Guess the Flag / Guess the Country. */
const COUNTRY_HINTS: HintDef[] = [
  { key: "hello", label: "👋 Say Hello", text: (c) => `"${greetingFor(c.id) ?? "Hello"}"` },
  { key: "capital", label: "🏛️ Capital", text: capitalHintText },
  { key: "language", label: "🗣️ Language", text: (c) => c.languages.join(", ") },
  { key: "continent", label: "🌍 Continent", text: (c) => c.continent },
  { key: "currency", label: "💰 Money", text: (c) => countryFacts(c.id)?.currency ?? "—" },
  { key: "founded", label: "📅 Founded", text: (c) => countryFacts(c.id)?.founded ?? "—" },
];

/** US state flags: hello/language/continent are the same for every state. */
const STATE_HINTS: HintDef[] = [
  { key: "nickname", label: "🏷️ Nickname", text: (c) => `"${stateFacts(c.id)?.nickname ?? "—"}"` },
  { key: "region", label: "🗺️ Region", text: (c) => c.region },
  { key: "capital", label: "🏛️ Capital", text: capitalHintText },
  { key: "postal", label: "📮 Postal Code", text: (c) => postalCode(c.countryCode) },
];

export function HintPanel({ country, revealed, isLearningMode, onReveal }: Props) {
  const available = pointsAfterHints(revealed.length);
  const hints = country.id.startsWith("state-") ? STATE_HINTS : COUNTRY_HINTS;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
          💡 Hints
        </span>
        {isLearningMode && (
          <span className="text-xs font-semibold text-slate-300">
            Worth <span className="font-bold text-gold-400">{available}</span> pts
            {revealed.length > 0 && revealed.length < hints.length && (
              <span className="text-slate-500"> (next hint: {pointsAfterHints(revealed.length + 1)})</span>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hints.map((h) =>
          revealed.includes(h.key) ? null : (
            <button
              key={h.key}
              onClick={() => onReveal(h.key)}
              className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200 active:scale-95"
            >
              {h.label}
            </button>
          )
        )}
      </div>
      {revealed.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {revealed.map((key) => {
            const hint = hints.find((h) => h.key === key);
            if (!hint) return null;
            return (
              <li key={key} className="text-sm text-slate-200 animate-slide-up">
                <span className="font-bold text-violet-300">{hint.label}: </span>
                {mask(hint.text(country), country)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
