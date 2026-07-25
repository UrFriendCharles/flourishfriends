import type {
  GameSettings,
  GameState,
  HintKey,
  Player,
  PlayerAnswer,
  Question,
  Screen,
} from "../types";
import { scoreCorrectAnswer } from "./scoring";
import { isAnswerCorrect } from "./answerMatch";

export const PLAYER_COLORS = [
  "#38bdf8", // sky
  "#fb7185", // rose
  "#4ade80", // green
  "#facc15", // yellow
  "#c084fc", // purple
  "#fb923c", // orange
];

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "classic",
  collection: "world",
  answerStyle: "choices",
  difficulty: "easy",
  questionCount: 10,
  timerSeconds: null,
  hintsEnabled: true,
  lifelinesEnabled: true,
  speedBonusEnabled: true,
  continents: [],
  hintGuessRound: true,
};

const EMPTY_RUNTIME = {
  hintsRevealed: [] as HintKey[],
  removedChoices: [] as string[],
  crowdVotes: null,
  shownAt: 0,
};

export function initialGameState(): GameState {
  return {
    screen: "home",
    settings: DEFAULT_SETTINGS,
    players: [],
    questions: [],
    currentQuestionIndex: 0,
    activePlayerIndex: 0,
    questionRuntime: { ...EMPTY_RUNTIME },
    tieBreaker: null,
    tieBreakerQuestions: [],
    tieBreakerWinnerId: null,
    finishedAt: null,
  };
}

export type GameAction =
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "SET_PLAYERS"; players: { name: string; color: string }[] }
  | { type: "START_GAME"; settings: GameSettings; questions: Question[]; now: number }
  | { type: "PLAYER_READY"; now: number }
  | { type: "REVEAL_HINT"; hint: HintKey }
  | { type: "USE_FIFTY_FIFTY"; removed: string[] }
  | { type: "USE_CROWD"; votes: Record<string, number> }
  | { type: "LOCK_IN"; choice: string; now: number }
  | { type: "TIME_UP"; now: number }
  | { type: "NEXT_QUESTION"; tieBreakerQuestions?: Question[]; now: number }
  | { type: "PLAY_AGAIN"; questions: Question[]; now: number }
  | { type: "RESUME_GAME"; state: GameState; now: number };

// ---------- helpers ----------

export function currentQuestion(state: GameState): Question | null {
  if (state.tieBreaker) {
    return state.tieBreakerQuestions[state.tieBreaker.round] ?? null;
  }
  return state.questions[state.currentQuestionIndex] ?? null;
}

/** Key under which the active player's answer for the current question is stored. */
export function answerKey(state: GameState): string {
  return state.tieBreaker
    ? `tb-${state.tieBreaker.round}`
    : String(state.currentQuestionIndex);
}

/** Players participating in the current round (all, or only tied players). */
export function roundPlayers(state: GameState): Player[] {
  if (!state.tieBreaker) return state.players;
  const tied = new Set(state.tieBreaker.playerIds);
  return state.players.filter((p) => tied.has(p.id));
}

export function activePlayer(state: GameState): Player | null {
  return roundPlayers(state)[state.activePlayerIndex] ?? null;
}

export function isTied(players: Player[]): boolean {
  if (players.length < 2) return false;
  const top = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === top).length > 1;
}

export function tiedPlayerIds(players: Player[]): string[] {
  const top = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === top).map((p) => p.id);
}

export function getWinner(state: GameState): Player | null {
  if (state.players.length === 0) return null;
  if (state.tieBreakerWinnerId) {
    return state.players.find((p) => p.id === state.tieBreakerWinnerId) ?? null;
  }
  return [...state.players].sort((a, b) => b.score - a.score)[0];
}

export function usedCountryIds(state: GameState): Set<string> {
  return new Set([
    ...state.questions.map((q) => q.countryId),
    ...state.tieBreakerQuestions.map((q) => q.countryId),
  ]);
}

function resetPlayersForNewGame(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    score: 0,
    streak: 0,
    bestStreak: 0,
    fiftyFiftyUsed: false,
    crowdUsed: false,
    answers: {},
  }));
}

/** First screen of a round: pass-device interstitial in multiplayer, else the question. */
function enterRound(state: GameState, now: number): GameState {
  const multi = roundPlayers(state).length > 1;
  return {
    ...state,
    activePlayerIndex: 0,
    questionRuntime: { ...EMPTY_RUNTIME, shownAt: multi ? 0 : now },
    screen: multi ? "passDevice" : "question",
  };
}

// ---------- answer recording ----------

function recordAnswer(state: GameState, choice: string, now: number): GameState {
  const question = currentQuestion(state);
  const active = activePlayer(state);
  if (!question || !active || state.screen !== "question") return state;

  const key = answerKey(state);
  if (active.answers[key]) return state; // already locked in

  const correct =
    state.settings.answerStyle === "typed"
      ? isAnswerCorrect(choice, question.correctAnswer)
      : choice === question.correctAnswer;
  const timeMs = Math.max(0, now - state.questionRuntime.shownAt);
  const hintsUsed = state.questionRuntime.hintsRevealed.length;
  const newStreak = correct ? active.streak + 1 : 0;
  const pointsEarned =
    correct && !state.tieBreaker
      ? scoreCorrectAnswer(state.settings, hintsUsed, timeMs, newStreak)
      : 0;

  const answer: PlayerAnswer = { choice, correct, timeMs, hintsUsed, pointsEarned };
  const players = state.players.map((p) =>
    p.id === active.id
      ? {
          ...p,
          score: p.score + pointsEarned,
          streak: newStreak,
          bestStreak: Math.max(p.bestStreak, newStreak),
          answers: { ...p.answers, [key]: answer },
        }
      : p
  );

  const round = roundPlayers({ ...state, players });
  const nextIndex = state.activePlayerIndex + 1;
  if (nextIndex < round.length) {
    // hand the device to the next player
    return {
      ...state,
      players,
      activePlayerIndex: nextIndex,
      questionRuntime: { ...EMPTY_RUNTIME },
      screen: "passDevice",
    };
  }
  return { ...state, players, screen: "reveal" };
}

// ---------- reducer ----------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, screen: action.screen };

    case "SET_PLAYERS": {
      const players: Player[] = action.players.map((p, i) => ({
        id: `player-${i}`,
        name: p.name,
        color: p.color,
        score: 0,
        streak: 0,
        bestStreak: 0,
        fiftyFiftyUsed: false,
        crowdUsed: false,
        answers: {},
      }));
      return { ...state, players, screen: "gameSetup" };
    }

    case "START_GAME": {
      const next: GameState = {
        ...state,
        settings: action.settings,
        questions: action.questions,
        players: resetPlayersForNewGame(state.players),
        currentQuestionIndex: 0,
        tieBreaker: null,
        tieBreakerQuestions: [],
        tieBreakerWinnerId: null,
        finishedAt: null,
      };
      return enterRound(next, action.now);
    }

    case "PLAYER_READY":
      if (state.screen !== "passDevice") return state;
      return {
        ...state,
        screen: "question",
        questionRuntime: { ...state.questionRuntime, shownAt: action.now },
      };

    case "REVEAL_HINT": {
      if (state.questionRuntime.hintsRevealed.includes(action.hint)) return state;
      return {
        ...state,
        questionRuntime: {
          ...state.questionRuntime,
          hintsRevealed: [...state.questionRuntime.hintsRevealed, action.hint],
        },
      };
    }

    case "USE_FIFTY_FIFTY": {
      const active = activePlayer(state);
      if (!active || active.fiftyFiftyUsed) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === active.id ? { ...p, fiftyFiftyUsed: true } : p
        ),
        questionRuntime: { ...state.questionRuntime, removedChoices: action.removed },
      };
    }

    case "USE_CROWD": {
      const active = activePlayer(state);
      if (!active || active.crowdUsed) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === active.id ? { ...p, crowdUsed: true } : p
        ),
        questionRuntime: { ...state.questionRuntime, crowdVotes: action.votes },
      };
    }

    case "LOCK_IN":
      return recordAnswer(state, action.choice, action.now);

    case "TIME_UP":
      return recordAnswer(state, "", action.now);

    case "NEXT_QUESTION": {
      if (state.screen !== "reveal") return state;

      if (state.tieBreaker) {
        // Sudden death: players who answered wrong are eliminated if anyone was right
        const key = `tb-${state.tieBreaker.round}`;
        const tied = roundPlayers(state);
        const correctIds = tied.filter((p) => p.answers[key]?.correct).map((p) => p.id);
        const survivors =
          correctIds.length > 0 && correctIds.length < tied.length
            ? correctIds
            : state.tieBreaker.playerIds;

        if (survivors.length === 1) {
          return {
            ...state,
            tieBreakerWinnerId: survivors[0],
            screen: "results",
            finishedAt: action.now,
          };
        }
        const nextRound = state.tieBreaker.round + 1;
        const tieBreakerQuestions = action.tieBreakerQuestions
          ? [...state.tieBreakerQuestions, ...action.tieBreakerQuestions]
          : state.tieBreakerQuestions;
        if (nextRound >= tieBreakerQuestions.length) {
          // ran out of questions — highest score among survivors wins outright
          return {
            ...state,
            tieBreakerWinnerId: survivors[0],
            screen: "results",
            finishedAt: action.now,
          };
        }
        const next: GameState = {
          ...state,
          tieBreaker: { playerIds: survivors, round: nextRound },
          tieBreakerQuestions,
        };
        return enterRound(next, action.now);
      }

      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex < state.questions.length) {
        return enterRound({ ...state, currentQuestionIndex: nextIndex }, action.now);
      }

      // end of the main game
      if (isTied(state.players) && action.tieBreakerQuestions?.length) {
        const next: GameState = {
          ...state,
          tieBreaker: { playerIds: tiedPlayerIds(state.players), round: 0 },
          tieBreakerQuestions: action.tieBreakerQuestions,
        };
        return enterRound(next, action.now);
      }
      return { ...state, screen: "results", finishedAt: action.now };
    }

    case "PLAY_AGAIN": {
      const next: GameState = {
        ...state,
        questions: action.questions,
        players: resetPlayersForNewGame(state.players),
        currentQuestionIndex: 0,
        tieBreaker: null,
        tieBreakerQuestions: [],
        tieBreakerWinnerId: null,
        finishedAt: null,
      };
      return enterRound(next, action.now);
    }

    case "RESUME_GAME":
      // restart the answer clock so timed games don't expire instantly
      return action.state.screen === "question"
        ? {
            ...action.state,
            questionRuntime: { ...action.state.questionRuntime, shownAt: action.now },
          }
        : action.state;

    default:
      return state;
  }
}
