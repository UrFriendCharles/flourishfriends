export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "learning";
export type Collection =
  | "world"
  | "usStates"
  | "usCapitals"
  | "worldCapitals"
  | "worldShapes"
  | "everything";
export type AnswerStyle = "choices" | "typed";
export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania";

export interface Country {
  id: string;
  country: string;
  officialName: string;
  countryCode: string; // lowercase ISO 3166-1 alpha-2, matches /flags/{code}.svg
  continent: Continent;
  region: string;
  capital: string;
  languages: string[];
  populationRange: string;
  landlocked: boolean;
  neighbors: string[];
  flagFact: string;
  funFacts: string[];
  difficulty: Difficulty;
  confusableWith: string[];
}

export type HintKey = "continent" | "region" | "geography" | "flagFact" | "funFact" | "flag";

export interface Question {
  id: string;
  countryId: string;
  flagImage: string; // flag SVG, or state silhouette for capital questions
  correctAnswer: string;
  choices: string[];
  /**
   * What's being guessed / shown. "capital" = guess the capital (from a state
   * silhouette or a country flag); "shape" = guess the country from its map
   * outline (flag + fact available as clues); default "flag".
   */
  kind?: "flag" | "capital" | "shape";
  /** image is a state silhouette (transparent, no frame) rather than a flag */
  silhouette?: boolean;
  /** question line shown to players (easy capitals name the place, harder don't) */
  prompt?: string;
}

export interface PlayerAnswer {
  choice: string;
  correct: boolean;
  timeMs: number; // time from question shown to lock-in
  hintsUsed: number;
  pointsEarned: number;
}

export interface Player {
  id: string;
  name: string;
  color: string; // tailwind-friendly hex
  score: number;
  streak: number;
  bestStreak: number;
  fiftyFiftyUsed: boolean;
  crowdUsed: boolean;
  // per-question, keyed by question index (tie-breakers use tb-N keys)
  answers: Record<string, PlayerAnswer>;
}

export type Screen =
  | "home"
  | "howToPlay"
  | "highScores"
  | "playerSetup"
  | "gameSetup"
  | "passDevice"
  | "question"
  | "reveal"
  | "results";

export interface GameSettings {
  mode: GameMode;
  collection: Collection;
  answerStyle: AnswerStyle;
  difficulty: Difficulty;
  questionCount: number; // 10 | 15 | 25 | custom
  timerSeconds: number | null; // null = no timer
  hintsEnabled: boolean;
  lifelinesEnabled: boolean;
  speedBonusEnabled: boolean;
  continents: Continent[]; // empty = all
}

export interface QuestionRuntime {
  hintsRevealed: HintKey[]; // for the active player (learning mode)
  removedChoices: string[]; // via 50:50, for the active player
  crowdVotes: Record<string, number> | null; // via Ask the Crowd, for the active player
  shownAt: number; // epoch ms when active player started viewing
}

export interface TieBreakerState {
  playerIds: string[]; // players still tied
  round: number;
}

export interface GameState {
  screen: Screen;
  settings: GameSettings;
  players: Player[];
  questions: Question[];
  currentQuestionIndex: number;
  activePlayerIndex: number; // whose turn to answer (pass-and-play)
  questionRuntime: QuestionRuntime;
  tieBreaker: TieBreakerState | null;
  tieBreakerQuestions: Question[];
  tieBreakerWinnerId: string | null;
  finishedAt: number | null;
}

export interface ScoreShare {
  shareId: string; // unique ID for URL
  playerName: string;
  score: number;
  accuracy: number; // 0-100
  bestStreak: number;
  totalQuestions: number;
  correctAnswers: number;
  difficulty: Difficulty;
  mode: GameMode;
  collection: Collection;
  timerUsed: boolean;
  typed: boolean;
  createdAt: number; // epoch ms
}

export interface HighScoreEntry {
  playerName: string;
  score: number;
  accuracy: number; // 0-100
  bestStreak: number;
  date: string; // ISO
  mode: GameMode;
  difficulty: Difficulty;
  questionCount: number;
  timed: boolean;
  collection?: Collection; // absent in entries recorded before quiz packs existed
  typed?: boolean;
}

export interface GameHistoryEntry {
  date: string;
  mode: GameMode;
  difficulty: Difficulty;
  questionCount: number;
  winnerName: string;
  scores: { name: string; score: number }[];
}
