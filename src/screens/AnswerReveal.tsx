import type { Country, Player, Question } from "../types";
import { AnswerGrid } from "../components/AnswerGrid";
import { FlagDisplay } from "../components/FlagDisplay";
import { PlayerScoreboard } from "../components/PlayerScoreboard";

interface Props {
  question: Question;
  country: Country;
  players: Player[]; // players who answered this round
  allPlayers: Player[];
  answerKey: string;
  isTyped: boolean;
  isLastQuestion: boolean;
  isTieBreaker: boolean;
  onNext: () => void;
}

export function AnswerReveal({
  question,
  country,
  players,
  allPlayers,
  answerKey,
  isTyped,
  isLastQuestion,
  isTieBreaker,
  onNext,
}: Props) {
  const picks: Record<string, string[]> = {};
  for (const p of players) {
    const a = p.answers[answerKey];
    if (a?.choice) (picks[a.choice] ??= []).push(p.name);
  }
  const single = allPlayers.length === 1;
  const singleAnswer = single ? allPlayers[0].answers[answerKey] : null;
  const isCapital = question.kind === "capital";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 py-4">
      <div className="text-center animate-pop-in">
        {single ? (
          <h2 className={`text-2xl font-black ${singleAnswer?.correct ? "text-green-300" : "text-red-300"}`}>
            {singleAnswer?.correct
              ? `✅ Correct! +${singleAnswer.pointsEarned}`
              : singleAnswer?.choice
                ? "❌ Not quite!"
                : "⏰ Time's up!"}
          </h2>
        ) : (
          <h2 className="text-2xl font-black">The answer is…</h2>
        )}
        {isCapital ? (
          <p className="mt-1 text-xl font-black text-sky-200">
            {question.correctAnswer}
            <span className="ml-2 text-sm font-semibold text-slate-400">
              capital of {country.country}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-xl font-black text-sky-200">
            {country.country}
            <span className="ml-2 text-sm font-semibold text-slate-400">({country.officialName})</span>
          </p>
        )}
      </div>

      <FlagDisplay src={question.flagImage} plain={question.silhouette ?? false} />

      {isTyped ? (
        single && singleAnswer && !singleAnswer.correct && singleAnswer.choice ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-center text-sm">
            You wrote: <span className="font-bold text-red-200">{singleAnswer.choice}</span>
          </div>
        ) : null
      ) : (
        <AnswerGrid
          choices={question.choices}
          selected={null}
          removedChoices={[]}
          reveal={{ correctAnswer: question.correctAnswer, picks }}
        />
      )}

      {!single && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
          {players.map((p) => {
            const a = p.answers[answerKey];
            return (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
                <span className={a?.correct ? "font-bold text-green-300" : "font-bold text-red-300"}>
                  {a?.correct
                    ? `+${a.pointsEarned} pts ✓`
                    : a?.choice
                      ? isTyped
                        ? `"${a.choice}" ✗`
                        : "wrong ✗"
                      : "no answer ⏰"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-sm text-slate-200 animate-slide-up">
        {isCapital ? (
          <>
            <span className="font-bold text-violet-300">💡 Fun fact: </span>
            {country.funFacts[0] ?? country.flagFact}
          </>
        ) : (
          <>
            <span className="font-bold text-violet-300">🚩 Flag fact: </span>
            {country.flagFact}
          </>
        )}
      </div>

      <PlayerScoreboard players={allPlayers} />

      <button
        onClick={onNext}
        className="mt-auto w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
      >
        {isTieBreaker || isLastQuestion ? "See What's Next →" : "Next Question →"}
      </button>
    </div>
  );
}
