import { useState } from "react";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { countryById } from "../data/countries";
import { CHOICE_LETTERS, RoomFinalStandings, RoomTimerBar } from "../components/RoomBits";

interface Props {
  roomCode: string;
  hostKey: string;
  onExit: () => void;
}

// The hosting device IS the shared game board (mirror it to a TV): it shows
// the room code, flags, choices, timers, scores, and results, with the host
// controls tucked along the bottom. Players answer on their own phones.

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      onClick={copy}
      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition active:scale-95"
    >
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{value}</span>
      <span className="text-xs font-bold text-sky-300">{copied ? "✅" : "📋"}</span>
    </button>
  );
}

export function HostRoom({ roomCode, hostKey, onExit }: Props) {
  const { snapshot, connected, fatalError, clockOffset, send } = useRoomSocket(roomCode, () => ({
    type: "hello",
    role: "host",
    hostKey,
  }));
  const [confirmEnd, setConfirmEnd] = useState(false);

  const origin = window.location.origin.replace(/^https?:\/\//, "");

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6 md:max-w-4xl md:px-8">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 md:text-sm">
        <span>🌍 Flourish Friends Flag Quiz</span>
        <span>
          ROOM <span className="tracking-widest text-sky-200">{roomCode}</span>
          {!connected && " · 🟡 Reconnecting…"}
        </span>
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
          onClick={onExit}
          className="mx-auto w-full max-w-md rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold transition active:scale-95"
        >
          🏠 Home
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return shell(<div className="my-auto text-center text-slate-400">Opening room…</div>);
  }

  const endButton = snapshot.status !== "ended" && (
    <button
      onClick={() => {
        if (confirmEnd) {
          send({ type: "end" });
          setConfirmEnd(false);
        } else {
          setConfirmEnd(true);
          setTimeout(() => setConfirmEnd(false), 3000);
        }
      }}
      className={`rounded-2xl border px-5 py-2.5 text-sm font-bold transition active:scale-95 ${
        confirmEnd
          ? "border-rose-400/70 bg-rose-500/20 text-rose-200"
          : "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      {confirmEnd ? "⚠️ Tap again to end" : "🛑 End Game"}
    </button>
  );

  if (snapshot.status === "lobby") {
    return shell(
      <>
        <div className="text-center animate-pop-in">
          <h1 className="text-xl font-black text-slate-300 md:text-3xl">
            Grab your phone and join!
          </h1>
          <div className="mt-3 text-lg font-bold text-slate-300 md:text-2xl">
            {origin}/join/{roomCode}
          </div>
          <div className="text-7xl font-black tracking-[0.15em] text-sky-200 md:text-8xl">
            {roomCode}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
          {snapshot.players.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              Waiting for players to join on their phones…
            </p>
          ) : (
            snapshot.players.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-bold animate-pop-in md:px-5 md:py-2.5 md:text-xl"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
                {!p.connected && " 📵"}
              </span>
            ))
          )}
        </div>

        <div className="mx-auto w-full max-w-md space-y-2">
          <CopyRow label="Players join" value={`${origin}/join/${roomCode}`} />
          <CopyRow label="Separate TV screen" value={`${origin}/display/${roomCode}`} />
          <p className="px-1 text-center text-xs text-slate-500">
            Mirroring this screen to the TV? You're all set — this device is the game board.
          </p>
        </div>

        <div className="mx-auto mt-auto flex w-full max-w-md flex-col gap-2.5">
          <button
            onClick={() => send({ type: "start" })}
            disabled={snapshot.players.length === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
          >
            🚀 Start Game
          </button>
          <button
            onClick={onExit}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
          >
            🏠 Leave (room stays open)
          </button>
        </div>
      </>
    );
  }

  if (snapshot.status === "question" && snapshot.question) {
    const answeredCount = snapshot.players.filter((p) => p.answered).length;
    return shell(
      <>
        <div className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 md:text-sm">
          Question {snapshot.questionIndex + 1} of {snapshot.totalQuestions}
        </div>
        {snapshot.question.prompt && (
          <div className="text-center text-lg font-black text-slate-200 md:text-2xl">
            {snapshot.question.prompt}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 md:flex-row md:gap-10">
          <img
            src={snapshot.question.flagImage}
            alt={snapshot.question.kind === "capital" ? "Mystery state" : "Mystery flag"}
            className={`max-h-44 w-auto md:max-h-72 ${
              snapshot.question.kind === "capital"
                ? "drop-shadow-2xl"
                : "rounded-xl border border-white/15 shadow-2xl"
            }`}
          />
          <div className="grid w-full max-w-md grid-cols-1 gap-2.5 md:gap-3">
            {snapshot.question.choices.map((choice, i) => (
              <div
                key={choice}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold md:px-5 md:py-3.5 md:text-xl"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black md:h-8 md:w-8 md:text-base">
                  {CHOICE_LETTERS[i]}
                </span>
                {choice}
              </div>
            ))}
          </div>
        </div>
        {snapshot.questionDeadline !== null && snapshot.settings.timerSeconds !== null && (
          <RoomTimerBar
            deadline={snapshot.questionDeadline}
            totalSeconds={snapshot.settings.timerSeconds}
            clockOffset={clockOffset}
          />
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {snapshot.players.map((p) => (
            <span
              key={p.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${
                p.answered
                  ? "border-green-400/50 bg-green-500/15"
                  : "border-white/10 bg-white/5 opacity-70"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name} {p.answered ? "✅" : "…"}
            </span>
          ))}
        </div>
        <div className="mx-auto flex w-full max-w-md items-center gap-2.5">
          <button
            onClick={() => send({ type: "reveal" })}
            className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 font-bold transition active:scale-95"
          >
            👁️ Reveal Now ({answeredCount}/{snapshot.players.length})
          </button>
          {endButton}
        </div>
      </>
    );
  }

  if (snapshot.status === "reveal") {
    const country = snapshot.countryId ? countryById.get(snapshot.countryId) : undefined;
    const isLast = snapshot.questionIndex + 1 >= snapshot.totalQuestions;
    return shell(
      <>
        <div className="text-center animate-pop-in">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 md:text-sm">
            The answer is
          </div>
          <div className="mt-1 text-3xl font-black text-green-300 md:text-5xl">
            {snapshot.correctAnswer}
          </div>
          {country && snapshot.settings.collection === "usCapitals" ? (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              🏛️ The capital of <span className="font-bold text-white">{country.country}</span>
              {country.funFacts[0] ? <> · 💡 {country.funFacts[0]}</> : null}
            </p>
          ) : country ? (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              💡 {country.flagFact}
            </p>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-xl space-y-2">
          {[...snapshot.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 md:px-5 md:py-3 md:text-xl"
              >
                <span className="w-5 text-center font-black text-slate-400">{i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <span className="text-sm md:text-base">
                  {p.lastAnswer ? (p.lastAnswer.correct ? "✅" : "❌") : "⏰"}
                </span>
                {p.lastAnswer && p.lastAnswer.pointsEarned > 0 && (
                  <span className="text-sm font-bold text-green-300 md:text-base">
                    +{p.lastAnswer.pointsEarned}
                  </span>
                )}
                {p.streak >= 3 && (
                  <span className="text-sm font-bold text-orange-300 md:text-base">
                    🔥{p.streak}
                  </span>
                )}
                <span className="font-black tabular-nums text-sky-200">{p.score}</span>
              </div>
            ))}
        </div>
        <div className="mx-auto mt-auto flex w-full max-w-md items-center gap-2.5">
          <button
            onClick={() => send({ type: "next" })}
            className="flex-1 rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3.5 text-lg font-bold shadow-lg shadow-sky-500/25 transition active:scale-95"
          >
            {isLast ? "🏁 Final Results" : "➡️ Next Question"}
          </button>
          {endButton}
        </div>
      </>
    );
  }

  // ended
  return shell(
    <div className="mx-auto my-auto w-full max-w-xl">
      <div className="text-center animate-pop-in">
        <div className="text-7xl">🏆</div>
        <h1 className="mt-2 text-4xl font-black winner-shimmer">Final Scores</h1>
      </div>
      <div className="mt-6">
        <RoomFinalStandings players={snapshot.players} />
      </div>
      <p className="mt-4 text-center text-xs text-slate-400 md:text-sm">
        Players can share their scores from their phones.
      </p>
      <button
        onClick={onExit}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-bold transition active:scale-95"
      >
        🏠 Done
      </button>
    </div>
  );
}
