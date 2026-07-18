import { useEffect, useState } from "react";
import type { Country, GameSettings, HintKey, Player, Question } from "../types";
import { AnswerGrid } from "../components/AnswerGrid";
import { FlagDisplay } from "../components/FlagDisplay";
import { HintPanel } from "../components/HintPanel";
import { LifelinePanel } from "../components/LifelinePanel";
import { PlayerScoreboard } from "../components/PlayerScoreboard";
import { ProgressBar } from "../components/ProgressBar";

interface Props {
  question: Question;
  country: Country;
  settings: GameSettings;
  players: Player[];
  activePlayer: Player;
  hintsRevealed: HintKey[];
  removedChoices: string[];
  crowdVotes: Record<string, number> | null;
  shownAt: number;
  questionLabel: string;
  questionNumber: number;
  totalQuestions: number;
  isTieBreaker: boolean;
  onRevealHint: (hint: HintKey) => void;
  onFiftyFifty: () => void;
  onAskCrowd: () => void;
  onLockIn: (choice: string) => void;
  onTimeUp: () => void;
}

export function QuestionScreen(props: Props) {
  const {
    question,
    country,
    settings,
    players,
    activePlayer,
    hintsRevealed,
    removedChoices,
    crowdVotes,
    shownAt,
    questionLabel,
    questionNumber,
    totalQuestions,
    isTieBreaker,
    onRevealHint,
    onFiftyFifty,
    onAskCrowd,
    onLockIn,
    onTimeUp,
  } = props;

  const [selected, setSelected] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const isTyped = settings.answerStyle === "typed";
  const pendingAnswer = isTyped ? (typedAnswer.trim() ? typedAnswer.trim() : null) : selected;
  const [remaining, setRemaining] = useState<number | null>(
    settings.timerSeconds ? settings.timerSeconds : null
  );

  useEffect(() => {
    if (!settings.timerSeconds) return;
    const tick = () => {
      const left = settings.timerSeconds! - (Date.now() - shownAt) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0) onTimeUp();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownAt, settings.timerSeconds]);

  const multi = players.length > 1;
  const timerUrgent = remaining !== null && remaining <= 5;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar
            current={questionNumber}
            total={totalQuestions}
            label={isTieBreaker ? `⚔️ ${questionLabel}` : undefined}
          />
        </div>
        {remaining !== null && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-base font-black tabular-nums ${
              timerUrgent
                ? "border-red-400 bg-red-500/20 text-red-300 animate-pulse"
                : "border-sky-400/50 bg-sky-500/10 text-sky-200"
            }`}
          >
            {Math.ceil(remaining)}
          </div>
        )}
      </div>

      <PlayerScoreboard players={players} activePlayerId={multi ? activePlayer.id : undefined} />

      {multi ? (
        <div
          className="rounded-lg py-1 text-center text-sm font-bold"
          style={{ backgroundColor: `${activePlayer.color}22`, color: activePlayer.color }}
        >
          {activePlayer.name},{" "}
          {question.prompt
            ? question.prompt.charAt(0).toLowerCase() + question.prompt.slice(1)
            : settings.collection === "usStates"
              ? "which state is this?"
              : "which country is this?"}
        </div>
      ) : (
        question.prompt && (
          <div className="rounded-lg bg-white/5 py-1 text-center text-sm font-bold text-slate-200">
            {question.prompt}
          </div>
        )
      )}

      <FlagDisplay
        src={question.flagImage}
        className="my-1"
        plain={question.kind === "capital"}
      />

      {isTyped ? (
        <input
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pendingAnswer) onLockIn(pendingAnswer);
          }}
          placeholder={settings.collection === "usStates" ? "Type the state…" : "Type the country…"}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-white/20 bg-navy-800/80 px-5 py-3.5 text-center text-lg font-bold text-white placeholder-slate-500 outline-none focus:border-sky-400"
        />
      ) : (
        <AnswerGrid
          choices={question.choices}
          selected={selected}
          removedChoices={removedChoices}
          reveal={null}
          onSelect={setSelected}
        />
      )}

      <button
        onClick={() => pendingAnswer && onLockIn(pendingAnswer)}
        disabled={!pendingAnswer}
        className={`w-full rounded-2xl px-6 py-3.5 text-lg font-bold transition active:scale-95 ${
          pendingAnswer
            ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/25"
            : "bg-white/10 text-slate-500"
        }`}
      >
        {pendingAnswer ? "🔒 Lock It In!" : isTyped ? "Type your answer…" : "Pick an answer…"}
      </button>

      {settings.hintsEnabled && !isTieBreaker && (
        <HintPanel
          country={country}
          revealed={hintsRevealed}
          isLearningMode={settings.mode === "learning"}
          skipHints={settings.collection === "usStates" ? ["continent"] : []}
          onReveal={onRevealHint}
        />
      )}

      {settings.lifelinesEnabled && !isTyped && !isTieBreaker && (
        <LifelinePanel
          player={activePlayer}
          crowdVotes={crowdVotes}
          fiftyFiftyActive={removedChoices.length > 0}
          onFiftyFifty={onFiftyFifty}
          onAskCrowd={onAskCrowd}
        />
      )}
    </div>
  );
}
