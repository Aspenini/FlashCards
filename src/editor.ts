import {
  sets,
  setSets,
  currentSetId,
  setCurrentSetId,
  rounds,
  setRounds,
} from './state';
import { ViewId } from './constants';
import { escapeHtml, parseYearInput, el } from './utils';
import { showToast, showConfirm } from './toast';
import { showView } from './views';
import { saveSets } from './storage';
import { renderSets } from './render';
import { renderRounds } from './rounds';
import { setupImageFileHandler } from './image';
import type { FlashCardQuestion } from './types';

export { toggleRounds, addRound, setupRoundListDelegation } from './rounds';

// ── Create / open ──────────────────────────────────────────────────────────

export function openCreateSet(): void {
  setCurrentSetId(null);
  showView(ViewId.EDITOR);
  el('editorTitle').textContent = 'Create New Set';
  el<HTMLButtonElement>('deleteSetBtn').style.display = 'none';
  (el('setName') as HTMLInputElement).value = '';
  (el('setYear') as HTMLInputElement).value = '';
  (el('setCreator') as HTMLInputElement).value = '';
  (el('setSubject') as HTMLInputElement).value = '';
  (el('setColor') as HTMLInputElement).value = '#6b7280';
  (el('setColorText') as HTMLInputElement).value = '';
  el('cardsList').innerHTML = '';
  setRounds([]);
  (el('roundsEnabled') as HTMLInputElement).checked = false;
  el('roundsSection').style.display = 'none';
  el('roundsList').innerHTML = '';
}

export function editSet(index: number): void {
  const set = sets[index];
  if (set.bundled) {
    showToast('Bundled sets cannot be edited. You can only edit sets you created.', 'warning');
    return;
  }
  setCurrentSetId(index);
  showView(ViewId.EDITOR);
  el('editorTitle').textContent = 'Edit Set';
  el<HTMLButtonElement>('deleteSetBtn').style.display = 'block';
  (el('setName') as HTMLInputElement).value = set.name;
  (el('setYear') as HTMLInputElement).value =
    set.year != null && set.year !== '' ? String(set.year) : '';
  (el('setCreator') as HTMLInputElement).value = set.creator || '';
  (el('setSubject') as HTMLInputElement).value = set.subject || '';
  const color =
    set.color && /^#[0-9A-Fa-f]{6}$/.test(String(set.color)) ? String(set.color) : '#6b7280';
  (el('setColor') as HTMLInputElement).value = color;
  (el('setColorText') as HTMLInputElement).value = color;

  if (set.rounds?.length) {
    setRounds([...set.rounds].sort((a, b) => a.number - b.number));
    (el('roundsEnabled') as HTMLInputElement).checked = true;
    el('roundsSection').style.display = 'block';
    renderRounds();
  } else {
    setRounds([]);
    (el('roundsEnabled') as HTMLInputElement).checked = false;
    el('roundsSection').style.display = 'none';
    el('roundsList').innerHTML = '';
  }

  const cardsList = el('cardsList');
  cardsList.innerHTML = '';
  set.cards.forEach((card, cardIndex) => {
    let questions: FlashCardQuestion[] = (card.questions || [{ text: '', order: 1 }]).map(
      (q, i) => {
        if (typeof q === 'string') return { text: q as string, order: i + 1 };
        return { text: q.text || '', order: q.order || i + 1 };
      },
    );
    questions.sort((a, b) => a.order - b.order);

    const hints = card.hints || [];
    const hintText = Array.isArray(hints) && hints.length > 0 ? hints[0] : '';
    addCardToEditor(questions, card.answer, hintText, cardIndex, card.roundId ?? null, card.doNotAccept || '', card.image || '');
  });
}

// ── Card editor ────────────────────────────────────────────────────────────

export function addCardToEditor(
  questions: FlashCardQuestion[] = [{ text: '', order: 1 }],
  answer = '',
  hint = '',
  index: number | null = null,
  roundId: string | null = null,
  doNotAccept = '',
  image = '',
): void {
  const cardsList = el('cardsList');
  const cardIndex = index ?? cardsList.children.length;

  if (!Array.isArray(questions) || questions.length === 0) {
    questions = [{ text: '', order: 1 }];
  }

  const sorted = [...questions].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const questionsHtml = sorted
    .map((q, qi) => {
      const text = q.text || '';
      const order = q.order || qi + 1;
      return `
      <div class="question-item" data-question-index="${qi}">
        <div class="question-drag-handle" draggable="true">⋮⋮</div>
        <div class="question-input-wrapper">
          <textarea placeholder="Question ${order}" class="card-question" data-question-order="${order}">${escapeHtml(text)}</textarea>
        </div>
        ${qi > 0 ? '<button class="btn btn-danger btn-tiny" data-card-action="remove-question">×</button>' : ''}
      </div>`;
    })
    .join('');

  let roundDropdownHtml = '';
  const roundsEnabled = (el('roundsEnabled') as HTMLInputElement).checked;
  if (roundsEnabled && rounds.length > 0) {
    const opts = rounds
      .map(
        (r) =>
          `<option value="${r.id}" ${roundId === r.id ? 'selected' : ''}>Round ${r.number}</option>`,
      )
      .join('');
    roundDropdownHtml = `
      <div class="card-round-select-wrapper">
        <label>Round:</label>
        <select class="card-round-select"><option value="">No Round</option>${opts}</select>
      </div>`;
  }

  const cardItem = document.createElement('div');
  cardItem.className = 'card-item';
  cardItem.innerHTML = `
    <div class="card-item-header">
      <span class="card-item-number">Card ${cardIndex + 1}</span>
      <button class="btn btn-danger btn-small" data-card-action="remove-card">Remove</button>
    </div>
    <div class="card-item-inputs">
      ${roundDropdownHtml}
      <div class="questions-section">
        <div class="questions-header">
          <label>Questions (randomly selected during study)</label>
          <button class="btn btn-secondary btn-tiny" data-card-action="add-question">+ Add Question</button>
        </div>
        <div class="questions-list">${questionsHtml}</div>
      </div>
      <textarea placeholder="Answer" class="card-answer">${escapeHtml(answer)}</textarea>
      <div class="answer-syntax-hint">
        <small>Tip: Use (option1/option2) for interchangeable words, [optional] for optional prefixes or suffixes</small>
        <small>Examples: Conservation of (mass/matter), [Law of] Conservation of (mass/matter)</small>
      </div>
      <div class="hints-section">
        <label>Hint (optional, always visible)</label>
        <input type="text" placeholder="Hint (e.g., multi-word answer)" class="card-hint" value="${escapeHtml(hint)}" maxlength="100">
      </div>
      <div class="hints-section">
        <label>DO NOT ACCEPT (optional, always visible)</label>
        <input type="text" placeholder="DO NOT ACCEPT (e.g., incorrect answer variation)" class="card-do-not-accept" value="${escapeHtml(doNotAccept)}" maxlength="100">
      </div>
      <div class="hints-section">
        <label>Image (optional – SVG, JPG, PNG, or WebP)</label>
        <div class="image-input-wrapper">
          <textarea placeholder="Paste SVG code or base64 data URI here, or use file upload below" class="card-image-svg" rows="4">${escapeHtml(image)}</textarea>
          <input type="file" accept=".svg,.jpg,.jpeg,.png,.webp,image/svg+xml,image/jpeg,image/png,image/webp" class="card-image-file" style="margin-top:8px">
          <button type="button" class="btn btn-secondary btn-tiny card-image-clear" style="margin-top:8px">Clear Image</button>
        </div>
      </div>
    </div>`;

  cardsList.appendChild(cardItem);

  cardItem.querySelectorAll<HTMLTextAreaElement>('.card-question').forEach(setupQuestionEnterHandler);
  setupImageFileHandler(cardItem);

  const clearBtn = cardItem.querySelector('.card-image-clear');
  clearBtn?.addEventListener('click', () => {
    const svg = cardItem.querySelector<HTMLTextAreaElement>('.card-image-svg');
    const file = cardItem.querySelector<HTMLInputElement>('.card-image-file');
    if (svg) svg.value = '';
    if (file) file.value = '';
  });
}

// ── Card-level event delegation (wired once in main.ts) ───────────────────

export function setupCardListDelegation(): void {
  el('cardsList').addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-card-action]');
    if (!target) return;
    const action = target.dataset.cardAction;

    if (action === 'remove-card') {
      target.closest('.card-item')?.remove();
      updateCardNumbers();
    } else if (action === 'add-question') {
      addQuestion(target);
    } else if (action === 'remove-question') {
      const list = target.closest('.questions-list');
      if (list && list.children.length > 1) {
        target.closest('.question-item')?.remove();
      } else {
        showToast('Each card must have at least one question', 'warning');
      }
    }
  });
}

function updateCardNumbers(): void {
  document.querySelectorAll('.card-item').forEach((card, i) => {
    const num = card.querySelector('.card-item-number');
    if (num) num.textContent = `Card ${i + 1}`;
  });
}

function setupQuestionEnterHandler(textarea: HTMLTextAreaElement): void {
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const list = textarea.closest('.questions-list')!;
      const items = Array.from(list.querySelectorAll('.question-item'));
      const current = textarea.closest('.question-item')!;
      const idx = items.indexOf(current);

      if (idx < items.length - 1) {
        items[idx + 1].querySelector<HTMLTextAreaElement>('.card-question')?.focus();
      } else {
        const addBtn = textarea
          .closest('.questions-section')
          ?.querySelector<HTMLButtonElement>('[data-card-action="add-question"]');
        if (addBtn) {
          addQuestion(addBtn);
          const newItems = Array.from(list.querySelectorAll('.question-item'));
          newItems[newItems.length - 1]?.querySelector<HTMLTextAreaElement>('.card-question')?.focus();
        }
      }
    }
  });
}

export function addQuestion(button: HTMLElement): void {
  const list = button.closest('.questions-section')!.querySelector('.questions-list')!;
  const items = list.querySelectorAll('.question-item');

  let maxOrder = 0;
  items.forEach((item) => {
    const ta = item.querySelector<HTMLTextAreaElement>('.card-question');
    if (ta) maxOrder = Math.max(maxOrder, parseInt(ta.dataset.questionOrder || '0', 10));
  });
  const next = maxOrder + 1;

  const qi = document.createElement('div');
  qi.className = 'question-item';
  qi.dataset.questionIndex = String(items.length);
  qi.innerHTML = `
    <div class="question-drag-handle" draggable="true">⋮⋮</div>
    <div class="question-input-wrapper">
      <textarea placeholder="Question ${next}" class="card-question" data-question-order="${next}"></textarea>
    </div>
    <button class="btn btn-danger btn-tiny" data-card-action="remove-question">×</button>`;
  list.appendChild(qi);

  const ta = qi.querySelector<HTMLTextAreaElement>('.card-question');
  if (ta) setupQuestionEnterHandler(ta);
}

// ── Save / Delete ──────────────────────────────────────────────────────────

export function saveSet(): void {
  const name = (el('setName') as HTMLInputElement).value.trim();
  if (!name) {
    showToast('Please enter a set name', 'warning');
    return;
  }

  const yearInput = (el('setYear') as HTMLInputElement).value;
  const year = parseYearInput(yearInput);
  if (yearInput.trim() && year === null) {
    showToast('Please enter a valid year (e.g. 2024) or range (e.g. 2024-2025)', 'warning');
    return;
  }

  const creator = (el('setCreator') as HTMLInputElement).value.trim() || null;
  const subject = (el('setSubject') as HTMLInputElement).value.trim() || null;
  const colorText = (el('setColorText') as HTMLInputElement).value.trim();
  const colorPicker = (el('setColor') as HTMLInputElement).value;
  const color = /^#[0-9A-Fa-f]{6}$/.test(colorText) ? colorText : colorPicker || null;

  const cards: import('./types').FlashCard[] = [];
  const roundsEnabled = (el('roundsEnabled') as HTMLInputElement).checked;

  document.querySelectorAll('.card-item').forEach((ci) => {
    const questions: FlashCardQuestion[] = [];
    ci.querySelectorAll<HTMLTextAreaElement>('.card-question').forEach((ta) => {
      const text = ta.value.trim();
      if (text) {
        questions.push({ text, order: parseInt(ta.dataset.questionOrder || '1', 10) });
      }
    });
    questions.sort((a, b) => a.order - b.order);
    questions.forEach((q, i) => (q.order = i + 1));

    const answer = ci.querySelector<HTMLTextAreaElement>('.card-answer')!.value.trim();
    const hint = ci.querySelector<HTMLInputElement>('.card-hint')?.value.trim() || '';
    const dna = ci.querySelector<HTMLInputElement>('.card-do-not-accept')?.value.trim() || '';
    const img = ci.querySelector<HTMLTextAreaElement>('.card-image-svg')?.value.trim() || '';

    let roundIdVal: string | null = null;
    if (roundsEnabled) {
      const rs = ci.querySelector<HTMLSelectElement>('.card-round-select');
      if (rs?.value) roundIdVal = rs.value;
    }

    if (questions.length > 0 && answer) {
      const card: import('./types').FlashCard = { questions, answer };
      if (hint) card.hints = [hint];
      if (dna) card.doNotAccept = dna;
      if (img) card.image = img;
      if (roundIdVal) card.roundId = roundIdVal;
      cards.push(card);
    }
  });

  if (cards.length === 0) {
    showToast('Please add at least one card with a question and answer', 'warning');
    return;
  }

  const setData: import('./types').FlashCardSet = { name, cards };
  if (year) setData.year = year;
  if (creator) setData.creator = creator;
  if (subject) setData.subject = subject;
  if (color && color !== '#6b7280') setData.color = color;
  if (roundsEnabled && rounds.length > 0) setData.rounds = [...rounds];

  if (currentSetId !== null) {
    const existing = sets[currentSetId];
    if (existing?.bundled) {
      setData.bundled = true;
      setData.bundledFileName = existing.bundledFileName;
    }
    setSets(sets.map((s, i) => i === currentSetId ? setData : s));
  } else {
    setSets([...sets, setData]);
  }

  saveSets();
  renderSets();
  showView(ViewId.MAIN);
}

export async function deleteSet(): Promise<void> {
  if (currentSetId === null) return;
  const set = sets[currentSetId];
  if (set.bundled) {
    showToast('Bundled sets cannot be deleted.', 'warning');
    return;
  }
  if (await showConfirm('Are you sure you want to delete this set?')) {
    setSets([...sets.slice(0, currentSetId), ...sets.slice(currentSetId + 1)]);
    saveSets();
    renderSets();
    showView(ViewId.MAIN);
  }
}

export async function deleteSetFromList(index: number): Promise<void> {
  const set = sets[index];
  if (set.bundled) {
    showToast('Bundled sets cannot be deleted.', 'warning');
    return;
  }
  if (await showConfirm('Are you sure you want to delete this set?')) {
    setSets([...sets.slice(0, index), ...sets.slice(index + 1)]);
    saveSets();
    renderSets();
  }
}

export function copyBundledSetToUser(index: number): void {
  const set = sets[index];
  if (!set?.bundled) return;
  const copy: import('./types').FlashCardSet = JSON.parse(JSON.stringify(set));
  delete copy.bundled;
  delete copy.bundledFileName;

  const names = new Set(sets.map((s) => s.name));
  let name = copy.name;
  let n = 0;
  while (names.has(name)) {
    n++;
    name = `${copy.name} (${n})`;
  }
  copy.name = name;
  setSets([...sets, copy]);
  saveSets();
  renderSets();
}
