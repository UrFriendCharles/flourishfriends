import type { ClubQuestionView } from "../logic/clubProtocol";
import { CLUB_CHOICE_LETTERS, ClubVisualView } from "./ClubBits";

// Every V1 answer interface (§13), on the phone. The pad only manages the
// *draft* answer — nothing is final until the player taps LOCK ANSWER, and the
// server is what actually decides correctness.

interface Props {
  question: ClubQuestionView;
  draft: string;
  onDraft: (value: string) => void;
  disabled: boolean;
}

const choiceButton = (selected: boolean) =>
  `flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-lg font-bold transition active:scale-95 disabled:opacity-60 ${
    selected ? "border-sky-300 bg-sky-500/25" : "border-white/15 bg-white/5"
  }`;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function ClubAnswerPad({ question, draft, onDraft, disabled }: Props) {
  switch (question.questionType) {
    case "multiple_choice":
      return (
        <div className="grid gap-2.5">
          {(question.choices ?? []).map((choice, i) => (
            <button
              key={choice}
              disabled={disabled}
              onClick={() => onDraft(choice)}
              className={choiceButton(draft === choice)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black">
                {CLUB_CHOICE_LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1">{choice}</span>
            </button>
          ))}
        </div>
      );

    case "visual_multiple_choice":
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {(question.choices ?? []).map((choice) => (
            <button
              key={choice}
              disabled={disabled}
              onClick={() => onDraft(choice)}
              className={`rounded-2xl border py-6 text-3xl font-black transition active:scale-95 disabled:opacity-60 ${
                draft === choice ? "border-sky-300 bg-sky-500/25" : "border-white/15 bg-white/5"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      );

    case "image_choice":
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {(question.choices ?? []).map((choice, i) => (
            <button
              key={choice}
              disabled={disabled}
              onClick={() => onDraft(choice)}
              className={`rounded-2xl border p-3 transition active:scale-95 disabled:opacity-60 ${
                draft === choice ? "border-sky-300 bg-sky-500/25" : "border-white/15 bg-white/5"
              }`}
            >
              <ClubVisualView
                visual={question.choiceVisuals?.[i]}
                className="max-h-28 [&>svg]:max-h-28"
              />
              <div className="mt-1 text-center text-sm font-black text-slate-300">
                {CLUB_CHOICE_LETTERS[i]}
              </div>
            </button>
          ))}
        </div>
      );

    case "true_false":
      return (
        <div className="flex gap-3">
          {["true", "false"].map((value) => (
            <button
              key={value}
              disabled={disabled}
              onClick={() => onDraft(value)}
              className={`flex-1 rounded-2xl border py-8 text-2xl font-black uppercase transition active:scale-95 disabled:opacity-60 ${
                draft === value ? "border-sky-300 bg-sky-500/25" : "border-white/15 bg-white/5"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      );

    case "number":
      return (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-4xl font-black tabular-nums">
            {draft || <span className="text-slate-500">—</span>}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((key) => (
              <button
                key={key}
                disabled={disabled}
                onClick={() => {
                  if (key === "⌫") onDraft(draft.slice(0, -1));
                  else if (key === "." && draft.includes(".")) return;
                  else if (draft.length < 12) onDraft(draft + key);
                }}
                className="rounded-2xl border border-white/15 bg-white/5 py-4 text-2xl font-black transition active:scale-95 disabled:opacity-60"
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      );

    case "text":
    default:
      return (
        <input
          value={draft}
          disabled={disabled}
          onChange={(e) => onDraft(e.target.value.slice(0, 60))}
          placeholder="Type your answer"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-center text-2xl font-bold outline-none focus:border-sky-300 disabled:opacity-60"
        />
      );
  }
}
