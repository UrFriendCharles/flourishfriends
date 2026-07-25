import { useRoomSocket } from "../hooks/useRoomSocket";
import { countryById } from "../data/countries";
import { HINT_GUESS_BONUS } from "../logic/roomProtocol";
import { CHOICE_LETTERS, RoomFinalStandings, RoomTimerBar } from "../components/RoomBits";
import { QrCode } from "../components/QrCode";

interface Props {
  roomCode: string;
}

// Read-only big-screen view: mirror this tab to a TV. Landscape-friendly,
// larger type than the phone screens, no interactive controls.
export function DisplayRoom({ roomCode }: Props) {
  const { snapshot, connected, fatalError, clockOffset } = useRoomSocket(roomCode, () => ({
    type: "hello",
    role: "display",
  }));

  const joinLink = `${window.location.origin}/join/${roomCode}`;
  const joinUrl = joinLink.replace(/^https?:\/\//, "");

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between text-sm font-bold text-slate-400">
        <span>🌍 Flourish Friends Flag Quiz</span>
        <span>
          ROOM <span className="tracking-widest text-sky-200">{roomCode}</span>
          {!connected && " · 🟡"}
        </span>
      </div>
      {children}
    </div>
  );

  if (fatalError) {
    return shell(
      <div className="my-auto text-center">
        <div className="text-7xl">🚪</div>
        <p className="mt-4 text-2xl font-black">{fatalError}</p>
      </div>
    );
  }

  if (!snapshot) {
    return shell(<div className="my-auto text-center text-xl text-slate-400">Connecting…</div>);
  }

  if (snapshot.status === "lobby") {
    return shell(
      <div className="my-auto text-center">
        <h1 className="text-3xl font-black text-slate-300">Grab your phone and join!</h1>
        <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-12">
          <div className="rounded-3xl bg-white p-4 shadow-2xl">
            <QrCode value={joinLink} size={240} />
          </div>
          <div>
            <div className="text-lg font-bold uppercase tracking-wider text-slate-400">
              📱 Scan to join
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-300">{joinUrl}</div>
            <div className="mt-1 text-8xl font-black tracking-[0.15em] text-sky-200 animate-pop-in">
              {roomCode}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-3">
          {snapshot.players.length === 0 ? (
            <p className="text-slate-500">Nobody here yet…</p>
          ) : (
            snapshot.players.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xl font-bold animate-pop-in"
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  if (snapshot.status === "question" && snapshot.question) {
    return shell(
      <>
        <div className="text-center text-sm font-bold uppercase tracking-widest text-slate-400">
          Question {snapshot.questionIndex + 1} of {snapshot.totalQuestions}
        </div>
        {snapshot.question.prompt && (
          <div className="text-center text-2xl font-black text-slate-200">
            {snapshot.question.prompt}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          <img
            src={snapshot.question.flagImage}
            alt={snapshot.question.silhouette ? "Mystery state" : "Mystery flag"}
            className={`max-h-64 w-auto md:max-h-80 ${
              snapshot.question.silhouette
                ? "drop-shadow-2xl"
                : "rounded-xl border border-white/15 shadow-2xl"
            }`}
          />
          <div className="grid w-full max-w-md grid-cols-1 gap-3">
            {snapshot.question.choices.map((choice, i) => (
              <div
                key={choice}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-xl font-bold"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-black">
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
        <div className="flex flex-wrap justify-center gap-2.5">
          {snapshot.players.map((p) => (
            <span
              key={p.id}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-bold ${
                p.answered ? "border-green-400/50 bg-green-500/15" : "border-white/10 bg-white/5 opacity-70"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name} {p.answered ? "✅" : "…"}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (snapshot.status === "reveal") {
    const country = snapshot.countryId ? countryById.get(snapshot.countryId) : undefined;
    return shell(
      <>
        <div className="text-center animate-pop-in">
          <div className="text-sm font-bold uppercase tracking-widest text-slate-400">
            The answer is
          </div>
          <div className="mt-1 text-5xl font-black text-green-300">{snapshot.correctAnswer}</div>
          {country && snapshot.question?.kind === "capital" ? (
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">
              🏛️ The capital of <span className="font-bold text-white">{country.country}</span>
              {country.funFacts[0] ? <> · 💡 {country.funFacts[0]}</> : null}
            </p>
          ) : country ? (
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">💡 {country.flagFact}</p>
          ) : null}
        </div>
        <div className="mx-auto w-full max-w-xl space-y-2">
          {[...snapshot.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xl"
              >
                <span className="w-6 text-center font-black text-slate-400">{i + 1}</span>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{p.name}</span>
                  {p.lastAnswer && (
                    <span
                      className={`truncate text-sm ${
                        p.lastAnswer.correct ? "text-green-300/80" : "text-rose-300/80"
                      }`}
                    >
                      picked {p.lastAnswer.choice}
                    </span>
                  )}
                </span>
                <span className="text-base">
                  {p.lastAnswer ? (p.lastAnswer.correct ? "✅" : "❌") : "⏰"}
                </span>
                {p.lastAnswer && p.lastAnswer.pointsEarned > 0 && (
                  <span className="text-base font-bold text-green-300">
                    +{p.lastAnswer.pointsEarned}
                  </span>
                )}
                {p.streak >= 3 && (
                  <span className="text-base font-bold text-orange-300">🔥{p.streak}</span>
                )}
                <span className="font-black tabular-nums text-sky-200">{p.score}</span>
              </div>
            ))}
        </div>
      </>
    );
  }

  if (snapshot.status === "guessing") {
    return shell(
      <div className="my-auto text-center">
        <div className="text-7xl">🎲</div>
        <h1 className="mt-4 text-4xl font-black">Who used the most hints?</h1>
        <p className="mt-3 text-xl text-slate-300">
          Guess on your phones — correct guessers get +{HINT_GUESS_BONUS} points!
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-3">
          {snapshot.players.map((p) => (
            <span
              key={p.id}
              className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-xl font-bold ${
                p.guessed
                  ? "border-green-400/50 bg-green-500/15"
                  : "border-white/15 bg-white/5 opacity-70"
              }`}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name} {p.guessed ? "✅" : "…"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ended
  const biggest = snapshot.biggestHintUserIds ?? [];
  const biggestNames = snapshot.players
    .filter((p) => biggest.includes(p.id))
    .map((p) => p.name)
    .join(", ");
  const maxHints = Math.max(0, ...snapshot.players.map((p) => p.totalHints ?? 0));
  const correctGuessers = snapshot.players.filter((p) => p.guessCorrect).map((p) => p.name);
  return shell(
    <div className="mx-auto my-auto w-full max-w-xl">
      <div className="text-center animate-pop-in">
        <div className="text-7xl">🏆</div>
        <h1 className="mt-2 text-4xl font-black winner-shimmer">Final Scores</h1>
      </div>
      {biggest.length > 0 && (
        <div className="mt-5 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-center">
          <div className="text-sm font-bold uppercase tracking-wider text-violet-200">
            🎲 Biggest hint-user
          </div>
          <div className="mt-1 text-3xl font-black text-white">
            {biggestNames} · {maxHints} {maxHints === 1 ? "hint" : "hints"}
          </div>
          <div className="mt-1 text-slate-300">
            {correctGuessers.length
              ? `${correctGuessers.join(", ")} guessed right (+${HINT_GUESS_BONUS})`
              : "Nobody guessed it!"}
          </div>
        </div>
      )}
      <div className="mt-6">
        <RoomFinalStandings players={snapshot.players} />
      </div>
      <p className="mt-6 text-center text-slate-400">
        Thanks for playing! Players can share scores from their phones. 🌍
      </p>
    </div>
  );
}
