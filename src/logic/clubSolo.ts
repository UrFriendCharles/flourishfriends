import {
  CLUB_ROUND_COUNT,
  FINAL_INTRO_SECONDS,
  FINAL_ROUND_INDEX,
  ROUND_INTRO_SECONDS,
  clubAnswerCorrect,
  type ClubQuestion,
  type ClubSettings,
  type ClubTier,
} from "./clubProtocol";

// Solo 0.5% Club: the same eleven-round ladder with no room and no backend —
// one device, one player. The rules match a room game exactly (a miss ends
// your shot at the Club but you keep playing; no Pass on the final), so a
// solo run is honest practice for the party version.
//
// Kept as a pure reducer in the style of gameReducer.ts: every clock reading
// arrives in the action payload, so nothing here is time-dependent.

export type SoloPhase = "intro" | "round_intro" | "question" | "reveal" | "ended";

export interface SoloRoundResult {
  questionId: string;
  difficulty: ClubTier;
  answer: string | null;
  correct: boolean;
  passed: boolean;
  timedOut: boolean;
  timeMs: number | null;
  /** this is the round that ended your run at the Club */
  eliminatedHere: boolean;
}

export interface ClubSoloState {
  settings: ClubSettings;
  questions: ClubQuestion[];
  phase: SoloPhase;
  roundIndex: number;
  passesRemaining: number;
  winnerEligible: boolean;
  correctCount: number;
  results: SoloRoundResult[];
  /** epoch ms — when the round intro gives way, or the question times out */
  phaseEndsAt: number | null;
  questionStartedAt: number | null;
}

export type ClubSoloAction =
  | { type: "BEGIN"; now: number }
  | { type: "SHOW_QUESTION"; now: number }
  | { type: "LOCK"; answer: string; now: number }
  | { type: "PASS"; now: number }
  | { type: "TIME_UP"; now: number }
  | { type: "NEXT"; now: number }
  | { type: "RESTART"; questions: ClubQuestion[]; now: number };

export function initialSoloState(
  settings: ClubSettings,
  questions: ClubQuestion[]
): ClubSoloState {
  return {
    settings,
    questions,
    phase: "intro",
    roundIndex: 0,
    passesRemaining: settings.mode === "survival" ? settings.passes : 0,
    winnerEligible: true,
    correctCount: 0,
    results: [],
    phaseEndsAt: null,
    questionStartedAt: null,
  };
}

export function soloQuestion(state: ClubSoloState): ClubQuestion | null {
  return state.questions[state.roundIndex] ?? null;
}

export function soloQuestionSeconds(state: ClubSoloState): number {
  return soloQuestion(state)?.timerSeconds ?? state.settings.timerSeconds;
}

export function soloCanPass(state: ClubSoloState): boolean {
  if (state.phase !== "question") return false;
  if (state.roundIndex >= FINAL_ROUND_INDEX) return false; // never on the 0.5%
  return state.settings.mode === "highscore" || state.passesRemaining > 0;
}

/** True when the run ended with a place in the Club. */
export function soloJoinedClub(state: ClubSoloState): boolean {
  if (state.phase !== "ended" || state.settings.mode !== "survival") return false;
  return state.winnerEligible && (state.results[FINAL_ROUND_INDEX]?.correct ?? false);
}

/** How far the player got before losing eligibility — for the results copy. */
export function soloReachedTier(state: ClubSoloState): ClubTier | null {
  const stumble = state.results.findIndex((r) => r.eliminatedHere);
  if (stumble === -1) return null;
  return state.results[stumble].difficulty;
}

function startRound(state: ClubSoloState, index: number, now: number): ClubSoloState {
  const seconds = index === FINAL_ROUND_INDEX ? FINAL_INTRO_SECONDS : ROUND_INTRO_SECONDS;
  return {
    ...state,
    phase: "round_intro",
    roundIndex: index,
    phaseEndsAt: now + seconds * 1000,
    questionStartedAt: null,
  };
}

/** Grade the round and move to the reveal. */
function settle(
  state: ClubSoloState,
  outcome: { answer: string | null; passed: boolean },
  now: number
): ClubSoloState {
  const question = soloQuestion(state);
  if (!question || state.phase !== "question") return state;

  const correct = !outcome.passed && outcome.answer !== null && clubAnswerCorrect(question, outcome.answer);
  const timedOut = !outcome.passed && outcome.answer === null;
  const losesRun = state.settings.mode === "survival" && !outcome.passed && !correct;

  const result: SoloRoundResult = {
    questionId: question.id,
    difficulty: question.difficulty,
    answer: outcome.answer,
    correct,
    passed: outcome.passed,
    timedOut,
    timeMs: outcome.answer === null ? null : Math.max(0, now - (state.questionStartedAt ?? now)),
    eliminatedHere: losesRun && state.winnerEligible,
  };

  return {
    ...state,
    phase: "reveal",
    phaseEndsAt: null,
    correctCount: state.correctCount + (correct ? 1 : 0),
    winnerEligible: state.winnerEligible && !losesRun,
    results: [...state.results, result],
  };
}

export function clubSoloReducer(state: ClubSoloState, action: ClubSoloAction): ClubSoloState {
  switch (action.type) {
    case "BEGIN":
      return state.phase === "intro" ? startRound(state, 0, action.now) : state;

    case "SHOW_QUESTION":
      if (state.phase !== "round_intro") return state;
      return {
        ...state,
        phase: "question",
        questionStartedAt: action.now,
        phaseEndsAt: action.now + soloQuestionSeconds(state) * 1000,
      };

    case "LOCK":
      return settle(state, { answer: action.answer, passed: false }, action.now);

    case "PASS": {
      if (!soloCanPass(state)) return state;
      const spent = state.settings.mode === "survival" ? state.passesRemaining - 1 : state.passesRemaining;
      return settle({ ...state, passesRemaining: spent }, { answer: null, passed: true }, action.now);
    }

    case "TIME_UP":
      return settle(state, { answer: null, passed: false }, action.now);

    case "NEXT":
      if (state.phase !== "reveal") return state;
      if (state.roundIndex + 1 >= CLUB_ROUND_COUNT) {
        return { ...state, phase: "ended", phaseEndsAt: null };
      }
      return startRound(state, state.roundIndex + 1, action.now);

    case "RESTART":
      return initialSoloState(state.settings, action.questions);

    default:
      return state;
  }
}
