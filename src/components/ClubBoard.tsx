import { useEffect, useState } from "react";
import {
  FINAL_ROUND_INDEX,
  MAX_CLUB_PLAYERS,
  type ClubSnapshot,
} from "../logic/clubProtocol";
import { QrCode } from "./QrCode";
import {
  CLUB_CHOICE_LETTERS,
  ClubPlayerChips,
  ClubStandings,
  ClubTimer,
  ClubVisualView,
  IntroCountdown,
  TierBadge,
  tierAccent,
} from "./ClubBits";

// The shared screen IS the game board (§3). This component renders it from the
// server snapshot alone, so the host view and the read-only /display view can
// never drift apart — the host screen just adds its controls underneath.

interface Props {
  snapshot: ClubSnapshot;
  clockOffset: number;
  joinUrl: string;
}

/** Reveal is staged on the client so the answer lands with a beat (§18). */
function useRevealStage(snapshot: ClubSnapshot): 0 | 1 | 2 {
  const key = `${snapshot.status}:${snapshot.roundIndex}`;
  const [stage, setStage] = useState<0 | 1 | 2>(snapshot.status === "reveal" ? 0 : 2);

  useEffect(() => {
    if (snapshot.status !== "reveal") return;
    setStage(0);
    const a = window.setTimeout(() => setStage(1), 1400);
    const b = window.setTimeout(() => setStage(2), 3000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [key, snapshot.status]);

  return stage;
}

function Prompt({ text, small }: { text: string; small?: boolean }) {
  return (
    <p
      className={`mx-auto max-w-4xl whitespace-pre-line text-center font-bold leading-snug text-slate-100 ${
        small ? "text-base" : "text-xl md:text-3xl"
      }`}
    >
      {text}
    </p>
  );
}

export function ClubBoard({ snapshot, clockOffset, joinUrl }: Props) {
  const stage = useRevealStage(snapshot);
  const accent = tierAccent(snapshot.difficulty);
  const origin = window.location.origin.replace(/^https?:\/\//, "");
  const isFinalRound = snapshot.roundIndex === FINAL_ROUND_INDEX;
  const survival = snapshot.settings.mode === "survival";

  if (snapshot.status === "lobby") {
    const full = snapshot.players.length >= MAX_CLUB_PLAYERS;
    return (
      <>
        <div className="text-center animate-pop-in">
          <h1 className="text-3xl font-black md:text-5xl">
            <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-rose-300 bg-clip-text text-transparent">
              0.5% Club
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 md:text-base">
            Grab your phone — the questions only get harder.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
            <div className="rounded-2xl bg-white p-3 shadow-lg md:p-4">
              <QrCode value={joinUrl} size={168} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-400">
                📱 Scan to join · or enter the code
              </div>
              <div className="mt-1 text-lg font-bold text-slate-300 md:text-2xl">
                {origin}/join/{snapshot.roomCode}
              </div>
              <div className="text-7xl font-black tracking-[0.15em] text-sky-200 md:text-8xl">
                {snapshot.roomCode}
              </div>
            </div>
          </div>
        </div>

        {full ? (
          <p className="mx-auto rounded-xl border border-gold-400/50 bg-gold-500/10 px-4 py-2 font-black text-gold-400">
            ROOM FULL — {MAX_CLUB_PLAYERS} / {MAX_CLUB_PLAYERS} PLAYERS
          </p>
        ) : (
          <p className="text-center text-sm text-slate-400">
            {snapshot.players.length} / {MAX_CLUB_PLAYERS} players
          </p>
        )}

        {snapshot.players.length === 0 ? (
          <p className="mx-auto rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
            Waiting for players to join on their phones…
          </p>
        ) : (
          <ClubPlayerChips players={snapshot.players} />
        )}
      </>
    );
  }

  if (snapshot.status === "intro") {
    return (
      <div className="mx-auto my-auto w-full max-w-3xl space-y-5 text-center animate-pop-in">
        <h1 className="text-3xl font-black md:text-5xl">HOW TO PLAY</h1>
        <div className="space-y-3 text-lg text-slate-200 md:text-2xl">
          <p>You'll face 11 questions, and they get harder as the game goes on.</p>
          <p>Answer on your phone before time runs out.</p>
          {survival ? (
            <>
              <p>
                A wrong answer, a timeout, or running out of Passes means you can no longer win —
                but you still get to play every remaining question.
              </p>
              <p className="font-black text-sky-200">
                You have {snapshot.settings.passes}{" "}
                {snapshot.settings.passes === 1 ? "Pass" : "Passes"}.
              </p>
            </>
          ) : (
            <>
              <p>Nobody is eliminated. Pass as often as you like — a Pass just scores 0.</p>
              <p className="font-black text-sky-200">
                Every correct answer is 1 point. Most correct answers at the end wins.
              </p>
            </>
          )}
          <p>Make it through the final question to join the 0.5% Club.</p>
        </div>
        <div className="text-4xl font-black text-gold-400 md:text-6xl">READY?</div>
      </div>
    );
  }

  if (snapshot.status === "round_intro") {
    if (isFinalRound) {
      return (
        <div className="mx-auto my-auto space-y-6 text-center">
          <p className="text-2xl font-black text-slate-300 md:text-4xl animate-slide-up">
            YOU'VE MADE IT THIS FAR.
          </p>
          <p className="text-xl font-bold text-slate-400 md:text-3xl animate-slide-up">
            BUT CAN YOU JOIN…
          </p>
          <h1 className="text-6xl font-black winner-shimmer md:text-8xl">THE 0.5% CLUB?</h1>
          <IntroCountdown
            endsAt={snapshot.introEndsAt}
            clockOffset={clockOffset}
            className="text-gold-400"
          />
        </div>
      );
    }
    return (
      <div className="mx-auto my-auto space-y-4 text-center">
        <div className={`text-7xl font-black md:text-9xl ${accent.text} animate-pop-in`}>
          {snapshot.difficulty}%
        </div>
        <p className="text-lg text-slate-300 md:text-2xl">
          {snapshot.difficulty}% of players should be able to solve this.
        </p>
        <IntroCountdown endsAt={snapshot.introEndsAt} clockOffset={clockOffset} />
      </div>
    );
  }

  if (snapshot.status === "question" && snapshot.question) {
    const q = snapshot.question;
    const totalSeconds = Math.max(
      1,
      Math.round(((snapshot.questionEndsAt ?? 0) - (snapshot.questionStartedAt ?? 0)) / 1000)
    );
    return (
      <>
        <div className="text-center">
          <TierBadge tier={snapshot.difficulty} className="text-sm md:text-lg" />
        </div>
        <Prompt text={q.prompt} />

        {q.visual && (
          <ClubVisualView
            visual={q.visual}
            className="max-h-[38vh] w-full max-w-2xl [&>svg]:max-h-[38vh]"
          />
        )}

        {q.questionType === "multiple_choice" && q.choices && (
          <div className="mx-auto grid w-full max-w-3xl gap-2.5 md:grid-cols-2">
            {q.choices.map((choice, i) => (
              <div
                key={choice}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold md:px-5 md:py-3.5 md:text-xl"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black md:h-8 md:w-8">
                  {CLUB_CHOICE_LETTERS[i]}
                </span>
                {choice}
              </div>
            ))}
          </div>
        )}

        {q.questionType === "image_choice" && q.choiceVisuals && (
          <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-3">
            {q.choiceVisuals.map((visual, i) => (
              <div
                key={visual.assetId}
                className="rounded-2xl border border-white/15 bg-white/5 p-2 text-center"
              >
                <ClubVisualView visual={visual} className="max-h-32 [&>svg]:max-h-32" />
                <div className="mt-1 text-sm font-black text-slate-300">
                  {CLUB_CHOICE_LETTERS[i]}
                </div>
              </div>
            ))}
          </div>
        )}

        {q.questionType === "true_false" && (
          <div className="mx-auto flex w-full max-w-xl gap-3">
            {["TRUE", "FALSE"].map((label) => (
              <div
                key={label}
                className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-4 text-center text-2xl font-black"
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {(q.questionType === "text" || q.questionType === "number") && (
          <p className="text-center text-sm font-bold uppercase tracking-wider text-slate-400">
            {q.questionType === "number" ? "Type a number on your phone" : "Type your answer on your phone"}
          </p>
        )}

        <div className="mx-auto w-full max-w-2xl">
          <ClubTimer
            endsAt={snapshot.questionEndsAt}
            totalSeconds={totalSeconds}
            clockOffset={clockOffset}
            paused={snapshot.paused}
            big
          />
        </div>
        <p className="text-center text-lg font-black text-slate-300 md:text-2xl">
          {snapshot.answersLocked} / {snapshot.playersInPlay} answers locked
        </p>
      </>
    );
  }

  if (snapshot.status === "reveal") {
    const eliminatedHere = snapshot.players.filter((p) => p.lastResult?.eliminatedHere);
    const passed = snapshot.players.filter((p) => p.lastResult?.passed);
    const eligible = snapshot.players.filter((p) => p.winnerEligible);
    const forFun = snapshot.players.filter((p) => !p.winnerEligible);
    const wipeout = survival && eligible.length === 0 && eliminatedHere.length > 0;
    const clearedSemifinal =
      survival && snapshot.roundIndex === FINAL_ROUND_INDEX - 1 && eligible.length > 0;

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-5">
        {stage === 0 ? (
          <h1 className="text-center text-5xl font-black text-rose-300 animate-pop-in md:text-7xl">
            TIME'S UP
          </h1>
        ) : (
          <>
            <div className="text-center animate-pop-in">
              <div className="text-sm font-bold uppercase tracking-widest text-slate-400 md:text-base">
                The answer is…
              </div>
              <div className="mt-1 text-4xl font-black text-green-300 md:text-6xl">
                {snapshot.correctAnswer}
              </div>
            </div>

            {stage === 2 && (
              <>
                <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-slate-200 animate-slide-up md:text-xl">
                  💡 {snapshot.explanation}
                </p>

                {wipeout ? (
                  <div className="text-center animate-pop-in">
                    <div className="text-3xl font-black text-rose-300 md:text-5xl">
                      NOBODY CAN WIN THIS ONE 😭
                    </div>
                    <p className="mt-2 text-lg text-slate-300 md:text-xl">
                      But everybody keeps playing.
                    </p>
                  </div>
                ) : clearedSemifinal ? (
                  <div className="text-center text-2xl font-black text-gold-400 animate-pop-in md:text-4xl">
                    YOU MADE IT PAST THE 5% QUESTION
                  </div>
                ) : null}

                <div className="text-center text-sm text-slate-300 md:text-lg">
                  {survival ? (
                    <>
                      <span className="font-black text-sky-200">{eligible.length}</span> still
                      eligible to win · {forFun.length} playing for fun · {passed.length} used a Pass
                    </>
                  ) : (
                    <>
                      <span className="font-black text-sky-200">
                        {snapshot.players.filter((p) => p.lastResult?.correct).length}
                      </span>{" "}
                      got it · {passed.length} passed
                    </>
                  )}
                </div>

                {survival && eligible.length > 0 && (
                  <div>
                    <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                      Still eligible
                    </div>
                    <ClubPlayerChips players={eligible} />
                  </div>
                )}

                {!survival && (
                  <div className="mx-auto w-full max-w-xl">
                    <ClubStandings
                      players={snapshot.players}
                      winnerIds={[]}
                      showScores
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ended
  const winners = snapshot.players.filter((p) => (snapshot.winnerIds ?? []).includes(p.id));
  return (
    <div className="mx-auto my-auto w-full max-w-2xl">
      {survival ? (
        winners.length > 0 ? (
          <div className="text-center animate-pop-in">
            <div className="text-7xl">🏆</div>
            <h1 className="mt-2 text-4xl font-black winner-shimmer md:text-6xl">
              WELCOME TO THE 0.5% CLUB
            </h1>
            <div className="mt-5 space-y-2">
              {winners.map((p) => (
                <div key={p.id} className="text-3xl font-black text-gold-400 md:text-5xl">
                  🏆 {p.name}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center animate-pop-in">
            <div className="text-7xl">🚪</div>
            <h1 className="mt-2 text-3xl font-black text-rose-200 md:text-5xl">
              THE 0.5% CLUB REMAINS CLOSED
            </h1>
            <p className="mt-2 text-slate-300">Nobody joined the 0.5% Club this time.</p>
          </div>
        )
      ) : (
        <div className="text-center animate-pop-in">
          <div className="text-7xl">🏆</div>
          <h1 className="mt-2 text-4xl font-black winner-shimmer md:text-6xl">HIGH SCORE WINNER</h1>
        </div>
      )}

      <div className="mt-6">
        <ClubStandings
          players={snapshot.players}
          winnerIds={snapshot.winnerIds ?? []}
          showScores={!survival}
        />
      </div>
    </div>
  );
}
