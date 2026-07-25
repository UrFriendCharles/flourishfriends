import { useEffect, useState } from "react";
import type { ScoreShare } from "../types";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { nextHintCost } from "../logic/scoring";
import { HINT_GUESS_BONUS } from "../logic/roomProtocol";
import { CHOICE_LETTERS, RoomFinalStandings, RoomLeaderboard, RoomTimerBar } from "../components/RoomBits";
import { ScoreShareWidget } from "../components/ScoreShareWidget";
import { newShareId, saveScoreShare } from "../storage/scoreShares";

interface Props {
  roomCode: string;
  playerName: string;
  onLeave: () => void;
}

const playerIdKey = (code: string) => `ffq:room:${code}:playerId`;

export function ControllerRoom({ roomCode, playerName, onLeave }: Props) {
  const { snapshot, you, connected, fatalError, clockOffset, send } = useRoomSocket(
    roomCode,
    () => ({
      type: "hello",
      role: "player",
      name: playerName,
      playerId: sessionStorage.getItem(playerIdKey(roomCode)) ?? undefined,
    })
  );
  const [share, setShare] = useState<ScoreShare | null>(null);

  // remember our server-assigned id so reloads/reconnects rejoin as us
  useEffect(() => {
    if (you?.playerId) sessionStorage.setItem(playerIdKey(roomCode), you.playerId);
  }, [you?.playerId, roomCode]);

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 py-6">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>ROOM {roomCode}</span>
        <span>{connected ? "🟢 Connected" : "🟡 Reconnecting…"}</span>
      </div>
      {children}
    </div>
  );

  if (fatalError) {
    return shell(
      <div className="my-auto space-y-4 text-center">
        <div className="text-5xl">🚪</div>
        <p className="font-bold">{fatalError}</p>
        <button
          onClick={onLeave}
          className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold transition active:scale-95"
        >
          🏠 Home
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return shell(<div className="my-auto text-center text-slate-400">Joining room…</div>);
  }

  const me = snapshot.players.find((p) => p.id === you?.playerId) ?? null;

  if (snapshot.status === "lobby") {
    return shell(
      <>
        <div className="text-center animate-pop-in">
          <div className="text-5xl">🙌</div>
          <h2 className="mt-2 text-2xl font-black">You're in{me ? `, ${me.name}` : ""}!</h2>
          <p className="mt-1 text-sm text-slate-400">Waiting for the host to start the game…</p>
        </div>
        <RoomLeaderboard players={snapshot.players} highlightId={me?.id} />
      </>
    );
  }

  if (snapshot.status === "question" && snapshot.question) {
    const locked = you?.choice ?? null;
    return shell(
      <>
        <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
          Question {snapshot.questionIndex + 1} of {snapshot.totalQuestions}
        </div>
        {snapshot.question.prompt && (
          <div className="rounded-lg bg-white/5 py-1 text-center text-sm font-bold text-slate-200">
            {snapshot.question.prompt}
          </div>
        )}
        <img
          src={snapshot.question.flagImage}
          alt={snapshot.question.silhouette ? "Mystery state" : "Mystery flag"}
          className={`mx-auto max-h-40 w-auto ${
            snapshot.question.silhouette
              ? "drop-shadow-lg"
              : "rounded-lg border border-white/15 shadow-lg"
          }`}
        />
        {snapshot.questionDeadline !== null && snapshot.settings.timerSeconds !== null && (
          <RoomTimerBar
            deadline={snapshot.questionDeadline}
            totalSeconds={snapshot.settings.timerSeconds}
            clockOffset={clockOffset}
          />
        )}
        {snapshot.settings.hintsEnabled && locked === null && (
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-2.5">
            {(you?.hints ?? []).length > 0 && (
              <ul className="mb-2 space-y-1">
                {(you?.hints ?? []).map((h, i) => (
                  <li key={i} className="text-sm text-violet-100 animate-slide-up">
                    💡 {h}
                  </li>
                ))}
              </ul>
            )}
            {(you?.hints ?? []).length < 3 ? (
              <button
                onClick={() => send({ type: "hint" })}
                className="w-full rounded-xl border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-sm font-bold text-violet-100 active:scale-95"
              >
                💡 Reveal a hint (−{nextHintCost((you?.hints ?? []).length)} pts)
              </button>
            ) : (
              <p className="text-center text-xs font-semibold text-slate-400">
                All 3 hints used (−30)
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2.5">
          {snapshot.question.choices.map((choice, i) => (
            <button
              key={choice}
              disabled={locked !== null}
              onClick={() => send({ type: "answer", choice })}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left font-bold transition active:scale-95 ${
                locked === choice
                  ? "border-sky-300 bg-sky-500/25"
                  : locked !== null
                    ? "border-white/10 bg-white/5 opacity-40"
                    : "border-white/15 bg-white/5"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black">
                {CHOICE_LETTERS[i]}
              </span>
              {choice}
            </button>
          ))}
        </div>
        {locked !== null && (
          <p className="text-center text-sm font-bold text-sky-200 animate-pop-in">
            🔒 Locked in — waiting for the others…
          </p>
        )}
      </>
    );
  }

  if (snapshot.status === "reveal") {
    const mine = me?.lastAnswer ?? null;
    return shell(
      <>
        <div className="text-center animate-pop-in">
          {mine?.correct ? (
            <>
              <div className="text-6xl">🎉</div>
              <h2 className="mt-2 text-3xl font-black text-green-300">Correct!</h2>
              <p className="mt-1 text-xl font-black text-sky-200">+{mine.pointsEarned}</p>
            </>
          ) : (
            <>
              <div className="text-6xl">{mine ? "😅" : "⏰"}</div>
              <h2 className="mt-2 text-2xl font-black">
                {mine ? "Not this time" : "Time's up!"}
              </h2>
              {mine && (
                <p className="mt-1 text-sm text-slate-400">
                  You picked <span className="font-bold text-rose-300">{mine.choice}</span>
                </p>
              )}
              <p className="mt-1 text-sm text-slate-300">
                It was <span className="font-black text-white">{snapshot.correctAnswer}</span>
              </p>
            </>
          )}
        </div>
        <RoomLeaderboard players={snapshot.players} highlightId={me?.id} />
        <p className="text-center text-xs text-slate-400">Waiting for the host…</p>
      </>
    );
  }

  if (snapshot.status === "guessing") {
    const iGuessed = me?.guessed ?? false;
    return shell(
      <>
        <div className="text-center animate-pop-in">
          <div className="text-5xl">🎲</div>
          <h2 className="mt-2 text-2xl font-black">Who used the most hints?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Guess the game's biggest hint-user for +{HINT_GUESS_BONUS} bonus points!
          </p>
        </div>
        {iGuessed ? (
          <p className="text-center text-sm font-bold text-sky-200 animate-pop-in">
            🔒 Guess locked — waiting for the others…
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {snapshot.players.map((p) => (
              <button
                key={p.id}
                onClick={() => send({ type: "guess", targetId: p.id })}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-left font-bold transition active:scale-95"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
                {p.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // ended
  const totalQ = snapshot.totalQuestions;
  const biggest = snapshot.biggestHintUserIds ?? [];
  const biggestNames = snapshot.players
    .filter((p) => biggest.includes(p.id))
    .map((p) => p.name)
    .join(", ");
  const maxHints = Math.max(0, ...snapshot.players.map((p) => p.totalHints ?? 0));
  const myGuessName = me?.guessId
    ? snapshot.players.find((p) => p.id === me.guessId)?.name ?? "?"
    : null;
  const shareScore = () => {
    if (!me) return;
    const s: ScoreShare = {
      shareId: newShareId(),
      playerName: me.name,
      score: me.score,
      accuracy: totalQ ? Math.round((me.correctCount / totalQ) * 100) : 0,
      bestStreak: me.bestStreak,
      totalQuestions: totalQ,
      correctAnswers: me.correctCount,
      difficulty: snapshot.settings.difficulty,
      mode: "classic",
      collection: snapshot.settings.collection,
      timerUsed: snapshot.settings.timerSeconds !== null,
      typed: false,
      createdAt: Date.now(),
    };
    setShare(s);
    void saveScoreShare(s);
  };

  return shell(
    <>
      <div className="text-center animate-pop-in">
        <div className="text-6xl">🏁</div>
        <h2 className="mt-2 text-3xl font-black">Game Over!</h2>
      </div>
      {biggest.length > 0 && (
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-sm animate-slide-up">
          <div className="font-bold text-violet-200">🎲 Hint-Guess Round</div>
          <p className="mt-1 text-slate-200">
            Biggest hint-user: <span className="font-bold text-white">{biggestNames}</span> ({maxHints}{" "}
            {maxHints === 1 ? "hint" : "hints"})
          </p>
          {myGuessName && (
            <p className="mt-1 text-slate-300">
              You guessed <span className="font-bold text-white">{myGuessName}</span> —{" "}
              {me?.guessCorrect ? (
                <span className="font-bold text-green-300">correct! +{HINT_GUESS_BONUS}</span>
              ) : (
                <span className="font-semibold text-rose-300">not quite</span>
              )}
            </p>
          )}
        </div>
      )}
      <RoomFinalStandings players={snapshot.players} highlightId={me?.id} />
      {me &&
        (share ? (
          <ScoreShareWidget share={share} />
        ) : (
          <button
            onClick={shareScore}
            className="w-full rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2.5 text-sm font-bold text-sky-200 transition active:scale-95"
          >
            📤 Share Your Score
          </button>
        ))}
      <button
        onClick={onLeave}
        className="mt-auto w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
      >
        🏠 Home
      </button>
    </>
  );
}
