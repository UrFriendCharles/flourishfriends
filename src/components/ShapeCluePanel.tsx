import type { Country, HintKey } from "../types";
import { flagUrl } from "../data/countries";
import { pointsAfterHints } from "../logic/scoring";

interface Props {
  country: Country;
  revealed: HintKey[];
  /** learning mode shows the live point value; classic just reveals clues */
  showPoints: boolean;
  onReveal: (hint: HintKey) => void;
}

function mask(text: string, countryName: string): string {
  const safe = countryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`${safe}'s`, "gi"), "this country's")
    .replace(new RegExp(safe, "gi"), "this country");
}

/**
 * Progressive clues for the Guess the Country pack: reveal the flag, then a
 * fact, each one lowering the points (reuses learning-mode decay). Players who
 * know it from the outline alone keep the full value.
 */
export function ShapeCluePanel({ country, revealed, showPoints, onReveal }: Props) {
  const flagShown = revealed.includes("flag");
  const factShown = revealed.includes("funFact");
  const available = pointsAfterHints(revealed.length);
  const fact = country.funFacts[0] ?? country.flagFact;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">🔍 Clues</span>
        {showPoints && (
          <span className="text-xs font-semibold text-slate-300">
            Worth <span className="font-bold text-gold-400">{available}</span> pts
            {revealed.length < 2 && (
              <span className="text-slate-500">
                {" "}
                (next clue: {pointsAfterHints(revealed.length + 1)})
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!flagShown && (
          <button
            onClick={() => onReveal("flag")}
            className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200 active:scale-95"
          >
            🏴 Reveal Flag
          </button>
        )}
        {!factShown && (
          <button
            onClick={() => onReveal("funFact")}
            className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200 active:scale-95"
          >
            💡 Reveal Fact
          </button>
        )}
        {flagShown && factShown && (
          <span className="text-xs font-semibold text-slate-500">All clues revealed</span>
        )}
      </div>

      {flagShown && (
        <div className="mt-2 flex items-center gap-2 animate-slide-up">
          <img
            src={flagUrl(country)}
            alt="Flag clue"
            className="h-10 w-auto rounded border border-white/20 shadow"
          />
          <span className="text-xs text-slate-400">Its flag</span>
        </div>
      )}
      {factShown && (
        <p className="mt-2 text-sm text-slate-200 animate-slide-up">
          <span className="font-bold text-violet-300">💡 Fact: </span>
          {mask(fact, country.country)}
        </p>
      )}
    </div>
  );
}
