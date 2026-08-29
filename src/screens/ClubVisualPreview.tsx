import { useState } from "react";
import { CLUB_QUESTIONS } from "../data/clubQuestions";
import { CLUB_VISUALS } from "../data/clubVisuals";
import { ClubVisualView, TierBadge } from "../components/ClubBits";

interface Props {
  onBack: () => void;
}

// /club/visuals — flip through every puzzle visual at TV size or phone size.
// A puzzle can look fine on a laptop and be unreadable from the sofa (§34),
// so this is the check before a question goes live.

const WITH_VISUALS = CLUB_QUESTIONS.filter((q) => q.visual || q.choiceVisuals);

export function ClubVisualPreview({ onBack }: Props) {
  const [phone, setPhone] = useState(false);
  const [index, setIndex] = useState(0);
  const q = WITH_VISUALS[index];

  const missing = [q?.visual, ...(q?.choiceVisuals ?? [])].filter(
    (v) => v && v.type === "svg" && !(v.assetId in CLUB_VISUALS)
  );

  if (!q) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <p className="font-bold">No questions in the bank carry a visual yet.</p>
        <button onClick={onBack} className="mt-4 text-sm font-bold text-slate-400">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-4 px-5 py-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-bold text-slate-400">
          ← Back
        </button>
        <h1 className="text-sm font-black md:text-lg">0.5% Club · visual check</h1>
        <button
          onClick={() => setPhone((p) => !p)}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-bold"
        >
          {phone ? "📺 TV size" : "📱 Phone size"}
        </button>
      </div>

      {missing.length > 0 && (
        <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">
          Missing asset: {missing.map((v) => v!.assetId).join(", ")}
        </p>
      )}

      <div className="flex items-center gap-3">
        <TierBadge tier={q.difficulty} className="text-xs" />
        <span className="text-xs text-slate-400">
          {q.id} · {q.questionType}
        </span>
      </div>
      <p className="whitespace-pre-line font-bold">{q.prompt}</p>

      <div
        className={`flex min-h-0 flex-1 flex-col justify-center ${
          phone ? "mx-auto w-full max-w-[380px] rounded-2xl border border-white/10 p-3" : ""
        }`}
      >
        {q.visual && (
          <ClubVisualView
            visual={q.visual}
            className={phone ? "max-h-52 [&>svg]:max-h-52" : "max-h-[50vh] [&>svg]:max-h-[50vh]"}
          />
        )}
        {q.choiceVisuals && (
          <div className="grid grid-cols-4 gap-3">
            {q.choiceVisuals.map((v, i) => (
              <div key={v.assetId} className="rounded-xl border border-white/10 p-2 text-center">
                <ClubVisualView visual={v} className="max-h-28 [&>svg]:max-h-28" />
                <div className="text-xs font-black text-slate-400">{q.choices?.[i]}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-sm text-slate-400">
        Answer: <span className="font-bold text-green-300">{q.correctAnswer}</span>
      </p>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setIndex((i) => (i - 1 + WITH_VISUALS.length) % WITH_VISUALS.length)}
          className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 font-bold"
        >
          ← Prev
        </button>
        <span className="text-sm font-bold tabular-nums text-slate-400">
          {index + 1} / {WITH_VISUALS.length}
        </span>
        <button
          onClick={() => setIndex((i) => (i + 1) % WITH_VISUALS.length)}
          className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 font-bold"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
