import type {
  FlashCardSet,
  FlashCardRound,
  FlashCardQuestion,
  StudyResults,
  StudySetupState,
  GamepadState,
  Player,
} from './types';

export const APP_VERSION = 'v0.5.1';

export let sets: FlashCardSet[] = [];
export let currentSetId: number | null = null;

export let studyCards: FlashCardSet['cards'] = [];
export let currentCardIndex = 0;
export let currentQuestionIndex = 0;
export let studyResults: StudyResults = { correct: 0, wrong: 0, points: 0, cards: [] };
export let progressiveMode = false;
export let currentCardQuestions: FlashCardQuestion[] = [];
export let currentCardQuestionsForCardIndex = -1;
export let shownQuestions: FlashCardQuestion[] = [];

export let moderatorMode = false;
export let players: Player[] = [];

export let rounds: FlashCardRound[] = [];

export let lastStudySetupState: StudySetupState = {
  setIndex: '',
  roundId: '',
  progressive: false,
  moderator: false,
};

export const gamepadState: GamepadState = {
  connected: false,
  gamepad: null,
  previousButtons: [],
  previousAxes: [],
  lastButtonPress: 0,
  buttonDebounceDelay: 200,
  navigationIndex: 0,
  navigationElements: [],
  wiiu: false,
  wiiuLastDpad: 0,
};

// ── Setters for module-scoped state ────────────────────────────────────────

export function setSets(val: FlashCardSet[]): void {
  sets = val;
}
export function setCurrentSetId(val: number | null): void {
  currentSetId = val;
}
export function setStudyCards(val: FlashCardSet['cards']): void {
  studyCards = val;
}
export function setCurrentCardIndex(val: number): void {
  currentCardIndex = val;
}
export function setCurrentQuestionIndex(val: number): void {
  currentQuestionIndex = val;
}
export function setStudyResults(val: StudyResults): void {
  studyResults = val;
}
export function setProgressiveMode(val: boolean): void {
  progressiveMode = val;
}
export function setCurrentCardQuestions(val: FlashCardQuestion[]): void {
  currentCardQuestions = val;
}
export function setCurrentCardQuestionsForCardIndex(val: number): void {
  currentCardQuestionsForCardIndex = val;
}
export function setShownQuestions(val: FlashCardQuestion[]): void {
  shownQuestions = val;
}
export function setModeratorMode(val: boolean): void {
  moderatorMode = val;
}
export function setPlayers(val: Player[]): void {
  players = val;
}
export function setRounds(val: FlashCardRound[]): void {
  rounds = val;
}
export function setLastStudySetupState(val: StudySetupState): void {
  lastStudySetupState = val;
}
