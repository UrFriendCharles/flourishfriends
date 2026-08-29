import { useEffect, useState } from "react";
import { useClubSocket } from "../hooks/useClubSocket";
import { FINAL_ROUND_INDEX } from "../logic/clubProtocol";
import { ClubAnswerPad } from "../components/ClubAnswerPad";
import {
  ClubStandings,
  ClubTimer,
  ClubVisualView,
  TierBadge,
  tierAccent,
} from "../components/ClubBits";

interface Props {
  roomCode: string;
  playerName: string;
  onLeave: () => void;
}

// The phone is the controller (§3). It carries a compact copy of the question
// and its artwork so nobody has to squint at the TV from the sofa, plus the
// answer controls, the Pass, and this player's private status.

const playerIdKey = (code: string) => `ffq:club:${code}:playerId`;

export function ClubControllerRoom({ roomCode, playerName, onLeave }: Props) {
  const { snapshot, you, connected, fatalError, clockOffset, send } = useClubSocket(
    roomCode,
    () => ({
      type: "hello",
      role: "player",
      name: playerName,
      playerId: sessionStorage.getItem(playerIdKey(roomCode)) ?? undefined,
    })
  );
  const [draft, setDraft] = useState("");
  const [confirmPass, setConfirmPass] = useState(false);

  // remember our server-assigned id so a refresh rejoins as us (§42)
  useEffect(() => {
    if (you?.playerId) sessionStorage.setItem(playerIdKey(roomCode), you.playerId);
  }, [you?.playerId, roomCode]);

  // fresh draft each round
  const roundKey = `${snapshot?.status}:${snapshot?.roundIndex}`;
  useEffect(() => {
    setDraft("");
    setConfirmPass(false);
  }, [roundKey]);

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3.5 px-5 py-5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>🧠 0.5% CLUB · {roomCode}</span>
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
  const survival = snapshot.settings.mode === "survival";
  const forFun = survival && you?.winnerEligible === false;

  const statusBanner = forFun && (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-amber-200">
      🎈 Playing for fun — not eligible to win
    </div>
  );

  if (snapshot.status === "lobby") {
    return shell(
      <>
        <div className="my-auto text-center animate-pop-in">
          <div className="text-5xl">🙌</div>
          <h2 className="mt-2 text-2xl font-black">You're in{me ? `, ${me.name}` : ""}.</h2>
          <p className="mt-1 text-slate-300">Look at the big screen.</p>
          <p className="mt-4 text-sm text-slate-400">
            {snapshot.players.length} player{snapshot.players.length === 1 ? "" : "s"} in the room ·
            waiting for the host…
          </p>
        </div>
      </>
    );
  }

  if (snapshot.status === "intro") {
    return shell(
      <div className="my-auto space-y-3 text-center animate-pop-in">
        <div className="text-5xl">🧠</div>
        <h2 className="text-2xl font-black">Get ready.</h2>
        <p className="text-sm text-slate-300">
          {survival ? (
            <>
              You have {snapshot.settings.passes}{" "}
              {snapshot.settings.passes === 1 ? "Pass" : "Passes"}. A wrong answer or a timeout means
              you can't win — but you keep playing every question.
            </>
          ) : (
            <>Unlimited Passes. 1 point per correct answer. Most correct answers wins.</>
          )}
        </p>
      </div>
    );
  }

  if (snapshot.status === "round_intro") {
    const accent = tierAccent(snapshot.difficulty);
    return shell(
      <div className="my-auto text-center">
        <div className={`text-7xl font-black animate-pop-in ${accent.text}`}>
          {snapshot.difficulty}%
        </div>
        <p className="mt-2 text-slate-300">
          {snapshot.roundIndex === FINAL_ROUND_INDEX
            ? "The final question. No Pass. Good luck."
            : "Get ready…"}
        </p>
        {statusBanner}
      </div>
    );
  }

  if (snapshot.status === "question" && snapshot.question) {
    const q = snapshot.question;
    const locked = you?.answer !== null && you?.answer !== undefined;
    const passed = you?.passed ?? false;
    const settled = locked || passed;
    const totalSeconds = Math.max(
      1,
      Math.round(((snapshot.questionEndsAt ?? 0) - (snapshot.questionStartedAt ?? 0)) / 1000)
    );

    return shell(
      <>
        <div className="flex items-center justify-between gap-3">
          <TierBadge tier={snapshot.difficulty} className="text-xs" />
          <div className="w-28">
            <ClubTimer
              endsAt={snapshot.questionEndsAt}
              totalSeconds={totalSeconds}
              clockOffset={clockOffset}
              paused={snapshot.paused}
            />
          </div>
        </div>

        {statusBanner}

        <p className="whitespace-pre-line text-center text-base font-bold leading-snug text-slate-100">
          {q.prompt}
        </p>

        {q.visual && (
          <ClubVisualView visual={q.visual} className="max-h-52 [&>svg]:max-h-52" />
        )}

        {settled ? (
          <div className="my-auto rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-6 text-center animate-pop-in">
            <div className="text-3xl">{passed ? "🛟" : "🔒"}</div>
            <div className="mt-1 text-xl font-black">
              {passed ? "PASS USED" : "ANSWER LOCKED"}
            </div>
            {locked && !passed && (
              <div className="mt-1 truncate text-sm text-slate-300">You said: {you?.answer}</div>
            )}
            <p className="mt-2 text-xs text-slate-400">Waiting for everyone else…</p>
          </div>
        ) : (
          <>
            <ClubAnswerPad
              question={q}
              draft={draft}
              onDraft={setDraft}
              disabled={snapshot.paused}
            />

            <div className="mt-auto flex flex-col gap-2.5 pt-3">
              <button
                onClick={() => draft.trim() && send({ type: "answer", answer: draft.trim() })}
                disabled={!draft.trim() || snapshot.paused}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4 text-lg font-black shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-40"
              >
                🔒 LOCK ANSWER
              </button>

              {you?.canPass &&
                (confirmPass ? (
                  <button
                    onClick={() => send({ type: "pass" })}
                    className="w-full rounded-2xl border border-amber-400/60 bg-amber-500/20 px-6 py-3.5 font-black text-amber-100 transition active:scale-95"
                  >
                    🛟 USE PASS — this can't be undone
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmPass(true)}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-slate-300 transition active:scale-95"
                  >
                    🛟 PASS{" "}
                    {you.passesRemaining !== null ? `×${you.passesRemaining}` : "(unlimited)"}
                  </button>
                ))}

              {snapshot.roundIndex === FINAL_ROUND_INDEX && (
                <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  No Pass on the 0.5% question
                </p>
              )}
            </div>
          </>
        )}
      </>
    );
  }

  if (snapshot.status === "reveal") {
    const result = you?.lastResult ?? null;
    const tone = result?.passed
      ? { icon: "🛟", label: "PASS USED", color: "text-amber-200", border: "border-amber-400/40" }
      : result?.correct
        ? { icon: "✅", label: "CORRECT", color: "text-green-300", border: "border-green-400/40" }
        : { icon: "❌", label: result?.timedOut ? "OUT OF TIME" : "WRONG", color: "text-rose-300", border: "border-rose-400/40" };

    const inContention = !survival || (you?.winnerEligible ?? true);
    const subline = result?.passed
      ? inContention
        ? "You're still in."
        : "Keep playing."
      : result?.correct
        ? !survival
          ? "+1 point."
          : inContention
            ? "You're still in."
            : "Right answer — but you're not in the running this game."
        : survival
          ? result?.eliminatedHere
            ? "You can no longer win — but keep playing."
            : "Keep playing."
          : "No point this round. Keep going.";

    return shell(
      <>
        <div className={`rounded-2xl border ${tone.border} bg-white/5 px-4 py-5 text-center animate-pop-in`}>
          <div className="text-5xl">{tone.icon}</div>
          <div className={`mt-1 text-2xl font-black ${tone.color}`}>{tone.label}</div>
          <p className="mt-1 text-sm text-slate-300">{subline}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            The answer is
          </div>
          <div className="text-xl font-black text-green-300">{snapshot.correctAnswer}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">💡 {snapshot.explanation}</p>
        </div>

        <div className="mt-auto text-center text-xs text-slate-400">
          {survival ? (
            <>
              {snapshot.eligibleCount} still eligible to win ·{" "}
              {snapshot.players.length - snapshot.eligibleCount} playing for fun
            </>
          ) : (
            <>You have {me?.correctCount ?? 0} correct so far</>
          )}
        </div>
      </>
    );
  }

  // ended
  const winnerIds = snapshot.winnerIds ?? [];
  const iWon = you ? winnerIds.includes(you.playerId) : false;
  return shell(
    <>
      <div className="text-center animate-pop-in">
        <div className="text-6xl">{iWon ? "🏆" : survival ? "🎈" : "🏁"}</div>
        <h2 className="mt-2 text-2xl font-black">
          {iWon
            ? survival
              ? "You're in the 0.5% Club!"
              : "You win!"
            : survival
              ? "The Club stays shut for you this time"
              : "Game over"}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {me?.correctCount ?? 0} correct out of {snapshot.totalRounds} · survived{" "}
          {me?.survivedRounds ?? 0} rounds
        </p>
      </div>

      <ClubStandings
        players={snapshot.players}
        winnerIds={winnerIds}
        highlightId={you?.playerId}
        showScores={!survival}
      />

      <button
        onClick={onLeave}
        className="mt-auto w-full rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold transition active:scale-95"
      >
        🏠 Home
      </button>
    </>
  );
}
