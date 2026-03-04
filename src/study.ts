import {
  sets,
  studyCards,
  currentCardIndex,
  currentQuestionIndex,
  studyResults,
  progressiveMode,
  currentCardQuestions,
  currentCardQuestionsForCardIndex,
  shownQuestions,
  setStudyCards,
  setCurrentCardIndex,
  setCurrentQuestionIndex,
  setStudyResults,
  setProgressiveMode,
  setCurrentCardQuestions,
  setCurrentCardQuestionsForCardIndex,
  setShownQuestions,
} from './state';
import { escapeHtml, tryGamepadVibration, el } from './utils';
import { expandAnswerVariations } from './answers';
import { showView } from './views';
import { showResults } from './results';
import type { FlashCardQuestion } from './types';

// ── Setup helpers ──────────────────────────────────────────────────────────

export function populateSetSelect(): void {
  const select = el<HTMLSelectElement>('selectedSet');
  select.innerHTML = '<option value="">Select a set...</option>';
  sets.forEach((set, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${set.name} (${set.cards.length} cards)`;
    select.appendChild(opt);
  });
  updateRoundSelect();
}

export function updateRoundSelect(): void {
  const select = el<HTMLSelectElement>('selectedSet');
  const roundSelect = el<HTMLSelectElement>('selectedRound');
  const group = el('roundSelectGroup');

  if (select.value === '') {
    group.style.display = 'none';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
    return;
  }

  const set = sets[parseInt(select.value, 10)];
  if (set.rounds?.length) {
    group.style.display = 'block';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
    [...set.rounds].sort((a, b) => a.number - b.number).forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `Round ${r.number}`;
      roundSelect.appendChild(opt);
    });
  } else {
    group.style.display = 'none';
    roundSelect.innerHTML = '<option value="">All Rounds</option>';
  }
}

// ── Start study ────────────────────────────────────────────────────────────

export function startStudy(): void {
  const select = el<HTMLSelectElement>('selectedSet');
  const roundSelect = el<HTMLSelectElement>('selectedRound');
  setProgressiveMode((el('progressiveMode') as HTMLInputElement).checked);

  if (select.value === '') {
    alert('Please select a set');
    return;
  }

  const set = sets[parseInt(select.value, 10)];
  let cards = [...set.cards];
  const roundId = roundSelect.value;

  if (roundId) {
    cards = cards.filter((c) => c.roundId === roundId);
    if (cards.length === 0) {
      alert('No cards found in the selected round');
      return;
    }
  }

  setStudyCards(cards.sort(() => Math.random() - 0.5));
  setCurrentCardIndex(0);
  setCurrentQuestionIndex(progressiveMode ? 1 : 0);
  setShownQuestions([]);
  setCurrentCardQuestions([]);
  setCurrentCardQuestionsForCardIndex(-1);
  setStudyResults({ correct: 0, wrong: 0, points: 0, cards: [] });

  showView('studyView');
  updateStudyCard();
}

// ── Card display ───────────────────────────────────────────────────────────

export function updateStudyCard(animate = false): void {
  if (currentCardIndex >= studyCards.length) {
    showResults();
    return;
  }

  const card = studyCards[currentCardIndex];
  const questions: FlashCardQuestion[] = (
    Array.isArray(card.questions) && card.questions.length ? card.questions : [{ text: '', order: 1 }]
  ).map((q, i) =>
    typeof q === 'string' ? { text: q as string, order: i + 1 } : { text: q.text || '', order: q.order || i + 1 },
  );

  if (progressiveMode) {
    if (currentCardQuestionsForCardIndex !== currentCardIndex) {
      const sorted = [...questions]
        .sort((a, b) => a.order - b.order)
        .map((q, i) => ({ ...q, order: i + 1 }));
      setCurrentCardQuestions(sorted);
      setCurrentCardQuestionsForCardIndex(currentCardIndex);
    }

    setShownQuestions(currentCardQuestions.slice(0, currentQuestionIndex));

    const display = shownQuestions.map((q, i) => `[Q${i + 1}] ${q.text}`).join(' ');
    el('questionText').textContent = display;

    const hintBtn = el('hintButton');
    const flashcard = el('flashcard');
    const flipped = flashcard.classList.contains('flipped');
    hintBtn.style.display =
      !flipped && currentQuestionIndex < currentCardQuestions.length ? 'flex' : 'none';
  } else {
    const q = questions[Math.floor(Math.random() * questions.length)];
    el('hintButton').style.display = 'none';
    el('questionText').textContent = q.text;
  }

  // Hints (question side only)
  const hints = card.hints || [];
  const hintsFront = document.getElementById('hintsFront');
  const hintsBack = document.getElementById('hintsBack');
  if (hintsFront) hintsFront.textContent = hints.length > 0 ? hints.join(' • ') : '';
  if (hintsBack) hintsBack.textContent = '';

  // Do-not-accept (answer side only)
  const dna = card.doNotAccept || '';
  const dnaFront = document.getElementById('doNotAcceptFront');
  const dnaBack = document.getElementById('doNotAcceptBack');
  if (dnaFront) dnaFront.textContent = '';
  if (dnaBack) dnaBack.textContent = dna ? `DO NOT ACCEPT: ${dna}` : '';

  // Image
  renderCardImage(card.image || '');

  // Answer expansion
  const expanded = expandAnswerVariations(card.answer || '');
  const primary = expanded.length > 0 ? expanded[0] : card.answer || '';
  el('answerText').textContent = primary;

  const acceptedList = el('acceptedAnswersList');
  if (expanded.length > 1) {
    acceptedList.innerHTML = `
      <div class="accepted-forms-label">Also accepted:</div>
      <div class="accepted-forms">
        ${expanded.slice(1).map((a) => `<div class="accepted-form-item">${escapeHtml(a)}</div>`).join('')}
      </div>`;
  } else {
    acceptedList.innerHTML = '';
  }

  const flashcard = el('flashcard');
  flashcard.classList.remove('flipped');
  el('flipCardBtn').style.display = 'block';
  el('answerButtons').style.display = 'none';

  // Progress
  const progress = ((currentCardIndex + 1) / studyCards.length) * 100;
  el('progressText').textContent = `Card ${currentCardIndex + 1} of ${studyCards.length}`;
  el<HTMLDivElement>('progressFill').style.width = `${progress}%`;

  // Fade animation for random mode question change
  if (!progressiveMode && animate) {
    const qEl = el('questionText');
    qEl.style.opacity = '0';
    qEl.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      qEl.style.opacity = '1';
    }, 150);
  }
}

function renderCardImage(image: string): void {
  const frontImg = el('cardImageFront');
  const backImg = el('cardImageBack');
  const front = document.querySelector('.card-front')!;
  const back = document.querySelector('.card-back')!;

  if (image?.trim()) {
    const trimmed = image.trim();
    let html: string;
    if (trimmed.startsWith('<svg')) {
      html = trimmed;
    } else if (trimmed.startsWith('data:image/')) {
      html = `<img src="${escapeHtml(trimmed)}" alt="Card image" class="card-image-content">`;
    } else {
      html = trimmed;
    }
    frontImg.innerHTML = html;
    frontImg.style.display = 'flex';
    backImg.innerHTML = html;
    backImg.style.display = 'flex';
    front.classList.add('has-image');
    back.classList.add('has-image');
  } else {
    frontImg.innerHTML = '';
    frontImg.style.display = 'none';
    backImg.innerHTML = '';
    backImg.style.display = 'none';
    front.classList.remove('has-image');
    back.classList.remove('has-image');
  }
}

// ── Flip / Answer / Hint ───────────────────────────────────────────────────

export function flipCard(): void {
  el('flashcard').classList.add('flipped');
  el('flipCardBtn').style.display = 'none';
  el('answerButtons').style.display = 'flex';
  el('hintButton').style.display = 'none';
  tryGamepadVibration({ duration: 40, weak: 0.3, strong: 0.3 });
}

export function markAnswer(isCorrect: boolean): void {
  const card = studyCards[currentCardIndex];

  let questionText = '';
  if (progressiveMode) {
    questionText = shownQuestions.map((q) => q.text).join(' ');
  } else {
    questionText = el('questionText').textContent || '';
  }

  studyResults.cards.push({ card, result: isCorrect ? 'correct' : 'wrong', question: questionText });

  if (isCorrect) {
    studyResults.correct++;
    studyResults.points += 1;
  } else {
    studyResults.wrong++;
  }

  tryGamepadVibration(
    isCorrect ? { duration: 80, weak: 0.5, strong: 0.5 } : { duration: 180, weak: 1, strong: 1 },
  );

  setCurrentCardIndex(currentCardIndex + 1);
  setCurrentQuestionIndex(progressiveMode ? 1 : 0);
  setShownQuestions([]);
  setCurrentCardQuestions([]);
  setCurrentCardQuestionsForCardIndex(-1);

  const flashcard = el('flashcard');
  flashcard.classList.remove('flipped');
  flashcard.classList.add('slide-out');

  setTimeout(() => {
    updateStudyCard();
    flashcard.classList.remove('slide-out');
    flashcard.classList.add('slide-in');
    setTimeout(() => flashcard.classList.remove('slide-in'), 600);
  }, 600);
}

export function askForHint(): void {
  if (progressiveMode && currentQuestionIndex < currentCardQuestions.length) {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
    setShownQuestions(currentCardQuestions.slice(0, currentQuestionIndex));
    updateStudyCard(true);
  }
}
