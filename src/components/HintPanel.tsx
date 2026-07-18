import type { Country, HintKey } from "../types";
import { pointsAfterHints } from "../logic/scoring";

interface Props {
  country: Country;
  revealed: HintKey[];
  isLearningMode: boolean;
  /** Hints to omit (e.g. continent is meaningless for US states). */
  skipHints?: HintKey[];
  onReveal: (hint: HintKey) => void;
}

/** Mask the country's own name so hints don't spoil the answer. */
function mask(text: string, countryName: string): string {
  const safe = countryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`${safe}'s`, "gi"), "this country's")
    .replace(new RegExp(safe, "gi"), "this country");
}

function geographyHint(c: Country): string {
  const parts: string[] = [`Capital: ${c.capital}.`];
  if (c.landlocked) parts.push("It is landlocked.");
  if (c.neighbors.length > 0) {
    parts.push(`Borders: ${c.neighbors.slice(0, 4).join(", ")}.`);
  } else {
    parts.push("It has no land borders.");
  }
  return parts.join(" ");
}

const HINTS: { key: HintKey; label: string; text: (c: Country) => string }[] = [
  { key: "continent", label: "Continent", text: (c) => c.continent },
  { key: "region", label: "Region", text: (c) => c.region },
  { key: "geography", label: "Geography", text: geographyHint },
  { key: "flagFact", label: "Flag Fact", text: (c) => c.flagFact },
  { key: "funFact", label: "Fun Fact", text: (c) => c.funFacts[0] },
];

export function HintPanel({ country, revealed, isLearningMode, skipHints = [], onReveal }: Props) {
  const available = pointsAfterHints(revealed.length);
  const hints = HINTS.filter((h) => !skipHints.includes(h.key));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
          💡 Hints
        </span>
        {isLearningMode && (
          <span className="text-xs font-semibold text-slate-300">
            Worth <span className="font-bold text-gold-400">{available}</span> pts
            {revealed.length > 0 && (
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
            const hint = HINTS.find((h) => h.key === key)!;
            return (
              <li key={key} className="text-sm text-slate-200 animate-slide-up">
                <span className="font-bold text-violet-300">{hint.label}: </span>
                {mask(hint.text(country), country.country)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
