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

export interface StudySetupState {
  setIndex: string;
  roundId: string;
  progressive: boolean;
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

declare global {
  interface Window {
    jspdf?: { jsPDF: typeof import('jspdf').jsPDF };
    wiiu?: { gamepad?: WiiUGamepad };
  }
  const bundledSetsData: FlashCardSet[] | undefined;
}

export interface WiiUGamepad {
  update?: () => void;
  leftStickX?: number;
  leftStickY?: number;
}
