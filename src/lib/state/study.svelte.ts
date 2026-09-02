import { expandAnswerVariations } from '$lib/domain/answers';
import { shuffle } from '$lib/domain/utils';
import { tryGamepadVibration } from '$lib/domain/utils';
import type {
  FlashCard,
  FlashCardQuestion,
  Player,
  StudyResults,
  StudySetupState,
} from '$lib/types';
import { setsStore } from './sets.svelte';

function normalizeQuestions(card: FlashCard): FlashCardQuestion[] {
  const raw = Array.isArray(card.questions) && card.questions.length ? card.questions : [{ text: '', order: 1 }];
  return raw.map((q, i) =>
    typeof q === 'string'
      ? { text: q as string, order: i + 1 }
      : { text: q.text || '', order: q.order || i + 1 },
  );
}

class StudyStore {
  cards = $state<FlashCard[]>([]);
  index = $state(0);
  questionIndex = $state(0);
  results = $state<StudyResults>({ correct: 0, wrong: 0, points: 0, cards: [] });
  progressive = $state(false);
  moderator = $state(false);
  players = $state<Player[]>([]);
  shownQuestions = $state<FlashCardQuestion[]>([]);
  currentQuestions = $state<FlashCardQuestion[]>([]);
  questionsForIndex = $state(-1);
  flipped = $state(false);
  animating = $state<'none' | 'out' | 'in'>('none');
  reviewIndex = $state<number | null>(null);
  lastSetup = $state<StudySetupState>({
    setId: '',
    roundId: '',
    progressive: false,
    moderator: false,
  });
  newPlayerName = $state('');
  transitioning = $state(false);

  get current(): FlashCard | undefined {
    return this.cards[this.index];
  }

  get done(): boolean {
    return this.index >= this.cards.length && this.cards.length > 0;
  }

  get questionText(): string {
    if (this.progressive) {
      return this.shownQuestions.map((q, i) => `[Q${i + 1}] ${q.text}`).join(' ');
    }
    return this.shownQuestions[0]?.text ?? '';
  }

  get expandedAnswers(): string[] {
    const card = this.current;
    if (!card) return [];
    return expandAnswerVariations(card.answer || '');
  }

  get primaryAnswer(): string {
    const expanded = this.expandedAnswers;
    return expanded.length > 0 ? expanded[0] : this.current?.answer || '';
  }

  get canHint(): boolean {
    return this.progressive && this.questionIndex < this.currentQuestions.length && !this.flipped;
  }

  get progress(): number {
    if (!this.cards.length) return 0;
    return Math.round(((Math.min(this.index, this.cards.length - 1) + 1) / this.cards.length) * 100);
  }

  rememberSetup(setup: StudySetupState): void {
    this.lastSetup = setup;
  }

  start(setup: StudySetupState): string | null {
    const set = setsStore.byId(setup.setId);
    if (!set) return 'Please select a set';

    let cards = [...set.cards];
    if (setup.roundId) {
      cards = cards.filter((c) => c.roundId === setup.roundId);
      if (cards.length === 0) return 'No cards found in the selected round';
    }

    this.rememberSetup(setup);
    this.progressive = setup.progressive;
    this.moderator = setup.moderator;
    this.cards = shuffle(cards);
    this.index = 0;
    this.questionIndex = setup.progressive ? 1 : 0;
    this.shownQuestions = [];
    this.currentQuestions = [];
    this.questionsForIndex = -1;
    this.results = { correct: 0, wrong: 0, points: 0, cards: [] };
    this.flipped = false;
    this.animating = 'none';
    this.reviewIndex = null;
    if (setup.moderator) {
      this.players = this.players.map((p) => ({ ...p, score: 0 }));
    }
    this.prepareCard();
    return null;
  }

  prepareCard(): void {
    const card = this.current;
    if (!card) return;
    const questions = normalizeQuestions(card);

    if (this.progressive) {
      if (this.questionsForIndex !== this.index) {
        this.currentQuestions = [...questions]
          .sort((a, b) => a.order - b.order)
          .map((q, i) => ({ ...q, order: i + 1 }));
        this.questionsForIndex = this.index;
      }
      this.shownQuestions = this.currentQuestions.slice(0, this.questionIndex);
    } else {
      const q = questions[Math.floor(Math.random() * questions.length)];
      this.shownQuestions = [q];
      this.currentQuestions = questions;
    }
    this.flipped = false;
  }

  flip(): void {
    this.flipped = true;
    tryGamepadVibration({ duration: 40, weak: 0.3, strong: 0.3 });
  }

  hint(): void {
    if (!this.canHint) return;
    this.questionIndex += 1;
    this.shownQuestions = this.currentQuestions.slice(0, this.questionIndex);
  }

  mark(isCorrect: boolean): void {
    const card = this.current;
    if (!card) return;
    this.reviewIndex = null;
    this.results = {
      ...this.results,
      correct: this.results.correct + (isCorrect ? 1 : 0),
      wrong: this.results.wrong + (isCorrect ? 0 : 1),
      points: this.results.points + (isCorrect ? 1 : 0),
      cards: [...this.results.cards, { card, result: isCorrect ? 'correct' : 'wrong', question: this.questionText }],
    };
    tryGamepadVibration(
      isCorrect ? { duration: 80, weak: 0.5, strong: 0.5 } : { duration: 180, weak: 1, strong: 1 },
    );
    this.advance();
  }

  moderatorNext(): void {
    if (this.transitioning) return;
    const card = this.current;
    if (!card) return;
    this.reviewIndex = null;
    this.results = {
      ...this.results,
      correct: this.results.correct + 1,
      cards: [...this.results.cards, { card, result: 'correct', question: this.questionText }],
    };
    this.advance(true);
  }

  private advance(moderator = false): void {
    this.flipped = false;
    this.animating = 'out';
    this.transitioning = true;
    const delay = moderator ? 350 : 600;
    setTimeout(() => {
      this.index += 1;
      this.questionIndex = this.progressive ? 1 : 0;
      this.shownQuestions = [];
      this.currentQuestions = [];
      this.questionsForIndex = -1;
      if (this.index < this.cards.length) {
        this.prepareCard();
        this.animating = 'in';
        setTimeout(() => {
          this.animating = 'none';
          this.transitioning = false;
        }, delay);
      } else {
        this.animating = 'none';
        this.transitioning = false;
      }
    }, delay);
  }

  addPlayer(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return 'Enter a player name';
    if (this.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return 'Player already added';
    }
    this.players = [...this.players, { name: trimmed, score: 0 }];
    this.newPlayerName = '';
    return null;
  }

  removePlayer(idx: number): void {
    this.players = this.players.filter((_, i) => i !== idx);
  }

  award(idx: number): void {
    if (idx < 0 || idx >= this.players.length) return;
    this.players = this.players.map((p, i) => (i === idx ? { ...p, score: p.score + 1 } : p));
  }

  openReview(idx: number): void {
    if (idx < 0 || idx >= this.results.cards.length) return;
    this.reviewIndex = idx;
  }

  closeReview(): void {
    this.reviewIndex = null;
  }
}

export const study = new StudyStore();
