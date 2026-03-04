import {
  sets,
  studyCards,
  currentCardIndex,
  currentQuestionIndex,
  studyResults,
  progressiveMode,
  moderatorMode,
  players,
  currentCardQuestions,
  currentCardQuestionsForCardIndex,
  shownQuestions,
  setStudyCards,
  setCurrentCardIndex,
  setCurrentQuestionIndex,
  setStudyResults,
  setProgressiveMode,
  setModeratorMode,
  setPlayers,
  setCurrentCardQuestions,
  setCurrentCardQuestionsForCardIndex,
  setShownQuestions,
} from './state';
import { ViewId } from './constants';
import { escapeHtml, tryGamepadVibration, el } from './utils';
import { expandAnswerVariations } from './answers';
import { sanitizeImageHtml } from './sanitize';
import { showToast } from './toast';
import { showView } from './views';
import { showResults } from './results';
import { populateSetOptions, populateRoundOptions } from './select-helpers';
import type { FlashCardQuestion } from './types';

// ── Setup helpers ──────────────────────────────────────────────────────────

export function populateSetSelect(): void {
  populateSetOptions('selectedSet');
  updateRoundSelect();
}

export function updateRoundSelect(): void {
  populateRoundOptions('selectedSet', 'selectedRound', 'roundSelectGroup');
}

// ── Start study ────────────────────────────────────────────────────────────

export function startStudy(): void {
  const select = el<HTMLSelectElement>('selectedSet');
  const roundSelect = el<HTMLSelectElement>('selectedRound');
  setProgressiveMode((el('progressiveMode') as HTMLInputElement).checked);
  setModeratorMode((el('moderatorMode') as HTMLInputElement).checked);

  if (select.value === '') {
    showToast('Please select a set', 'warning');
    return;
  }

  const set = sets[parseInt(select.value, 10)];
  let cards = [...set.cards];
  const roundId = roundSelect.value;

  if (roundId) {
    cards = cards.filter((c) => c.roundId === roundId);
    if (cards.length === 0) {
      showToast('No cards found in the selected round', 'warning');
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

  if (moderatorMode) {
    setPlayers(players.map((p) => ({ ...p, score: 0 })));
  }

  showView(ViewId.STUDY);
  renderProgressTimeline();
  applyModeratorLayout();

  if (moderatorMode) {
    updateModeratorCard();
  } else {
    updateStudyCard();
  }
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
  const progress = Math.round(((currentCardIndex + 1) / studyCards.length) * 100);
  el('progressText').textContent = `Card ${currentCardIndex + 1} of ${studyCards.length}`;
  const timeline = document.getElementById('progressTimeline');
  if (timeline) timeline.setAttribute('aria-valuenow', String(progress));
  updateProgressDots();

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
    const html = sanitizeImageHtml(image);
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
  closeReview();
  const card = studyCards[currentCardIndex];

  let questionText = '';
  if (progressiveMode) {
    questionText = shownQuestions.map((q) => q.text).join(' ');
  } else {
    questionText = el('questionText').textContent || '';
  }

  setStudyResults({
    ...studyResults,
    correct: studyResults.correct + (isCorrect ? 1 : 0),
    wrong: studyResults.wrong + (isCorrect ? 0 : 1),
    points: studyResults.points + (isCorrect ? 1 : 0),
    cards: [...studyResults.cards, { card, result: isCorrect ? 'correct' : 'wrong', question: questionText }],
  });

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

// ── Progress timeline ───────────────────────────────────────────────────

function renderProgressTimeline(): void {
  const timeline = document.getElementById('progressTimeline');
  if (!timeline) return;
  timeline.innerHTML = '';

  const total = studyCards.length;
  timeline.classList.toggle('compact', total > 15);
  timeline.classList.toggle('ultra-compact', total > 30);

  for (let i = 0; i < total; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'progress-dot-wrapper';

    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.dataset.index = String(i);
    dot.setAttribute('aria-label', `Card ${i + 1}`);

    wrapper.appendChild(dot);
    timeline.appendChild(wrapper);
  }

  timeline.addEventListener('click', onTimelineDotClick);
}

function updateProgressDots(): void {
  const timeline = document.getElementById('progressTimeline');
  if (!timeline) return;

  const wrappers = timeline.querySelectorAll<HTMLElement>('.progress-dot-wrapper');
  const dots = timeline.querySelectorAll<HTMLElement>('.progress-dot');
  const results = studyResults.cards;

  dots.forEach((dot, i) => {
    const wrapper = wrappers[i];
    dot.classList.remove('current', 'completed', 'wrong');
    wrapper.classList.remove('current', 'completed');

    if (i < results.length) {
      dot.classList.add('completed');
      wrapper.classList.add('completed');
      if (results[i].result === 'wrong') dot.classList.add('wrong');
    } else if (i === currentCardIndex) {
      dot.classList.add('current');
      wrapper.classList.add('current');
    }
  });
}

function onTimelineDotClick(e: Event): void {
  const dot = (e.target as HTMLElement).closest<HTMLElement>('.progress-dot');
  if (!dot || !dot.classList.contains('completed')) return;

  const idx = parseInt(dot.dataset.index || '', 10);
  if (isNaN(idx) || idx >= studyResults.cards.length) return;

  const cr = studyResults.cards[idx];
  const expanded = expandAnswerVariations(cr.card.answer || '');
  const primary = expanded.length > 0 ? expanded[0] : cr.card.answer || '';

  el('reviewTitle').textContent = `Card ${idx + 1}`;
  el('reviewQuestion').textContent = cr.question;
  el('reviewAnswer').textContent = primary;

  const badge = el('reviewBadge');
  badge.className = `review-badge ${cr.result}`;
  badge.textContent = cr.result === 'correct' ? '✓ Correct' : '✗ Wrong';

  const overlay = el('reviewOverlay');
  overlay.style.display = 'flex';
}

export function closeReview(): void {
  el('reviewOverlay').style.display = 'none';
}

// ── Moderator mode ──────────────────────────────────────────────────────

function applyModeratorLayout(): void {
  const modView = document.getElementById('moderatorView');
  const cardContainer = document.querySelector<HTMLElement>('.card-container');
  const studyActions = document.querySelector<HTMLElement>('.study-actions');

  const tts = document.querySelector<HTMLElement>('.study-read-controls');

  if (moderatorMode) {
    if (cardContainer) cardContainer.style.display = 'none';
    if (studyActions) studyActions.style.display = 'none';
    if (modView) modView.style.display = 'flex';
    if (tts) tts.style.display = 'none';
    renderModeratorPlayers();
    setupModeratorSwipe();
  } else {
    if (cardContainer) cardContainer.style.display = '';
    if (studyActions) studyActions.style.display = '';
    if (modView) modView.style.display = 'none';
    if (tts) tts.style.display = '';
  }
}

function setupModeratorSwipe(): void {
  const qaSection = document.querySelector<HTMLElement>('.mod-qa-section');
  if (!qaSection) return;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  qaSection.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
  }, { passive: true });

  qaSection.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // If horizontal swipe is dominant, hint with partial transform
    if (Math.abs(dx) > Math.abs(dy) && dx < -10) {
      e.preventDefault();
      const clamped = Math.max(dx, -200);
      qaSection.style.transform = `translateX(${clamped}px)`;
      qaSection.style.opacity = String(Math.max(1 + clamped / 300, 0.3));
    }
  }, { passive: false });

  qaSection.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;

    qaSection.style.transform = '';
    qaSection.style.opacity = '';

    const SWIPE_THRESHOLD = 80;
    if (dx < -SWIPE_THRESHOLD) {
      moderatorNext();
    }
  });
}

function updateModeratorCard(): void {
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

  let questionDisplay: string;
  if (progressiveMode) {
    if (currentCardQuestionsForCardIndex !== currentCardIndex) {
      const sorted = [...questions]
        .sort((a, b) => a.order - b.order)
        .map((q, i) => ({ ...q, order: i + 1 }));
      setCurrentCardQuestions(sorted);
      setCurrentCardQuestionsForCardIndex(currentCardIndex);
    }
    setShownQuestions(currentCardQuestions.slice(0, currentQuestionIndex));
    questionDisplay = shownQuestions.map((q, i) => `[Q${i + 1}] ${q.text}`).join(' ');

    const modHintBtn = document.getElementById('modHintBtn');
    if (modHintBtn) modHintBtn.style.display = currentQuestionIndex < currentCardQuestions.length ? 'inline-flex' : 'none';
  } else {
    const q = questions[Math.floor(Math.random() * questions.length)];
    questionDisplay = q.text;
    const modHintBtn = document.getElementById('modHintBtn');
    if (modHintBtn) modHintBtn.style.display = 'none';
  }

  const modQ = document.getElementById('modQuestionText');
  const modA = document.getElementById('modAnswerText');
  if (modQ) modQ.textContent = questionDisplay;

  const expanded = expandAnswerVariations(card.answer || '');
  const primary = expanded.length > 0 ? expanded[0] : card.answer || '';
  if (modA) modA.textContent = primary;

  const modHints = document.getElementById('modHints');
  if (modHints) {
    const hints = card.hints || [];
    modHints.textContent = hints.length > 0 ? `Hints: ${hints.join(' • ')}` : '';
  }

  const modDna = document.getElementById('modDoNotAccept');
  if (modDna) {
    const dna = card.doNotAccept || '';
    modDna.textContent = dna ? `DO NOT ACCEPT: ${dna}` : '';
  }

  const modAccepted = document.getElementById('modAccepted');
  if (modAccepted) {
    if (expanded.length > 1) {
      modAccepted.textContent = `Also accepted: ${expanded.slice(1).join(', ')}`;
    } else {
      modAccepted.textContent = '';
    }
  }

  const modImg = document.getElementById('modImage');
  if (modImg) {
    if (card.image?.trim()) {
      modImg.innerHTML = sanitizeImageHtml(card.image);
      modImg.style.display = 'block';
    } else {
      modImg.innerHTML = '';
      modImg.style.display = 'none';
    }
  }

  // Progress
  const progress = Math.round(((currentCardIndex + 1) / studyCards.length) * 100);
  el('progressText').textContent = `Card ${currentCardIndex + 1} of ${studyCards.length}`;
  const timeline = document.getElementById('progressTimeline');
  if (timeline) timeline.setAttribute('aria-valuenow', String(progress));
  updateProgressDots();
}

let modTransitioning = false;

export function moderatorNext(): void {
  if (modTransitioning) return;
  if (currentCardIndex >= studyCards.length) return;

  closeReview();
  const card = studyCards[currentCardIndex];

  let questionText = '';
  if (progressiveMode) {
    questionText = shownQuestions.map((q) => q.text).join(' ');
  } else {
    const modQ = document.getElementById('modQuestionText');
    questionText = modQ?.textContent || '';
  }

  setStudyResults({
    ...studyResults,
    correct: studyResults.correct + 1,
    cards: [...studyResults.cards, { card, result: 'correct', question: questionText }],
  });

  setCurrentCardIndex(currentCardIndex + 1);
  setCurrentQuestionIndex(progressiveMode ? 1 : 0);
  setShownQuestions([]);
  setCurrentCardQuestions([]);
  setCurrentCardQuestionsForCardIndex(-1);

  const qaSection = document.querySelector<HTMLElement>('.mod-qa-section');
  if (!qaSection) {
    updateModeratorCard();
    return;
  }

  modTransitioning = true;
  qaSection.classList.add('mod-slide-out');

  qaSection.addEventListener('animationend', function onOut() {
    qaSection.removeEventListener('animationend', onOut);
    qaSection.classList.remove('mod-slide-out');
    updateModeratorCard();
    qaSection.classList.add('mod-slide-in');

    qaSection.addEventListener('animationend', function onIn() {
      qaSection.removeEventListener('animationend', onIn);
      qaSection.classList.remove('mod-slide-in');
      modTransitioning = false;
    });
  });
}

export function moderatorHint(): void {
  if (progressiveMode && currentQuestionIndex < currentCardQuestions.length) {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
    setShownQuestions(currentCardQuestions.slice(0, currentQuestionIndex));
    updateModeratorCard();
  }
}

export function awardPoint(playerIdx: number): void {
  if (playerIdx < 0 || playerIdx >= players.length) return;

  setPlayers(players.map((p, i) => (i === playerIdx ? { ...p, score: p.score + 1 } : p)));
  renderModeratorPlayers();

  const row = document.querySelector<HTMLElement>(`.mod-player-row[data-pidx="${playerIdx}"]`);
  if (row) {
    row.classList.add('just-scored');
    setTimeout(() => row.classList.remove('just-scored'), 400);
  }
}

function renderModeratorPlayers(): void {
  const list = document.getElementById('modPlayersList');
  if (!list) return;
  list.innerHTML = players
    .map(
      (p, i) =>
        `<div class="mod-player-row" data-pidx="${i}">
          <span class="mod-player-name">${escapeHtml(p.name)}</span>
          <span class="mod-player-score-badge">${p.score}</span>
          <div class="mod-player-actions">
            <button type="button" class="mod-award-btn" data-pidx="${i}" title="Award point">+1</button>
            <button type="button" class="mod-remove-player-btn" data-pidx="${i}" aria-label="Remove ${escapeHtml(p.name)}">&times;</button>
          </div>
        </div>`,
    )
    .join('');
}

export function addModeratorPlayer(): void {
  const input = document.getElementById('modPlayerNameInput') as HTMLInputElement | null;
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Player already added', 'warning');
    return;
  }
  setPlayers([...players, { name, score: 0 }]);
  input.value = '';
  renderModeratorPlayers();
  input.focus();
}

export function removeModeratorPlayer(idx: number): void {
  setPlayers(players.filter((_, i) => i !== idx));
  renderModeratorPlayers();
}
