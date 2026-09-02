export interface FlashCardQuestion {
  text: string;
  order: number;
}

export interface FlashCard {
  questions: FlashCardQuestion[];
  answer: string;
  hints?: string[];
  doNotAccept?: string;
  image?: string;
  roundId?: string | null;
}

export interface FlashCardRound {
  id: string;
  number: number;
}

export interface FlashCardSet {
  id: string;
  name: string;
  cards: FlashCard[];
  year?: number | string | null;
  creator?: string | null;
  subject?: string | null;
  color?: string | null;
  rounds?: FlashCardRound[];
  bundled?: boolean;
  bundledFileName?: string;
}

export interface CardResult {
  card: FlashCard;
  result: 'correct' | 'wrong';
  question: string;
}

export interface StudyResults {
  correct: number;
  wrong: number;
  points: number;
  cards: CardResult[];
}

export interface Player {
  name: string;
  score: number;
}

export interface StudySetupState {
  setId: string;
  roundId: string;
  progressive: boolean;
  moderator: boolean;
}

export interface GamepadState {
  connected: boolean;
  gamepad: Gamepad | null;
  previousButtons: boolean[];
  previousAxes: number[];
  lastButtonPress: number;
  buttonDebounceDelay: number;
  navigationIndex: number;
  navigationElements: HTMLElement[];
  wiiu: boolean;
  wiiuLastDpad: number;
}

export type ThemeName = 'dark' | 'light' | 'ocean' | 'forest' | 'sunset';

export const THEMES: ThemeName[] = ['dark', 'light', 'ocean', 'forest', 'sunset'];

export const THEME_META_COLORS: Record<ThemeName, string> = {
  dark: '#0a0a0a',
  light: '#1a1a1a',
  ocean: '#0d2137',
  forest: '#0f1f14',
  sunset: '#2d1b2e',
};

export const APP_VERSION = 'v1.0.0';

declare global {
  interface Window {
    jspdf?: { jsPDF: typeof import('jspdf').jsPDF };
    wiiu?: { gamepad?: WiiUGamepad };
  }
}

export interface WiiUGamepad {
  update?: () => void;
  leftStickX?: number;
  leftStickY?: number;
}
