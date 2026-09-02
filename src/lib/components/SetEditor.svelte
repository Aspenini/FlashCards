<script lang="ts">
  import { goto } from '$app/navigation';
  import { processImageFile } from '$lib/domain/image';
  import { parseYearInput, uid } from '$lib/domain/utils';
  import { setsStore } from '$lib/state/sets.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import type { FlashCard, FlashCardQuestion, FlashCardRound, FlashCardSet } from '$lib/types';

  interface EditorQuestion {
    id: string;
    text: string;
    order: number;
  }
  interface EditorCard {
    id: string;
    questions: EditorQuestion[];
    answer: string;
    hint: string;
    doNotAccept: string;
    image: string;
    roundId: string;
  }

  interface Props {
    existing?: FlashCardSet | null;
  }
  let { existing = null }: Props = $props();

  let name = $state('');
  let year = $state('');
  let creator = $state('');
  let subject = $state('');
  let color = $state('#6b7280');
  let colorText = $state('');
  let roundsEnabled = $state(false);
  let rounds = $state<FlashCardRound[]>([]);
  let cards = $state<EditorCard[]>([]);
  let draggedId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);

  $effect(() => {
    if (existing) loadFrom(existing);
    else reset();
  });

  function emptyCard(): EditorCard {
    return {
      id: uid('card'),
      questions: [{ id: uid('q'), text: '', order: 1 }],
      answer: '',
      hint: '',
      doNotAccept: '',
      image: '',
      roundId: '',
    };
  }

  function reset() {
    name = '';
    year = '';
    creator = '';
    subject = '';
    color = '#6b7280';
    colorText = '';
    roundsEnabled = false;
    rounds = [];
    cards = [];
  }

  function loadFrom(set: FlashCardSet) {
    name = set.name;
    year = set.year != null && set.year !== '' ? String(set.year) : '';
    creator = set.creator || '';
    subject = set.subject || '';
    const c = set.color && /^#[0-9A-Fa-f]{6}$/.test(String(set.color)) ? String(set.color) : '#6b7280';
    color = c;
    colorText = c;
    if (set.rounds?.length) {
      rounds = [...set.rounds].sort((a, b) => a.number - b.number);
      roundsEnabled = true;
    } else {
      rounds = [];
      roundsEnabled = false;
    }
    cards = set.cards.map((card) => {
      let questions: FlashCardQuestion[] = (card.questions || [{ text: '', order: 1 }]).map((q, i) => {
        if (typeof q === 'string') return { text: q as string, order: i + 1 };
        return { text: q.text || '', order: q.order || i + 1 };
      });
      questions.sort((a, b) => a.order - b.order);
      return {
        id: uid('card'),
        questions: questions.map((q) => ({ id: uid('q'), text: q.text, order: q.order })),
        answer: card.answer,
        hint: card.hints?.[0] || '',
        doNotAccept: card.doNotAccept || '',
        image: card.image || '',
        roundId: card.roundId ?? '',
      };
    });
  }

  function toggleRounds() {
    if (!roundsEnabled) {
      const assigned = cards.some((c) => c.roundId);
      if (assigned) {
        ui.showToast('Cannot disable rounds. Remove round assignments from all cards first.', 'warning');
        roundsEnabled = true;
      }
    }
  }

  function addRound() {
    const existingNums = rounds.map((r) => r.number);
    let suggested = 1;
    while (existingNums.includes(suggested)) suggested++;
    const input = prompt('Enter round number:', String(suggested));
    if (input === null) return;
    const num = parseInt(input, 10);
    if (Number.isNaN(num) || num < 1) {
      ui.showToast('Please enter a valid positive number', 'warning');
      return;
    }
    if (existingNums.includes(num)) {
      ui.showToast(`Round ${num} already exists.`, 'warning');
      return;
    }
    rounds = [...rounds, { id: uid('round'), number: num }].sort((a, b) => a.number - b.number);
  }

  function editRound(round: FlashCardRound) {
    const others = rounds.filter((r) => r.id !== round.id).map((r) => r.number);
    const input = prompt(`Enter new number for Round ${round.number}:`, String(round.number));
    if (input === null) return;
    const num = parseInt(input, 10);
    if (Number.isNaN(num) || num < 1) {
      ui.showToast('Please enter a valid positive number', 'warning');
      return;
    }
    if (others.includes(num)) {
      ui.showToast(`Round ${num} already exists.`, 'warning');
      return;
    }
    rounds = rounds.map((r) => (r.id === round.id ? { ...r, number: num } : r)).sort((a, b) => a.number - b.number);
  }

  function removeRound(id: string) {
    if (rounds.length <= 1) {
      ui.showToast('You must have at least one round', 'warning');
      return;
    }
    rounds = rounds.filter((r) => r.id !== id);
    cards = cards.map((c) => (c.roundId === id ? { ...c, roundId: '' } : c));
  }

  function addQuestion(card: EditorCard) {
    const next = card.questions.length + 1;
    card.questions = [...card.questions, { id: uid('q'), text: '', order: next }];
    cards = cards;
  }

  function removeQuestion(card: EditorCard, qid: string) {
    if (card.questions.length <= 1) {
      ui.showToast('Each card must have at least one question', 'warning');
      return;
    }
    card.questions = card.questions.filter((q) => q.id !== qid).map((q, i) => ({ ...q, order: i + 1 }));
    cards = cards;
  }

  function onQuestionKey(e: KeyboardEvent, card: EditorCard, qi: number) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (qi < card.questions.length - 1) {
      const next = (e.currentTarget as HTMLTextAreaElement)
        .closest('.questions-list')
        ?.querySelectorAll<HTMLTextAreaElement>('.card-question')[qi + 1];
      next?.focus();
    } else {
      addQuestion(card);
      queueMicrotask(() => {
        const list = (e.target as HTMLElement).closest('.questions-list');
        const tas = list?.querySelectorAll<HTMLTextAreaElement>('.card-question');
        tas?.[tas.length - 1]?.focus();
      });
    }
  }

  function onDragStart(qid: string) {
    draggedId = qid;
  }

  function onDrop(card: EditorCard, targetId: string) {
    if (!draggedId || draggedId === targetId) {
      draggedId = null;
      dragOverId = null;
      return;
    }
    const from = card.questions.findIndex((q) => q.id === draggedId);
    const to = card.questions.findIndex((q) => q.id === targetId);
    if (from < 0 || to < 0) {
      draggedId = null;
      dragOverId = null;
      return;
    }
    const next = [...card.questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    card.questions = next.map((q, i) => ({ ...q, order: i + 1 }));
    cards = cards;
    draggedId = null;
    dragOverId = null;
  }

  async function onImageFile(card: EditorCard, e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const result = await processImageFile(file);
      card.image = result.dataURI;
      cards = cards;
      if (result.message) ui.showToast(result.message, 'info');
    } catch (err) {
      ui.showToast(err instanceof Error ? err.message : 'Error loading image.', 'error');
    }
    input.value = '';
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      ui.showToast('Please enter a set name', 'warning');
      return;
    }
    const parsedYear = parseYearInput(year);
    if (year.trim() && parsedYear === null) {
      ui.showToast('Please enter a valid year (e.g. 2024) or range (e.g. 2024-2025)', 'warning');
      return;
    }
    const resolvedColor = /^#[0-9A-Fa-f]{6}$/.test(colorText.trim()) ? colorText.trim() : color;

    const savedCards: FlashCard[] = [];
    for (const c of cards) {
      const questions = c.questions
        .map((q) => ({ text: q.text.trim(), order: q.order }))
        .filter((q) => q.text)
        .map((q, i) => ({ ...q, order: i + 1 }));
      const answer = c.answer.trim();
      if (!questions.length || !answer) continue;
      const card: FlashCard = { questions, answer };
      if (c.hint.trim()) card.hints = [c.hint.trim()];
      if (c.doNotAccept.trim()) card.doNotAccept = c.doNotAccept.trim();
      if (c.image.trim()) card.image = c.image.trim();
      if (roundsEnabled && c.roundId) card.roundId = c.roundId;
      savedCards.push(card);
    }

    if (!savedCards.length) {
      ui.showToast('Please add at least one card with a question and answer', 'warning');
      return;
    }

    const setData: FlashCardSet = {
      id: existing?.id ?? uid('set'),
      name: trimmed,
      cards: savedCards,
    };
    if (parsedYear) setData.year = parsedYear;
    if (creator.trim()) setData.creator = creator.trim();
    if (subject.trim()) setData.subject = subject.trim();
    if (resolvedColor && resolvedColor !== '#6b7280') setData.color = resolvedColor;
    if (roundsEnabled && rounds.length) setData.rounds = [...rounds];

    if (existing) {
      if (existing.bundled) {
        ui.showToast('Bundled sets cannot be edited. You can only edit sets you created.', 'warning');
        return;
      }
      setsStore.update(existing.id, setData);
    } else {
      setsStore.add(setData);
    }
    ui.showToast('Set saved', 'success');
    goto('/');
  }

  async function removeSet() {
    if (!existing || existing.bundled) return;
    if (await ui.showConfirm('Are you sure you want to delete this set?')) {
      setsStore.remove(existing.id);
      ui.showToast('Set deleted', 'success');
      goto('/');
    }
  }
</script>

<div class="editor-header">
  <a href="/" id="backToMainBtn" class="btn btn-secondary">← Back</a>
  <h2 id="editorTitle">{existing ? 'Edit Set' : 'Create New Set'}</h2>
  <a href="/create" id="newSetBtn" class="btn btn-secondary btn-small">New set</a>
</div>

<div class="form-group">
  <label for="setName">Set Name</label>
  <input type="text" id="setName" placeholder="Enter set name" maxlength="50" bind:value={name} />
</div>
<div class="form-group">
  <label for="setYear">Year (optional)</label>
  <input type="text" id="setYear" placeholder="e.g. 2024 or 2024-2025" maxlength="20" bind:value={year} />
  <span class="hint">Single year or range like 2025-2026</span>
</div>
<div class="form-group">
  <label for="setCreator">Creator (optional)</label>
  <input type="text" id="setCreator" placeholder="e.g. Your name or organization" maxlength="80" bind:value={creator} />
</div>
<div class="form-group">
  <label for="setSubject">Subject (optional)</label>
  <input type="text" id="setSubject" placeholder="e.g. Science, History" maxlength="50" bind:value={subject} />
</div>
<div class="form-group">
  <label for="setColor">Color (optional)</label>
  <div class="color-input-row">
    <input
      type="color"
      id="setColor"
      title="Set card accent color"
      bind:value={color}
      oninput={() => {
        colorText = color;
      }}
    />
    <input
      type="text"
      id="setColorText"
      placeholder="#6b7280"
      maxlength="9"
      class="color-text-input"
      bind:value={colorText}
      oninput={() => {
        if (/^#[0-9A-Fa-f]{6}$/.test(colorText.trim())) color = colorText.trim();
      }}
    />
  </div>
  <span class="hint">Shown in the top-right corner of the set card on the homepage</span>
</div>
<div class="form-group">
  <label class="checkbox-label">
    <input type="checkbox" id="roundsEnabled" bind:checked={roundsEnabled} onchange={toggleRounds} />
    <span>Enable Rounds (group cards into rounds)</span>
  </label>
</div>

{#if roundsEnabled}
  <div id="roundsSection" class="rounds-section">
    <div class="rounds-header">
      <h3>Rounds</h3>
      <button id="addRoundBtn" class="btn btn-secondary btn-small" type="button" onclick={addRound}>+ Add Round</button>
    </div>
    <div id="roundsList" class="rounds-list">
      {#each rounds as r (r.id)}
        <div class="round-item">
          <span>Round {r.number}</span>
          <button class="btn btn-secondary btn-tiny" type="button" onclick={() => editRound(r)}>Edit</button>
          <button class="btn btn-danger btn-tiny" type="button" onclick={() => removeRound(r.id)}>×</button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<div class="cards-editor">
  <div class="cards-header">
    <h3>Cards</h3>
    <div class="cards-header-actions">
      <button id="addCardBtn" class="btn btn-small" type="button" onclick={() => (cards = [...cards, emptyCard()])}>+ Add Card</button>
    </div>
  </div>
  <div id="cardsList" class="cards-list">
    {#each cards as card, i (card.id)}
      <div class="card-item">
        <div class="card-item-header">
          <span class="card-item-number">Card {i + 1}</span>
          <button class="btn btn-danger btn-small" type="button" onclick={() => (cards = cards.filter((c) => c.id !== card.id))}>Remove</button>
        </div>
        <div class="card-item-inputs">
          {#if roundsEnabled && rounds.length}
            <div class="card-round-select-wrapper">
              <label for="round-{card.id}">Round:</label>
              <select id="round-{card.id}" class="card-round-select" bind:value={card.roundId}>
                <option value="">No Round</option>
                {#each rounds as r}
                  <option value={r.id}>Round {r.number}</option>
                {/each}
              </select>
            </div>
          {/if}
          <div class="questions-section">
            <div class="questions-header">
              <span>Questions (randomly selected during study)</span>
              <button class="btn btn-secondary btn-tiny" type="button" onclick={() => addQuestion(card)}>+ Add Question</button>
            </div>
            <div class="questions-list" role="list">
              {#each card.questions as q, qi (q.id)}
                <div
                  class="question-item"
                  role="listitem"
                  class:dragging={draggedId === q.id}
                  class:question-placeholder={dragOverId === q.id && draggedId !== q.id}
                  ondragover={(e) => {
                    e.preventDefault();
                    dragOverId = q.id;
                  }}
                  ondrop={(e) => {
                    e.preventDefault();
                    onDrop(card, q.id);
                  }}
                >
                  <div
                    class="question-drag-handle"
                    role="button"
                    tabindex="0"
                    aria-label="Drag to reorder"
                    draggable="true"
                    ondragstart={() => onDragStart(q.id)}
                    ondragend={() => {
                      draggedId = null;
                      dragOverId = null;
                    }}
                  >
                    ⋮⋮
                  </div>
                  <div class="question-input-wrapper">
                    <textarea
                      placeholder="Question {qi + 1}"
                      class="card-question"
                      bind:value={q.text}
                      onkeydown={(e) => onQuestionKey(e, card, qi)}
                    ></textarea>
                  </div>
                  {#if qi > 0}
                    <button class="btn btn-danger btn-tiny" type="button" onclick={() => removeQuestion(card, q.id)}>×</button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
          <textarea placeholder="Answer" class="card-answer" bind:value={card.answer}></textarea>
          <div class="answer-syntax-hint">
            <small>Tip: Use (option1/option2) for interchangeable words, [optional] for optional prefixes or suffixes</small>
            <small>Examples: Conservation of (mass/matter), [Law of] Conservation of (mass/matter)</small>
          </div>
          <div class="hints-section">
            <label for="hint-{card.id}">Hint (optional, always visible)</label>
            <input id="hint-{card.id}" type="text" placeholder="Hint (e.g., multi-word answer)" class="card-hint" maxlength="100" bind:value={card.hint} />
          </div>
          <div class="hints-section">
            <label for="dna-{card.id}">DO NOT ACCEPT (optional, always visible)</label>
            <input id="dna-{card.id}" type="text" placeholder="DO NOT ACCEPT (e.g., incorrect answer variation)" class="card-do-not-accept" maxlength="100" bind:value={card.doNotAccept} />
          </div>
          <div class="hints-section">
            <label for="img-{card.id}">Image (optional – SVG, JPG, PNG, or WebP)</label>
            <div class="image-input-wrapper">
              <textarea id="img-{card.id}" placeholder="Paste SVG code or base64 data URI here, or use file upload below" class="card-image-svg" rows="4" bind:value={card.image}></textarea>
              <input type="file" accept=".svg,.jpg,.jpeg,.png,.webp,image/svg+xml,image/jpeg,image/png,image/webp" class="card-image-file" onchange={(e) => onImageFile(card, e)} />
              <button type="button" class="btn btn-secondary btn-tiny card-image-clear" onclick={() => (card.image = '')}>Clear Image</button>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<div class="editor-actions">
  <button id="saveSetBtn" class="btn btn-primary" type="button" onclick={save}>Save Set</button>
  {#if existing && !existing.bundled}
    <button id="deleteSetBtn" class="btn btn-danger" type="button" onclick={removeSet}>Delete Set</button>
  {/if}
</div>
