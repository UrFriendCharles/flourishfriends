import { useEffect, useReducer, useRef, useState } from "react";
import type { GameSettings, HighScoreEntry, HintKey } from "./types";
import { countryById } from "./data/countries";
import {
  activePlayer,
  answerKey,
  currentQuestion,
  gameReducer,
  initialGameState,
  isTied,
  roundPlayers,
  usedCountryIds,
} from "./logic/gameReducer";
import { generateQuestions, generateTieBreakerQuestions, withRoomHints } from "./logic/questionGen";
import { simulateCrowdVote } from "./logic/crowd";
import {
  addHighScores,
  addHistory,
  addMissedFlags,
  clearSavedGame,
  loadSavedGame,
  saveGame,
} from "./storage/localStore";
import { HomeScreen } from "./screens/HomeScreen";
import { ScoreDisplay } from "./screens/ScoreDisplay";
import { JoinRoom } from "./screens/JoinRoom";
import { PartyIntro } from "./screens/PartyIntro";
import { ControllerRoom } from "./screens/ControllerRoom";
import { HostRoom } from "./screens/HostRoom";
import { DisplayRoom } from "./screens/DisplayRoom";
import {
  isValidRoomCode,
  normalizeRoomCode,
  type CreateRoomRequest,
  type CreateRoomResponse,
} from "./logic/roomProtocol";
import { PlayerSetup } from "./screens/PlayerSetup";
import { GameSetup } from "./screens/GameSetup";
import { PassDevice } from "./screens/PassDevice";
import { QuestionScreen } from "./screens/QuestionScreen";
import { AnswerReveal } from "./screens/AnswerReveal";
import { GameResults, missedCountryIds } from "./screens/GameResults";
import { HighScores } from "./screens/HighScores";
import { HowToPlay } from "./screens/HowToPlay";
import { About } from "./screens/About";
import { PlatformHome } from "./screens/PlatformHome";
import { ClubSetup } from "./screens/ClubSetup";
import { ClubHostRoom } from "./screens/ClubHostRoom";
import { ClubDisplayRoom } from "./screens/ClubDisplayRoom";
import { ClubVisualPreview } from "./screens/ClubVisualPreview";
import { ClubControllerRoom } from "./screens/ClubControllerRoom";
import { selectClubQuestions, rememberPlayedQuestions } from "./logic/clubSelect";
import type { ClubSettings, CreateClubRoomRequest, CreateClubRoomResponse } from "./logic/clubProtocol";

const IN_GAME_SCREENS = new Set(["passDevice", "question", "reveal"]);

// URL-addressed views (shared scores, multiplayer rooms) live outside the
// game state machine, so the reducer stays purely about local gameplay.
type AppRoute =
  | { kind: "score"; shareId: string; payload: string }
  | { kind: "join"; code: string }
  | { kind: "controller"; code: string; name: string }
  | { kind: "display"; code: string }
  | { kind: "host"; code: string; hostKey: string }
  | { kind: "tvIntro" }
  | { kind: "tvSetup" }
  | { kind: "clubSetup" }
  | { kind: "clubVisuals" }
  | { kind: "clubHost"; code: string; hostKey: string }
  | { kind: "clubDisplay"; code: string }
  | { kind: "clubController"; code: string; name: string }
  | null;

const hostKeyStorage = (code: string) => `ffq:room:${code}:hostKey`;
const clubHostKeyStorage = (code: string) => `ffq:club:${code}:hostKey`;

function parseRoute(): AppRoute {
  const path = window.location.pathname;
  const score = path.match(/^\/score\/([a-zA-Z0-9_-]+)\/?$/);
  if (score) {
    // Payload lives in ?s= (server-visible); old links used the #fragment.
    const payload = new URLSearchParams(window.location.search).get("s") ?? window.location.hash.slice(1);
    return { kind: "score", shareId: score[1], payload };
  }
  const join = path.match(/^\/join(?:\/([a-zA-Z0-9]*))?\/?$/);
  if (join) return { kind: "join", code: normalizeRoomCode(join[1] ?? "") };

  // 0.5% Club lives under /club/*; players still join through the shared /join.
  const clubDisplay = path.match(/^\/club\/display\/([a-zA-Z0-9]+)\/?$/);
  if (clubDisplay) {
    const code = normalizeRoomCode(clubDisplay[1]);
    if (isValidRoomCode(code)) return { kind: "clubDisplay", code };
  }
  const clubHost = path.match(/^\/club\/host\/([a-zA-Z0-9]+)\/?$/);
  if (clubHost) {
    const code = normalizeRoomCode(clubHost[1]);
    const hostKey = sessionStorage.getItem(clubHostKeyStorage(code));
    if (isValidRoomCode(code) && hostKey) return { kind: "clubHost", code, hostKey };
    return { kind: "join", code };
  }
  if (/^\/club\/visuals\/?$/.test(path)) return { kind: "clubVisuals" };
  if (/^\/club\/?$/.test(path)) return { kind: "clubSetup" };

  const display = path.match(/^\/display\/([a-zA-Z0-9]+)\/?$/);
  if (display) {
    const code = normalizeRoomCode(display[1]);
    if (isValidRoomCode(code)) return { kind: "display", code };
  }
  const host = path.match(/^\/host\/([a-zA-Z0-9]+)\/?$/);
  if (host) {
    const code = normalizeRoomCode(host[1]);
    const hostKey = sessionStorage.getItem(hostKeyStorage(code));
    // host controls only exist where the room was created; elsewhere, offer to join
    if (isValidRoomCode(code) && hostKey) return { kind: "host", code, hostKey };
    return { kind: "join", code };
  }
  return null;
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState);
  const [route, setRoute] = useState(parseRoute);
  const [tvNotice, setTvNotice] = useState<string | null>(null);
  const [clubNotice, setClubNotice] = useState<string | null>(null);
  const [clubSettings, setClubSettings] = useState<ClubSettings | null>(null);
  // "picker" = the platform home (§54); "flag" = inside the flag quiz
  const [gameArea, setGameArea] = useState<"picker" | "flag">("picker");
  const [hasSavedGame, setHasSavedGame] = useState(() => loadSavedGame() !== null);
  const recordedFinishRef = useRef<number | null>(null);

  // persist in-progress games so Continue Game works after a reload
  useEffect(() => {
    if (IN_GAME_SCREENS.has(state.screen)) {
      saveGame(state);
      setHasSavedGame(true);
    }
  }, [state]);

  // record results exactly once per finished game
  useEffect(() => {
    if (state.screen !== "results" || state.finishedAt === null) return;
    if (recordedFinishRef.current === state.finishedAt) return;
    recordedFinishRef.current = state.finishedAt;

    const date = new Date().toISOString();
    const total = state.questions.length;
    const entries: HighScoreEntry[] = state.players.map((p) => {
      const correct = state.questions.filter((_, i) => p.answers[String(i)]?.correct).length;
      return {
        playerName: p.name,
        score: p.score,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        bestStreak: p.bestStreak,
        date,
        mode: state.settings.mode,
        difficulty: state.settings.difficulty,
        questionCount: state.settings.questionCount,
        timed: state.settings.timerSeconds !== null,
        collection: state.settings.collection,
        typed: state.settings.answerStyle === "typed",
      };
    });
    addHighScores(entries);

    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const winner = state.tieBreakerWinnerId
      ? state.players.find((p) => p.id === state.tieBreakerWinnerId)
      : sorted[0];
    addHistory({
      date,
      mode: state.settings.mode,
      difficulty: state.settings.difficulty,
      questionCount: state.settings.questionCount,
      winnerName: winner?.name ?? "",
      scores: sorted.map((p) => ({ name: p.name, score: p.score })),
    });
    addMissedFlags(missedCountryIds(state));
    clearSavedGame();
    setHasSavedGame(false);
  }, [state]);

  const startGame = (settings: GameSettings) =>
    dispatch({
      type: "START_GAME",
      settings,
      questions: generateQuestions(
        settings.questionCount,
        settings.difficulty,
        settings.continents,
        settings.collection
      ),
      now: Date.now(),
    });

  const nextQuestion = () => {
    const isLastMainQuestion =
      !state.tieBreaker && state.currentQuestionIndex + 1 >= state.questions.length;
    const needsTieBreakerStart =
      isLastMainQuestion && state.players.length > 1 && isTied(state.players);
    const needsMoreTieBreakers =
      state.tieBreaker !== null &&
      state.tieBreaker.round + 1 >= state.tieBreakerQuestions.length;

    dispatch({
      type: "NEXT_QUESTION",
      now: Date.now(),
      tieBreakerQuestions:
        needsTieBreakerStart || needsMoreTieBreakers
          ? generateTieBreakerQuestions(
              usedCountryIds(state),
              state.settings.difficulty,
              state.settings.continents,
              state.settings.collection,
              needsTieBreakerStart ? 10 : 5
            )
          : undefined,
    });
  };

  const question = currentQuestion(state);
  const country = question ? countryById.get(question.countryId) : undefined;
  const active = activePlayer(state);
  const round = roundPlayers(state);
  const questionLabel = state.tieBreaker
    ? `Tie-Breaker ${state.tieBreaker.round + 1}`
    : `Question ${state.currentQuestionIndex + 1} of ${state.questions.length}`;

  const goHome = () => {
    window.history.replaceState(null, "", "/");
    setRoute(null);
  };

  const createTvRoom = async (settings: GameSettings) => {
    try {
      const questions = generateQuestions(
        settings.questionCount,
        settings.difficulty,
        settings.continents,
        settings.collection
      );
      const body: CreateRoomRequest = {
        settings,
        // bake hint lines here on the host so the worker never needs the dataset
        questions: settings.hintsEnabled ? withRoomHints(questions) : questions,
      };
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`create room failed: ${res.status}`);
      const { roomCode, hostKey } = (await res.json()) as CreateRoomResponse;
      sessionStorage.setItem(hostKeyStorage(roomCode), hostKey);
      window.history.pushState(null, "", `/host/${roomCode}`);
      setTvNotice(null);
      setRoute({ kind: "host", code: roomCode, hostKey });
    } catch {
      setTvNotice("Couldn't create the room — check your connection and try again.");
    }
  };

  // 0.5% Club rooms ride the same room system: the host picks the eleven
  // questions here (one per tier) and the worker only ever sees those.
  const createClubRoom = async (settings: ClubSettings) => {
    try {
      const questions = selectClubQuestions();
      const body: CreateClubRoomRequest = { settings, questions };
      const res = await fetch("/api/club/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`create club room failed: ${res.status}`);
      const { roomCode, hostKey } = (await res.json()) as CreateClubRoomResponse;
      rememberPlayedQuestions(questions.map((q) => q.id));
      sessionStorage.setItem(clubHostKeyStorage(roomCode), hostKey);
      window.history.pushState(null, "", `/club/host/${roomCode}`);
      setClubNotice(null);
      setClubSettings(settings);
      setRoute({ kind: "clubHost", code: roomCode, hostKey });
    } catch {
      setClubNotice("Couldn't create the room — check your connection and try again.");
    }
  };

  if (route) {
    switch (route.kind) {
      case "score":
        return <ScoreDisplay shareId={route.shareId} payload={route.payload} onHome={goHome} />;
      case "join":
        return (
          <JoinRoom
            initialCode={route.code}
            onJoin={(code, name, game) => {
              window.history.replaceState(null, "", `/join/${code}`);
              setRoute(
                game === "half-percent-club"
                  ? { kind: "clubController", code, name }
                  : { kind: "controller", code, name }
              );
            }}
            onHome={goHome}
          />
        );
      case "controller":
        return <ControllerRoom roomCode={route.code} playerName={route.name} onLeave={goHome} />;
      case "display":
        return <DisplayRoom roomCode={route.code} />;
      case "host":
        return <HostRoom roomCode={route.code} hostKey={route.hostKey} onExit={goHome} />;
      case "tvIntro":
        return (
          <PartyIntro
            onContinue={() => setRoute({ kind: "tvSetup" })}
            onBack={() => setRoute(null)}
          />
        );
      case "tvSetup":
        return (
          <GameSetup
            tv
            notice={tvNotice}
            onStart={createTvRoom}
            onBack={() => {
              setTvNotice(null);
              setRoute({ kind: "tvIntro" });
            }}
          />
        );
      case "clubSetup":
        return (
          <ClubSetup
            notice={clubNotice}
            onStart={createClubRoom}
            onBack={() => {
              setClubNotice(null);
              goHome();
            }}
          />
        );
      case "clubHost":
        return (
          <ClubHostRoom
            roomCode={route.code}
            hostKey={route.hostKey}
            onExit={goHome}
            onPlayAgain={() => {
              // a brand-new room, so the ladder is a fresh set of questions
              if (clubSettings) void createClubRoom(clubSettings);
              else setRoute({ kind: "clubSetup" });
            }}
          />
        );
      case "clubVisuals":
        return <ClubVisualPreview onBack={goHome} />;
      case "clubDisplay":
        return <ClubDisplayRoom roomCode={route.code} />;
      case "clubController":
        return (
          <ClubControllerRoom roomCode={route.code} playerName={route.name} onLeave={goHome} />
        );
    }
  }

  const openJoin = () => {
    window.history.pushState(null, "", "/join");
    setRoute({ kind: "join", code: "" });
  };

  switch (state.screen) {
    case "home":
      if (gameArea === "picker") {
        return (
          <PlatformHome
            onFlagGame={() => setGameArea("flag")}
            onClub={() => {
              window.history.pushState(null, "", "/club");
              setRoute({ kind: "clubSetup" });
            }}
            onJoinRoom={openJoin}
          />
        );
      }
      return (
        <HomeScreen
          hasSavedGame={hasSavedGame}
          onSwitchGame={() => setGameArea("picker")}
          onStart={() => dispatch({ type: "NAVIGATE", screen: "playerSetup" })}
          onContinue={() => {
            const saved = loadSavedGame();
            if (saved) dispatch({ type: "RESUME_GAME", state: saved, now: Date.now() });
          }}
          onHostTv={() => setRoute({ kind: "tvIntro" })}
          onJoinRoom={openJoin}
          onHighScores={() => dispatch({ type: "NAVIGATE", screen: "highScores" })}
          onHowToPlay={() => dispatch({ type: "NAVIGATE", screen: "howToPlay" })}
          onAbout={() => dispatch({ type: "NAVIGATE", screen: "about" })}
        />
      );

    case "howToPlay":
      return <HowToPlay onBack={() => dispatch({ type: "NAVIGATE", screen: "home" })} />;

    case "about":
      return <About onBack={() => dispatch({ type: "NAVIGATE", screen: "home" })} />;

    case "highScores":
      return <HighScores onBack={() => dispatch({ type: "NAVIGATE", screen: "home" })} />;

    case "playerSetup":
      return (
        <PlayerSetup
          onConfirm={(players) => dispatch({ type: "SET_PLAYERS", players })}
          onBack={() => dispatch({ type: "NAVIGATE", screen: "home" })}
        />
      );

    case "gameSetup":
      return (
        <GameSetup
          onStart={startGame}
          onBack={() => dispatch({ type: "NAVIGATE", screen: "playerSetup" })}
        />
      );

    case "passDevice":
      if (!active) return null;
      return (
        <PassDevice
          player={active}
          questionLabel={questionLabel}
          isTieBreaker={state.tieBreaker !== null}
          onReady={() => dispatch({ type: "PLAYER_READY", now: Date.now() })}
        />
      );

    case "question": {
      if (!question || !country || !active) return null;
      return (
        <QuestionScreen
          key={`${answerKey(state)}-${active.id}`}
          question={question}
          country={country}
          settings={state.settings}
          players={state.players}
          activePlayer={active}
          hintsRevealed={state.questionRuntime.hintsRevealed}
          removedChoices={state.questionRuntime.removedChoices}
          crowdVotes={state.questionRuntime.crowdVotes}
          shownAt={state.questionRuntime.shownAt}
          questionLabel={questionLabel}
          questionNumber={
            state.tieBreaker ? state.tieBreaker.round + 1 : state.currentQuestionIndex + 1
          }
          totalQuestions={
            state.tieBreaker ? state.tieBreaker.round + 1 : state.questions.length
          }
          isTieBreaker={state.tieBreaker !== null}
          onRevealHint={(hint: HintKey) => dispatch({ type: "REVEAL_HINT", hint })}
          onFiftyFifty={() => {
            const wrong = question.choices.filter((c) => c !== question.correctAnswer);
            const removed = [...wrong].sort(() => Math.random() - 0.5).slice(0, 2);
            dispatch({ type: "USE_FIFTY_FIFTY", removed });
          }}
          onAskCrowd={() =>
            dispatch({
              type: "USE_CROWD",
              votes: simulateCrowdVote(
                question.choices,
                question.correctAnswer,
                state.settings.difficulty
              ),
            })
          }
          onLockIn={(choice) => dispatch({ type: "LOCK_IN", choice, now: Date.now() })}
          onTimeUp={() => dispatch({ type: "TIME_UP", now: Date.now() })}
        />
      );
    }

    case "reveal":
      if (!question || !country) return null;
      return (
        <AnswerReveal
          question={question}
          country={country}
          players={round}
          allPlayers={state.players}
          answerKey={answerKey(state)}
          isTyped={state.settings.answerStyle === "typed"}
          isLastQuestion={
            !state.tieBreaker && state.currentQuestionIndex + 1 >= state.questions.length
          }
          isTieBreaker={state.tieBreaker !== null}
          onNext={nextQuestion}
        />
      );

    case "results":
      return (
        <GameResults
          state={state}
          onPlayAgain={() =>
            dispatch({
              type: "PLAY_AGAIN",
              questions: generateQuestions(
                state.settings.questionCount,
                state.settings.difficulty,
                state.settings.continents,
                state.settings.collection
              ),
              now: Date.now(),
            })
          }
          onChangeSettings={() => dispatch({ type: "NAVIGATE", screen: "gameSetup" })}
          onHome={() => dispatch({ type: "NAVIGATE", screen: "home" })}
        />
      );

    default:
      return null;
  }
}
