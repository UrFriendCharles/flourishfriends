import { useEffect, useReducer, useState } from "react";
import { FINAL_ROUND_INDEX, type ClubSettings, type ClubQuestionView } from "../logic/clubProtocol";
import {
  clubSoloReducer,
  initialSoloState,
  soloCanPass,
  soloJoinedClub,
  soloQuestion,
  soloQuestionSeconds,
  soloReachedTier,
  type ClubSoloState,
} from "../logic/clubSolo";
import { rememberPlayedQuestions, selectClubQuestions } from "../logic/clubSelect";
import { ClubAnswerPad } from "../components/ClubAnswerPad";
import { ClubTimer, ClubVisualView, TierBadge, tierAccent } from "../components/ClubBits";

interface Props {
  settings: ClubSettings;
  onHome: () => void;
}

// 0.5% Club on one device: no room, no phones, no backend. Same ladder, same
// rules, same explanations — just you against the eleven questions.

/** The question shape the shared answer pad expects. */
function asView(state: ClubSoloState): ClubQuestionView | null {
  const q = soloQuestion(state);
  if (!q) return null;
  return {
    id: q.id,
    difficulty: q.difficulty,
    questionType: q.questionType,
    prompt: q.prompt,
    choices: q.choices,
    choiceVisuals: q.choiceVisuals,
    visual: q.visual ?? null,
  };
}

export function ClubSolo({ settings, onHome }: Props) {
  const [state, dispatch] = useReducer(clubSoloReducer, undefined, () =>
    initialSoloState(settings, selectClubQuestions())
  );
  const [draft, setDraft] = useState("");
  const [confirmPass, setConfirmPass] = useState(false);
  const [introLeft, setIntroLeft] = useState(0);

  const question = soloQuestion(state);
  const view = asView(state);
  const accent = tierAccent(question?.difficulty ?? null);
  const isFinal = state.roundIndex === FINAL_ROUND_INDEX;
  const survival = state.settings.mode === "survival";
  const lastResult = state.results[state.results.length - 1] ?? null;

  useEffect(() => {
    rememberPlayedQuestions(state.questions.map((q) => q.id));
    // only when the ladder itself changes (first mount and Play Again)
  }, [state.questions]);

  // fresh input each round
  useEffect(() => {
    setDraft("");
    setConfirmPass(false);
  }, [state.roundIndex, state.phase]);

  // the round intro counts itself down, then hands over to the question
  useEffect(() => {
    if (state.phase !== "round_intro" || state.phaseEndsAt === null) return;
    const tick = () => {
      const left = Math.max(0, (state.phaseEndsAt ?? 0) - Date.now());
      setIntroLeft(left);
      if (left === 0) dispatch({ type: "SHOW_QUESTION", now: Date.now() });
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [state.phase, state.phaseEndsAt]);

  // time's up — the round settles itself, exactly as the server would
  useEffect(() => {
    if (state.phase !== "question" || state.phaseEndsAt === null) return;
    const id = window.setTimeout(
      () => dispatch({ type: "TIME_UP", now: Date.now() }),
      Math.max(0, state.phaseEndsAt - Date.now())
    );
    return () => window.clearTimeout(id);
  }, [state.phase, state.phaseEndsAt]);

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3.5 px-5 py-5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>🧠 0.5% CLUB · SOLO</span>
        <button onClick={onHome} className="font-bold text-slate-400">
          Quit
        </button>
      </div>
      {children}
    </div>
  );

  if (state.phase === "intro") {
    return shell(
      <div className="my-auto space-y-5 text-center animate-pop-in">
        <div className="text-6xl">🧠</div>
        <h1 className="text-3xl font-black">Eleven questions.</h1>
        <div className="space-y-2 text-slate-300">
          <p>They start easy and end at the 0.5% question.</p>
          {survival ? (
            <>
              <p>
                Get one wrong — or run out of time — and you're out of the running, but you'll still
                play every remaining question.
              </p>
              <p className="font-black text-sky-200">
                You have {state.passesRemaining} {state.passesRemaining === 1 ? "Pass" : "Passes"}.
              </p>
            </>
          ) : (
            <p>Nothing knocks you out. 1 point per correct answer — see how high you can get.</p>
          )}
          <p className="text-sm text-slate-400">
            {state.settings.timerSeconds} seconds a question, unless a puzzle says otherwise.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: "BEGIN", now: Date.now() })}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-black shadow-lg shadow-sky-500/25 transition active:scale-95"
        >
          ▶️ Start
        </button>
      </div>
    );
  }

  if (state.phase === "round_intro") {
    const seconds = Math.ceil(introLeft / 1000);
    return shell(
      <button
        onClick={() => dispatch({ type: "SHOW_QUESTION", now: Date.now() })}
        className="my-auto w-full text-center"
      >
        {isFinal ? (
          <>
            <p className="text-lg font-bold text-slate-400 animate-slide-up">BUT CAN YOU JOIN…</p>
            <h1 className="mt-2 text-4xl font-black winner-shimmer">THE 0.5% CLUB?</h1>
          </>
        ) : (
          <>
            <div className={`text-7xl font-black animate-pop-in ${accent.text}`}>
              {question?.difficulty}%
            </div>
            <p className="mt-2 text-slate-300">
              {question?.difficulty}% of players should be able to solve this.
            </p>
          </>
        )}
        {seconds > 0 && seconds <= 3 && (
          <div key={seconds} className="mt-4 text-6xl font-black animate-pop-in">
            {seconds}
          </div>
        )}
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
          Tap to skip
        </p>
      </button>
    );
  }

  if (state.phase === "question" && view) {
    return shell(
      <>
        <div className="flex items-center justify-between gap-3">
          <TierBadge tier={view.difficulty} className="text-xs" />
          <div className="w-28">
            <ClubTimer
              endsAt={state.phaseEndsAt}
              totalSeconds={soloQuestionSeconds(state)}
              clockOffset={0}
              paused={false}
            />
          </div>
        </div>

        {survival && !state.winnerEligible && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-amber-200">
            🎈 Playing for fun — the Club is out of reach this run
          </div>
        )}

        <p className="whitespace-pre-line text-center text-base font-bold leading-snug text-slate-100">
          {view.prompt}
        </p>

        {view.visual && <ClubVisualView visual={view.visual} className="max-h-52 [&>svg]:max-h-52" />}

        <ClubAnswerPad question={view} draft={draft} onDraft={setDraft} disabled={false} />

        <div className="mt-auto flex flex-col gap-2.5 pt-3">
          <button
            onClick={() =>
              draft.trim() && dispatch({ type: "LOCK", answer: draft.trim(), now: Date.now() })
            }
            disabled={!draft.trim()}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-black shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-40"
          >
            🔒 LOCK ANSWER
          </button>

          {soloCanPass(state) &&
            (confirmPass ? (
              <button
                onClick={() => dispatch({ type: "PASS", now: Date.now() })}
                className="w-full rounded-2xl border border-amber-400/60 bg-amber-500/20 px-6 py-3.5 font-black text-amber-100 transition active:scale-95"
              >
                🛟 USE PASS — this can't be undone
              </button>
            ) : (
              <button
                onClick={() => setConfirmPass(true)}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-slate-300 transition active:scale-95"
              >
                🛟 PASS {survival ? `×${state.passesRemaining}` : "(unlimited)"}
              </button>
            ))}

          {isFinal && (
            <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-500">
              No Pass on the 0.5% question
            </p>
          )}
        </div>
      </>
    );
  }

  if (state.phase === "reveal" && question && lastResult) {
    const tone = lastResult.passed
      ? { icon: "🛟", label: "PASS USED", color: "text-amber-200", border: "border-amber-400/40" }
      : lastResult.correct
        ? { icon: "✅", label: "CORRECT", color: "text-green-300", border: "border-green-400/40" }
        : {
            icon: "❌",
            label: lastResult.timedOut ? "OUT OF TIME" : "WRONG",
            color: "text-rose-300",
            border: "border-rose-400/40",
          };
    const inContention = !survival || state.winnerEligible;
    const subline = lastResult.passed
      ? inContention
        ? "You're still in."
        : "Keep playing."
      : lastResult.correct
        ? !survival
          ? "+1 point."
          : inContention
            ? "You're still in."
            : "Right answer — the Club's still out of reach this run."
        : survival
          ? lastResult.eliminatedHere
            ? "That's the Club gone — but keep playing."
            : "Keep playing."
          : "No point this round. Keep going.";

    return shell(
      <>
        <div
          className={`rounded-2xl border ${tone.border} bg-white/5 px-4 py-5 text-center animate-pop-in`}
        >
          <div className="text-5xl">{tone.icon}</div>
          <div className={`mt-1 text-2xl font-black ${tone.color}`}>{tone.label}</div>
          <p className="mt-1 text-sm text-slate-300">{subline}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            The answer is
          </div>
          <div className="text-xl font-black text-green-300">{question.correctAnswer}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">💡 {question.explanation}</p>
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <p className="text-center text-xs text-slate-400">
            {state.correctCount} correct so far · {state.roundIndex + 1} of {state.questions.length}
          </p>
          <button
            onClick={() => dispatch({ type: "NEXT", now: Date.now() })}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-black transition active:scale-95"
          >
            {isFinal ? "🏁 See how you did" : "➡️ Next question"}
          </button>
        </div>
      </>
    );
  }

  // ended
  const joined = soloJoinedClub(state);
  const stumbledAt = soloReachedTier(state);
  return shell(
    <>
      <div className="text-center animate-pop-in">
        <div className="text-7xl">{joined ? "🏆" : survival ? "🎈" : "🏁"}</div>
        <h1 className="mt-2 text-3xl font-black">
          {joined ? (
            <span className="winner-shimmer">WELCOME TO THE 0.5% CLUB</span>
          ) : survival ? (
            "The Club stays shut this time"
          ) : (
            "Run complete"
          )}
        </h1>
        <p className="mt-2 text-slate-300">
          {state.correctCount} of {state.questions.length} correct
          {survival && stumbledAt !== null && ` · the ${stumbledAt}% question got you`}
        </p>
      </div>

      <div className="space-y-1.5">
        {state.results.map((r) => (
          <div
            key={r.questionId}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className={`w-14 text-sm font-black ${tierAccent(r.difficulty).text}`}>
              {r.difficulty}%
            </span>
            <span className="flex-1 truncate text-xs text-slate-400">
              {r.passed ? "Passed" : (r.answer ?? "No answer")}
            </span>
            <span>{r.passed ? "🛟" : r.correct ? "✅" : "❌"}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-3">
        <button
          onClick={() =>
            dispatch({ type: "RESTART", questions: selectClubQuestions(), now: Date.now() })
          }
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-black transition active:scale-95"
        >
          🔁 New eleven
        </button>
        <button
          onClick={onHome}
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
        >
          🏠 Home
        </button>
      </div>
    </>
  );
}
