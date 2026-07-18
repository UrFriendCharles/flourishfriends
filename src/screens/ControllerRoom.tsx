import { useEffect, useState } from "react";
import type { ScoreShare } from "../types";
import { useRoomSocket } from "../hooks/useRoomSocket";
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
          alt={snapshot.question.kind === "capital" ? "Mystery state" : "Mystery flag"}
          className={`mx-auto max-h-40 w-auto ${
            snapshot.question.kind === "capital"
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

  // ended
  const totalQ = snapshot.totalQuestions;
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
