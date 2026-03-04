import { sets, setSets } from './state';
import { saveSets } from './storage';
import { renderSets } from './render';
import { showToast } from './toast';
import type { FlashCardSet, FlashCard, FlashCardRound } from './types';

type ValidationResult =
  | { valid: true; data: FlashCardSet }
  | { valid: false; error: string };

export function validateImportedSet(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid JSON structure' };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    return { valid: false, error: 'Missing or empty set name' };
  }

  if (!Array.isArray(obj.cards) || obj.cards.length === 0) {
    return { valid: false, error: 'Missing or empty cards array' };
  }

  const cards: FlashCard[] = [];
  for (let i = 0; i < obj.cards.length; i++) {
    const card = obj.cards[i];
    if (!card || typeof card !== 'object') {
      return { valid: false, error: `Card ${i + 1}: invalid structure` };
    }
    const c = card as Record<string, unknown>;

    if (typeof c.answer !== 'string' || !c.answer.trim()) {
      return { valid: false, error: `Card ${i + 1}: missing or empty answer` };
    }

    const questions = Array.isArray(c.questions)
      ? c.questions.map((q: unknown, qi: number) => {
          if (typeof q === 'string') return { text: q, order: qi + 1 };
          if (q && typeof q === 'object' && typeof (q as Record<string, unknown>).text === 'string') {
            return { text: (q as Record<string, unknown>).text as string, order: Number((q as Record<string, unknown>).order) || qi + 1 };
          }
          return { text: '', order: qi + 1 };
        }).filter((q: { text: string }) => q.text.trim())
      : [];

    if (questions.length === 0) {
      return { valid: false, error: `Card ${i + 1}: no valid questions found` };
    }

    const parsed: FlashCard = { questions, answer: c.answer };
    if (Array.isArray(c.hints) && c.hints.length > 0) {
      parsed.hints = c.hints.filter((h: unknown) => typeof h === 'string') as string[];
    }
    if (typeof c.doNotAccept === 'string' && c.doNotAccept.trim()) {
      parsed.doNotAccept = c.doNotAccept;
    }
    if (typeof c.image === 'string' && c.image.trim()) {
      parsed.image = c.image;
    }
    if (typeof c.roundId === 'string' && c.roundId.trim()) {
      parsed.roundId = c.roundId;
    }
    cards.push(parsed);
  }

  const setData: FlashCardSet = { name: obj.name.trim(), cards };

  if (obj.year != null && obj.year !== '') {
    if (typeof obj.year === 'number' || typeof obj.year === 'string') {
      setData.year = obj.year;
    }
  }
  if (typeof obj.creator === 'string' && obj.creator.trim()) {
    setData.creator = obj.creator.trim();
  }
  if (typeof obj.subject === 'string' && obj.subject.trim()) {
    setData.subject = obj.subject.trim();
  }
  if (typeof obj.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(obj.color)) {
    setData.color = obj.color;
  }
  if (Array.isArray(obj.rounds) && obj.rounds.length > 0) {
    const rounds: FlashCardRound[] = [];
    for (const r of obj.rounds) {
      if (r && typeof r === 'object' && typeof (r as Record<string, unknown>).id === 'string' && typeof (r as Record<string, unknown>).number === 'number') {
        rounds.push({ id: (r as Record<string, unknown>).id as string, number: (r as Record<string, unknown>).number as number });
      }
    }
    if (rounds.length > 0) setData.rounds = rounds;
  }

  return { valid: true, data: setData };
}

export function exportSet(index: number): void {
  const set = sets[index];
  const data: Record<string, unknown> = {
    name: set.name,
    cards: set.cards,
    exportedAt: new Date().toISOString(),
  };
  if (set.year != null && set.year !== '') data.year = set.year;
  if (set.creator) data.creator = set.creator;
  if (set.subject) data.subject = set.subject;
  if (set.color) data.color = set.color;
  if (set.rounds?.length) data.rounds = set.rounds;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.name.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function handleImport(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target!.result as string);
      const result = validateImportedSet(raw);
      if (!result.valid) {
        showToast(result.error, 'error');
        return;
      }

      setSets([...sets, result.data]);
      saveSets();
      renderSets();
      showToast('Set imported successfully!', 'success');
    } catch (e) {
      console.warn('Import failed:', e);
      showToast('Error importing file. Please ensure it is a valid JSON file.', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
}
