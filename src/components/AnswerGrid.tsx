interface RevealInfo {
  correctAnswer: string;
  /** map of choice -> player names who picked it (reveal screen) */
  picks?: Record<string, string[]>;
}

interface Props {
  choices: string[];
  selected: string | null;
  removedChoices: string[];
  reveal: RevealInfo | null;
  disabled?: boolean;
  onSelect?: (choice: string) => void;
}

const LETTERS = ["A", "B", "C", "D"];

export function AnswerGrid({ choices, selected, removedChoices, reveal, disabled, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {choices.map((choice, i) => {
        const removed = removedChoices.includes(choice);
        const isSelected = selected === choice;
        const isCorrect = reveal?.correctAnswer === choice;
        const isWrongPick = reveal && !isCorrect && !!reveal.picks?.[choice]?.length;

        let cls =
          "relative flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base font-semibold transition-all duration-150 ";
        if (reveal) {
          if (isCorrect)
            cls += "border-green-400 bg-green-500/25 text-green-100 animate-flash-correct";
          else if (isWrongPick) cls += "border-red-400 bg-red-500/20 text-red-200";
          else cls += "border-white/10 bg-white/5 text-slate-400";
        } else if (removed) {
          cls += "border-white/5 bg-white/[0.02] text-slate-600 line-through";
        } else if (isSelected) {
          cls += "border-sky-300 bg-sky-500/30 text-white ring-2 ring-sky-300/60 scale-[1.02]";
        } else {
          cls +=
            "border-white/15 bg-navy-800/80 text-slate-100 active:scale-[0.98] hover:border-sky-400/60 hover:bg-navy-700/80";
        }

        return (
          <button
            key={choice}
            className={cls}
            disabled={disabled || removed || !!reveal}
            onClick={() => onSelect?.(choice)}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isSelected && !reveal ? "bg-sky-300 text-navy-950" : "bg-white/10 text-slate-300"
              } ${reveal && isCorrect ? "bg-green-400 text-navy-950" : ""}`}
            >
              {LETTERS[i]}
            </span>
            <span className="flex-1">{choice}</span>
            {reveal?.picks?.[choice]?.map((name) => (
              <span
                key={name}
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isCorrect ? "bg-green-400 text-navy-950" : "bg-red-400 text-navy-950"
                }`}
              >
                {name} {isCorrect ? "✓" : "✗"}
              </span>
            ))}
            {reveal && isCorrect && !reveal.picks?.[choice]?.length && (
              <span className="text-lg text-green-300">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
